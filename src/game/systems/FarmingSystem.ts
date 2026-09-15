import type { DomainEventBus } from '../events';
import type { GameStatePort } from '../store-ports';
import type { CropState } from '../types';
import type { EntityId } from '../entity';
import { WorldRuntime } from '../world/runtime';

interface CropComponent extends CropState { key: string; }
const isCropComponent = (value: Record<string, unknown>): value is CropComponent => typeof value.key === 'string' && typeof value.stage === 'number' && Number.isFinite(value.stage) && typeof value.watered === 'boolean' && typeof value.tilled === 'boolean';
const cropEntityId = (key: string): EntityId => `crop-${encodeURIComponent(key)}` as EntityId;
const positionFromKey = (key: string): { x: number; y: number } | undefined => {
  const match = /^(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$/.exec(key);
  if (!match) return undefined;
  const x = Number(match[1]); const y = Number(match[2]);
  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : undefined;
};

/** Crop simulation is ECS-authoritative; world.crops remains a compatibility mirror. */
export class FarmingSystem {
  constructor(private readonly store: GameStatePort, private readonly events: DomainEventBus, private readonly runtime?: WorldRuntime) {}

  till(key: string): boolean {
    this.syncFromState(); if (this.getComponent(key)) return false;
    this.setCrop(key, { stage: 0, watered: false, tilled: true }); this.syncToState(); return true;
  }

  plant(key: string): boolean {
    this.syncFromState(); const current = this.getComponent(key);
    if (!current || !current.tilled || current.stage > 0) return false;
    if (this.store.select((state) => state.inventory.seeds) < 1) return false;
    this.store.update((state) => { state.inventory.seeds -= 1; });
    this.setCrop(key, { stage: 1, watered: false, tilled: true }); this.syncToState(); return true;
  }

  water(key: string): boolean {
    this.syncFromState(); const current = this.getComponent(key);
    if (!current || !current.tilled || current.stage < 1 || current.stage >= 3 || current.watered) return false;
    this.setCrop(key, { stage: current.stage, watered: true, tilled: current.tilled }); this.syncToState(); return true;
  }

  grow(): void {
    this.syncFromState();
    for (const entity of this.runtime?.query.with('crop') ?? []) {
      const crop = this.runtime?.components.get<CropComponent>('crop', entity.id);
      if (!crop || !crop.watered || crop.stage <= 0 || crop.stage >= 3) continue;
      this.runtime?.setComponent(entity.id, 'crop', { ...crop, stage: crop.stage + 1, watered: false });
    }
    this.syncToState();
  }

  harvest(key: string): boolean {
    this.syncFromState(); const crop = this.getComponent(key);
    if (!crop || crop.stage < 3) return false;
    if (this.runtime) this.runtime.removeEntity(cropEntityId(key));
    this.store.update((state) => { state.inventory.parsnip += 1; state.economy.totalHarvests += 1; });
    this.syncToState(); this.events.publish({ type: 'CROP_HARVESTED', key }); return true;
  }

  getCrop(key: string): CropState | undefined {
    this.syncFromState(); const crop = this.getComponent(key);
    return crop ? { stage: crop.stage, watered: crop.watered, tilled: crop.tilled } : undefined;
  }

  refresh(): void { this.syncFromState(); }

  private getComponent(key: string): CropComponent | undefined {
    if (!this.runtime) {
      const crop = this.store.select((state) => state.world.crops[key]);
      return crop ? { key, ...crop } : undefined;
    }
    const value = this.runtime.components.get<CropComponent>('crop', cropEntityId(key));
    return value && isCropComponent(value) ? value : undefined;
  }

  private setCrop(key: string, crop: CropState): void {
    if (!this.runtime) { this.store.update((state) => { state.world.crops[key] = { ...crop }; }); return; }
    const id = cropEntityId(key);
    if (!this.runtime.entities.has(id)) this.runtime.entities.add({ id, kind: 'crop' });
    this.runtime.setComponent(id, 'crop', { key, ...crop });
    const position = positionFromKey(key); if (position) this.runtime.setComponent(id, 'position', position);
  }

  private syncFromState(): void {
    if (!this.runtime) return;
    const crops = this.store.select((state) => state.world.crops); const stateKeys = new Set(Object.keys(crops));
    for (const entity of this.runtime.query.with('crop')) {
      const component = this.runtime.components.get<CropComponent>('crop', entity.id);
      if (!component || !stateKeys.has(component.key)) this.runtime.removeEntity(entity.id);
    }
    for (const [key, crop] of Object.entries(crops)) {
      const id = cropEntityId(key); const current = this.runtime.components.get<CropComponent>('crop', id); const next = { key, ...crop };
      if (!current || JSON.stringify(current) !== JSON.stringify(next)) this.setCrop(key, crop);
    }
  }

  private syncToState(): void {
    if (!this.runtime) return;
    const crops: Record<string, CropState> = {}; const cropIds = new Set<EntityId>();
    const cropEntities = this.runtime.query.with('crop');
    for (const entity of cropEntities) {
      const crop = this.runtime.components.get<CropComponent>('crop', entity.id);
      if (!crop || !isCropComponent(crop)) continue;
      cropIds.add(entity.id); crops[crop.key] = { stage: crop.stage, watered: crop.watered, tilled: crop.tilled };
    }
    this.store.update((state) => {
      state.world.crops = crops;
      const entities = state.world.entities.entities;
      for (const id of cropIds) { const entity = this.runtime!.entities.get(id); if (entity) entities[id] = { ...entity }; }
      for (const id of Object.keys(entities) as EntityId[]) if (id.startsWith('crop-') && !cropIds.has(id)) delete entities[id];
      const components = state.world.entities.components ??= {};
      for (const id of Object.keys(components) as EntityId[]) if (id.startsWith('crop-')) delete components[id];
      for (const entity of cropEntities) {
        const crop = this.runtime!.components.get<CropComponent>('crop', entity.id);
        if (!crop || !isCropComponent(crop)) continue;
        const entityComponents: Record<string, Record<string, unknown>> = { crop: { ...crop } };
        const position = this.runtime!.components.get('position', entity.id);
        if (position) entityComponents.position = { ...position };
        components[entity.id] = entityComponents;
      }
    });
  }
}
