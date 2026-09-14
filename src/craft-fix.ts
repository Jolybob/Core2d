// Core2D v0.3.16: robust UI-to-game crafting bridge.
// The UI is created synchronously by ui.ts, so this module can safely attach
// a capture listener before Phaser starts listening for craft events.
const craftPanel = document.querySelector<HTMLElement>('#ui-crafting');
const craftGrid = document.querySelector<HTMLElement>('#craft-grid');

craftGrid?.addEventListener('click', (event) => {
  const target = event.target as HTMLElement;
  const button = target.closest<HTMLButtonElement>('[data-recipe]');
  if (!button || button.disabled) return;
  event.preventDefault();
  event.stopPropagation();
  window.dispatchEvent(new CustomEvent('core2d:craft', {
    detail: { id: button.dataset.recipe },
  }));
}, true);

window.addEventListener('core2d:toggle-crafting', () => {
  craftPanel?.classList.toggle('open');
});
