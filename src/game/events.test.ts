import { describe, expect, it } from 'vitest';
import { DomainEventBus } from './events';

describe('DomainEventBus', () => {
  it('publishes events to subscribers and supports unsubscribe', () => {
    const bus = new DomainEventBus();
    const received: string[] = [];
    const unsubscribe = bus.subscribe((event) => received.push(event.type));

    bus.publish({ type: 'FISH_CAUGHT' });
    unsubscribe();
    bus.publish({ type: 'ORE_MINED', key: 'rock:1,2' });

    expect(received).toEqual(['FISH_CAUGHT']);
  });

  it('isolates listener iteration when a listener unsubscribes itself', () => {
    const bus = new DomainEventBus();
    const received: string[] = [];
    let unsubscribe = (): void => undefined;

    unsubscribe = bus.subscribe(() => {
      received.push('first');
      unsubscribe();
    });
    bus.subscribe(() => received.push('second'));

    bus.publish({ type: 'CROP_HARVESTED', key: '2,3' });
    bus.publish({ type: 'CROP_HARVESTED', key: '4,5' });

    expect(received).toEqual(['first', 'second', 'second']);
  });
});
