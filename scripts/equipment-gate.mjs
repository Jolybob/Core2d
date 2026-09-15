import { readFileSync, writeFileSync } from 'node:fs';

const path='src/cozy-farm.ts';
let source=readFileSync(path,'utf8');

if(!source.includes('equippedTools:Record<Tool,boolean>')){
  source=source.replace("private day=1;private clock=0;private stamina=100;private hunger=100;private health=100;private money=120;private pickaxeLevel=1;private tool:Tool='hoe';", "private day=1;private clock=0;private stamina=100;private hunger=100;private health=100;private money=120;private pickaxeLevel=1;private tool:Tool='hoe';private equippedTools:Record<Tool,boolean>={hoe:true,seeds:true,water:true,axe:true,pick:true,sword:true,rod:false};");
  source=source.replace("window.addEventListener('core2d:select',this.onSelect as EventListener);", "window.addEventListener('core2d:select',this.onSelect as EventListener);window.addEventListener('core2d:equip-tool',this.onEquipTool as EventListener);");
  source=source.replace("private setTool(t:Tool){this.tool=t;this.say(`${t.toUpperCase()} equipped • click nearby to use`)}", "private onEquipTool=(e:Event)=>{const d=(e as CustomEvent<{tool?:Tool,equipped?:boolean}>).detail;if(!d?.tool)return;this.equippedTools[d.tool]=!!d.equipped;if(!this.equippedTools[this.tool]){const next=(Object.keys(this.equippedTools) as Tool[]).find(t=>this.equippedTools[t]);if(next)this.tool=next;}this.say(`${d.tool.toUpperCase()} ${d.equipped?'equipped':'unequipped'}`);this.updateHud()};private setTool(t:Tool){if(!this.equippedTools[t])return this.say(`${t.toUpperCase()} is unequipped. Open inventory to equip it.`);this.tool=t;this.say(`${t.toUpperCase()} equipped • click nearby to use`)}");
  source=source.replace("private actionAt(wx:number,wy:number){if(this.time.now-this.lastAction<180)return;", "private actionAt(wx:number,wy:number){if(!this.equippedTools[this.tool])return this.say(`${this.tool.toUpperCase()} is unequipped. Equip it in the inventory.`);if(this.time.now-this.lastAction<180)return;");
  writeFileSync(path,source);
  console.log('Applied equipped-tool action gate.');
}else console.log('Equipped-tool action gate already present.');
