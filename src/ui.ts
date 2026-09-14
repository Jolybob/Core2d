import './ui.css';

const root = document.createElement('div');
root.id = 'core-ui';
root.innerHTML = `
  <div class="ui-top">
    <div class="ui-brand"><span class="core-dot"></span><span class="brand-title">CORE2D</span><span class="brand-version">v0.2.0</span></div>
    <div class="ui-stats">
      <div class="stat health"><div class="stat-label">Health</div><div class="stat-value" data-value="health">100 / 100</div><div class="bar"><div class="fill" data-fill="health"></div></div></div>
      <div class="stat hunger"><div class="stat-label">Hunger</div><div class="stat-value" data-value="hunger">100 / 100</div><div class="bar"><div class="fill" data-fill="hunger"></div></div></div>
      <div class="stat stamina"><div class="stat-label">Stamina</div><div class="stat-value" data-value="stamina">100 / 100</div><div class="bar"><div class="fill" data-fill="stamina"></div></div></div>
    </div>
  </div>
  <div class="ui-message" id="ui-message">Find resources and protect the Core</div>
  <aside class="ui-right">
    <div class="panel-title">Mission</div>
    <div class="objective"><strong>Protect the Core</strong>Mine deeper, gather materials, craft upgrades and survive the creatures that emerge from the dark.</div>
    <div class="panel-title" style="margin-top:14px">Status</div>
    <div class="objective">Pickaxe <strong style="display:inline;color:#eef5ed">Lv.1</strong><br>Survival <strong style="display:inline;color:#eef5ed" id="ui-time">00:00</strong><br>Threats <strong style="display:inline;color:#d86b6b" id="ui-threats">1</strong></div>
  </aside>
  <div class="ui-minimap"><div class="map"><span class="map-label">Local map</span><span class="map-core"></span><span class="map-player"></span></div></div>
  <div class="ui-bottom">
    <div class="hotbar">
      <div class="slot selected"><span class="slot-key">1</span><span class="slot-icon">🪵</span><span class="slot-name">WOOD</span><span class="slot-count">6</span></div>
      <div class="slot"><span class="slot-key">2</span><span class="slot-icon">🪨</span><span class="slot-name">STONE</span><span class="slot-count">0</span></div>
      <div class="slot"><span class="slot-key">3</span><span class="slot-icon">◆</span><span class="slot-name">COPPER</span><span class="slot-count">0</span></div>
      <div class="slot"><span class="slot-key">4</span><span class="slot-icon">✦</span><span class="slot-name">CRYSTAL</span><span class="slot-count">0</span></div>
      <div class="slot"><span class="slot-key">5</span><span class="slot-icon">🍓</span><span class="slot-name">BERRY</span><span class="slot-count">2</span></div>
    </div>
    <div class="controls"><b>WASD</b> move &nbsp; <b>SHIFT</b> sprint<br><b>LMB</b> mine/attack &nbsp; <b>RMB</b> place</div>
  </div>
  <button class="ui-button" id="ui-help-button">?</button>
  <div class="ui-help" id="ui-help">
    <div class="help-card"><h2>Core2D Controls</h2><p>Everything you need to survive underground.</p>
      <div class="help-grid">
        <div class="help-row"><span>Move</span><span class="keycap">W A S D / Arrows</span></div>
        <div class="help-row"><span>Sprint</span><span class="keycap">SHIFT</span></div>
        <div class="help-row"><span>Mine / Attack</span><span class="keycap">Left Click</span></div>
        <div class="help-row"><span>Place Block</span><span class="keycap">Right Click</span></div>
        <div class="help-row"><span>Select Hotbar</span><span class="keycap">1 — 5</span></div>
        <div class="help-row"><span>Craft Pickaxe</span><span class="keycap">E</span></div>
        <div class="help-row"><span>Eat Berry</span><span class="keycap">SPACE</span></div>
        <div class="help-row"><span>Help</span><span class="keycap">?</span></div>
      </div>
      <button class="help-close" id="ui-help-close">Close</button>
    </div>
  </div>
`;
document.body.appendChild(root);

const help = document.querySelector<HTMLDivElement>('#ui-help')!;
const openHelp = () => help.classList.add('open');
const closeHelp = () => help.classList.remove('open');
document.querySelector('#ui-help-button')?.addEventListener('click', openHelp);
document.querySelector('#ui-help-close')?.addEventListener('click', closeHelp);
help.addEventListener('click', (event) => { if (event.target === help) closeHelp(); });

const slots = [...document.querySelectorAll<HTMLElement>('.slot')];
const selectSlot = (index: number) => slots.forEach((slot, i) => slot.classList.toggle('selected', i === index));
window.addEventListener('keydown', (event) => {
  if (event.key >= '1' && event.key <= '5') selectSlot(Number(event.key) - 1);
  if (event.key === '?' || (event.shiftKey && event.key === '/')) openHelp();
  if (event.key === 'Escape') closeHelp();
});

let seconds = 0;
window.setInterval(() => {
  seconds += 1;
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  const timer = document.querySelector('#ui-time');
  if (timer) timer.textContent = `${m}:${s}`;
}, 1000);

console.info('[Core2D UI] Complete HUD loaded');
