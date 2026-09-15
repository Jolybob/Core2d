import type { DomainEventBus } from '../events';
import type { GameStatePort } from '../store-ports';
import type { CropState } from '../types';
import type { EntityId, PersistedComponent } from '../entity';
import { WorldRuntime } from '../world/runtime';

type CropComponent = PersistedComponent & CropState & { key: string };
const isCropComponent = (value: PersistedComponent | undefined): value is CropComponent => typeof value === 'object' && value !== null && typeof value.key === 'string' && typeof value.stage === 'number' && Number.isFinite(value.stage) && typeof value.watered === 'boolean' && typeof value.tilled === 'boolean';
const cropEntityId = (key: string): EntityId => `crop-${encodeURIComponent(key)}` as EntityId;
const positionFromKey = (key: string): { x: number; y: number } | undefined => { const match = /^(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$/.exec(key); if (!match) return undefined; const x = Number(match[1]); const y = Number(match[2]); return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : undefined; };

/** Crop simulation is runtime-authoritative; persistence is handled at the runtime boundary. */
export class FarmingSystem {
  constructor(private readonly store: GameStatePort, private readonly events: DomainEventBus, private readonly runtime: WorldRuntime) {}

  hydrateFromPersistence(): void { /* WorldRuntime hydrates persisted crop entities when it is constructed/rehydrated. */ }

  till(key: string): boolean { const current = this.getComponent(key); if (current) return false; this.setCrop(key, { stage: 0, watered: false, tilled: true }); this.commitCrop(key); return true; }
  plant(key: string): boolean { const current = this.getComponent(key); if (!current || !current.tilled || current.stage > 0) return false; if (this.store.select((state) => state.inventory.seeds) < 1) return false; this.store.update((state) => { state.inventory.seeds -= 1; }); this.setCrop(key, { stage: 1, watered: false, tilled: true }); this.commitCrop(key); return true; }
  water(key: string): boolean { const current = this.getComponent(key); if (!current || !current.tilled || current.stage < 1 || current.stage >= 3 || current.watered) return false; this.setCrop(key, { stage: current.stage, watered: true, tilled: current.tilled }); this.commitCrop(key); return true; }
  grow(): void { for (const entity of this.runtime.query.with('crop')) { const crop = this.getRuntimeCrop(entity.id); if (!crop || !crop.watered || crop.stage <= 0 || crop.stage >= 3) continue; this.runtime.setComponent(entity.id, 'crop', { ...crop, stage: crop.stage + 1, watered: false }); } this.commitAllCrops(); }
  harvest(key: string): boolean {
    const crop = this.getComponent(key);
    if (!crop || crop.stage < 3) return false;
    this.runtime.removeEntity(cropEntityId(key));
    this.runtime.removeCropPersistence(key);
    this.store.update((state) => {
      state.inventory.parsnip += 1;
      state.economy.totalHarvests += 1;
      state.world = this.runtime.exportWorld();
    });
    this.events.publish({ type: 'CROP_HARVESTED', key });
    return true;
  }
  getCrop(key: string): CropState | undefined { const crop = this.getComponent(key); return crop ? { stage: crop.stage, watered: crop.watered, tilled: crop.tilled } : undefined; }
  refresh(): void { /* Runtime is authoritative; persistence hydration is explicit. */ }

  private getRuntimeCrop(id: EntityId): CropComponent | undefined { const value = this.runtime.components.get('crop', id); return isCropComponent(value) ? value : undefined; }
  private getComponent(key: string): CropComponent | undefined { return this.getRuntimeCrop(cropEntityId(key)); }
  private setCrop(key: string, crop: CropState): void { const id = cropEntityId(key); const components: Record<string, PersistedComponent> = { crop: { key, ...crop } }; const position = positionFromKey(key); if (position) components.position = position; this.runtime.ensureEntity(id, 'crop', components); }
  private commitCrop(key: string): void { const crop = this.getRuntimeCrop(cropEntityId(key)); if (!crop) return; this.runtime.setCropPersistence(key, { stage: crop.stage, watered: crop.watered, tilled: crop.tilled }); this.store.update((state) => { state.world = this.runtime.exportWorld(); }); }
  private commitAllCrops(): void { const crops: Record<string, CropState> = {}; for (const entity of this.runtime.query.with('crop')) { const crop = this.getRuntimeCrop(entity.id); if (crop) crops[crop.key] = { stage: crop.stage, watered: crop.watered, tilled: crop.tilled }; } this.runtime.replaceCropPersistence(crops); this.store.update((state) => { state.world = this.runtime.exportWorld(); }); }
}
