export type DomainEvent =
  | { type: 'CROP_HARVESTED'; key: string }
  | { type: 'ORE_MINED'; key: string }
  | { type: 'FISH_CAUGHT' }
  | { type: 'SLIME_DEFEATED'; key: string };

export type DomainEventListener = (event: DomainEvent) => void;

export class DomainEventBus {
  private readonly listeners = new Set<DomainEventListener>();

  subscribe(listener: DomainEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  publish(event: DomainEvent): void {
    for (const listener of [...this.listeners]) listener(event);
  }
}
