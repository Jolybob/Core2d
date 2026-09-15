import Phaser from 'phaser';

const TILE=24;
const W=70;
const H=52;
const DAY_SECONDS=150;
type Tool='hoe'|'seeds'|'water'|'axe'|'pick'|'sword'|'rod';
type Item='wood'|'stone'|'ore'|'crystal'|'berry'|'parsnip'|'seeds'|'torch'|'sword'|'fish'|'coal'|'rod';
type Crop={stage:number;watered:boolean;g:Phaser.GameObjects.Graphics};
type KeyMap=Record<'W'|'A'|'S'|'D'|'SHIFT'|'ONE'|'TWO'|'THREE'|'FOUR'|'FIVE'|'SIX'|'SEVEN'|'E'|'SPACE'|'F'|'B'|'L'|'Q'|'K'|'P',Phaser.Input.Keyboard.Key>;

class CozyFarm extends Phaser.Scene{
 private player!:Phaser.GameObjects.Rectangle;
 private cursors!:Phaser.Types.Input.Keyboard.CursorKeys;
 private keys!:KeyMap;
 private crops=new Map<string,Crop>();
 private trees:Phaser.GameObjects.Container[]=[];
 private rocks:Phaser.GameObjects.Rectangle[]=[];
 private enemies:Phaser.GameObjects.Ellipse[]=[];
 private day=1; private clock=0; private stamina=100; private hunger=100; private health=100; private money=120; private pickaxeLevel=1; private tool:Tool='hoe'; private lastAction=0; private fishCooldown=0; private threats=0;
 private inventory:Record<Item,number>={wood:12,ore:8,stone:10,berry:4,crystal:2,seeds:6,parsnip:0,torch:6,sword:1,fish:0,coal:3,rod:0};
 private hud!:Phaser.GameObjects.Text; private message!:Phaser.GameObjects.Text; private target!:Phaser.GameObjects.Rectangle; private night!:Phaser.GameObjects.Rectangle;
 constructor(){super('farm')}
 create(){
  const k=this.input.keyboard!;
  this.cursors=k.createCursorKeys();
  this.keys={W:k.addKey('W'),A:k.addKey('A'),S:k.addKey('S'),D:k.addKey('D'),SHIFT:k.addKey('SHIFT'),ONE:k.addKey('ONE'),TWO:k.addKey('TWO'),THREE:k.addKey('THREE'),FOUR:k.addKey('FOUR'),FIVE:k.addKey('FIVE'),SIX:k.addKey('SIX'),SEVEN:k.addKey('SEVEN'),E:k.addKey('E'),SPACE:k.addKey('SPACE'),F:k.addKey('F'),B:k.addKey('B'),L:k.addKey('L'),Q:k.addKey('Q'),K:k.addKey('K'),P:k.addKey('P')};
  this.buildWorld();
  this.player=this.add.rectangle(35*TILE+12,27*TILE+12,14,19,0xf1cf91).setDepth(30);
  this.target=this.add.rectangle(0,0,TILE-2,TILE-2,0xffdf72,.18).setStrokeStyle(2,0xffdf72).setDepth(20);
  this.cameras.main.setBounds(0,0,W*TILE,H*TILE).startFollow(this.player,true,.12,.12).setZoom(1.3);
  this.night=this.add.rectangle(480,320,960,640,0x17243b,0).setScrollFactor(0).setDepth(90);
  this.hud=this.add.text(14,12,'',{fontFamily:'monospace',fontSize:'14px',color:'#fff',backgroundColor:'#26351ddd',padding:{x:10,y:8}}).setScrollFactor(0).setDepth(100);
  this.message=this.add.text(480,14,'',{fontFamily:'monospace',fontSize:'14px',color:'#ffe9ad',backgroundColor:'#26351ddd',padding:{x:10,y:7}}).setOrigin(.5,0).setScrollFactor(0).setDepth(100);
  this.input.on('pointerdown',(p:Phaser.Input.Pointer)=>{if(p.leftButtonDown())this.actionAt(p.worldX,p.worldY)});
  window.addEventListener('core2d:craft',this.onCraft as EventListener); window.addEventListener('core2d:mine',this.onMine as EventListener); window.addEventListener('core2d:attack',this.onAttack as EventListener); window.addEventListener('core2d:place',this.onPlace as EventListener); window.addEventListener('core2d:select',this.onSelect as EventListener); window.addEventListener('core2d:eat',this.eat as EventListener); window.addEventListener('core2d:salve',this.salve as EventListener); window.addEventListener('core2d:sprint',this.sprint as EventListener); window.addEventListener('core2d:save',this.saveGame as EventListener);
  this.say('Spring • Day 1 • Welcome home. Explore, farm and gather.'); this.updateHud();
 }
 private buildWorld(){
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){let c=(x+y)%2?0x6f9b4f:0x739f52;if(x>=27&&x<=43&&y>=19&&y<=35)c=(x+y)%2?0x9a6845:0xa06e4a;if(x>=53&&x<=64&&y>=19&&y<=35)c=(x+y)%3?0x77736c:0x88847b;this.add.rectangle(x*TILE+12,y*TILE+12,23,23,c)}
  this.add.ellipse(13*TILE,11*TILE,230,150,0x4f8fa3).setDepth(2).setStrokeStyle(4,0x315f70); this.add.text(10*TILE,8*TILE,'FISHING POND',{fontFamily:'monospace',fontSize:'12px',color:'#fff0c2'}).setDepth(8);
  this.add.rectangle(35*TILE+12,17*TILE+12,12*TILE,6*TILE,0xc18a55).setDepth(5).setStrokeStyle(3,0x7b5537); this.add.polygon(35*TILE-133,17*TILE-43,[0,55,145,0,290,55],0x9a4e43).setDepth(6); this.add.text(35*TILE+12,17*TILE+5,'HOME',{fontFamily:'monospace',fontSize:'13px',color:'#ffe6ad'}).setOrigin(.5).setDepth(7);
  this.add.text(58*TILE,18*TILE,'QUARRY',{fontFamily:'monospace',fontSize:'13px',color:'#fff0c2'}).setDepth(8); this.add.text(7*TILE,36*TILE,'FOREST',{fontFamily:'monospace',fontSize:'13px',color:'#fff0c2'}).setDepth(8);
  for(let i=0;i<30;i++){const x=3+Math.floor(Math.random()*63),y=3+Math.floor(Math.random()*44);if(x>25&&x<46&&y>15&&y<37)continue;const c=this.add.container(x*TILE+12,y*TILE+12).setDepth(5);c.add(this.add.rectangle(0,10,11,22,0x60452e));c.add(this.add.circle(0,-5,17,0x355d3b));c.setData('x',x);c.setData('y',y);this.trees.push(c)}
  for(let i=0;i<20;i++){const x=54+Math.floor(Math.random()*10),y=20+Math.floor(Math.random()*15),r=this.add.rectangle(x*TILE+12,y*TILE+12,17,17,i%3===0?0xb7864f:0x77736c).setDepth(3);r.setData('x',x);r.setData('y',y);r.setData('ore',i%3===0);this.rocks.push(r)}
  for(let i=0;i<5;i++){const a=this.add.ellipse((22+i*2)*TILE+12,34*TILE+12,19,14,0xf1dfbd).setDepth(12);this.tweens.add({targets:a,y:a.y+3,duration:700+i*80,yoyo:true,repeat:-1})}
 }
 update(_time:number,delta:number){
  const dt=Math.min(delta,50)/1000; this.clock+=dt; this.fishCooldown=Math.max(0,this.fishCooldown-dt); this.hunger=Math.max(0,this.hunger-dt*.1); this.stamina=Math.min(100,this.stamina+dt*10);
  let dx=0,dy=0;if(this.cursors.left.isDown||this.keys.A.isDown)dx--;if(this.cursors.right.isDown||this.keys.D.isDown)dx++;if(this.cursors.up.isDown||this.keys.W.isDown)dy--;if(this.cursors.down.isDown||this.keys.S.isDown)dy++;
  const sprint=this.keys.SHIFT.isDown&&this.stamina>2;if(dx||dy){const len=Math.hypot(dx,dy),speed=sprint?230:145;const nx=Phaser.Math.Clamp(this.player.x+dx/len*speed*dt,10,W*TILE-10),ny=Phaser.Math.Clamp(this.player.y+dy/len*speed*dt,10,H*TILE-10);if(!this.blocked(nx,ny)){this.player.x=nx;this.player.y=ny}this.stamina=Math.max(0,this.stamina-dt*(sprint?12:3))}
  const map:[keyof KeyMap,Tool][]=[['ONE','hoe'],['TWO','seeds'],['THREE','water'],['FOUR','axe'],['FIVE','pick'],['SIX','sword'],['SEVEN','rod']]; for(const [key,tool] of map)if(Phaser.Input.Keyboard.JustDown(this.keys[key]))this.setTool(tool);
  if(Phaser.Input.Keyboard.JustDown(this.keys.E))this.actionAt(this.player.x,this.player.y);if(Phaser.Input.Keyboard.JustDown(this.keys.SPACE))this.eat();if(Phaser.Input.Keyboard.JustDown(this.keys.F))this.swing();if(Phaser.Input.Keyboard.JustDown(this.keys.B))this.say('Market: seeds cost $20.');if(Phaser.Input.Keyboard.JustDown(this.keys.L))this.ship();if(Phaser.Input.Keyboard.JustDown(this.keys.Q))this.say('Quests: harvest crops, gather copper, catch fish.');if(Phaser.Input.Keyboard.JustDown(this.keys.K))this.say('Mara: Welcome to the farmstead!');if(Phaser.Input.Keyboard.JustDown(this.keys.P))this.saveGame();
  if(this.clock>=DAY_SECONDS){this.clock-=DAY_SECONDS;this.day++;this.stamina=100;this.say(`Day ${this.day} • A new morning.`)} this.updateNight(); this.target.setPosition(Math.floor(this.player.x/TILE)*TILE+12,Math.floor(this.player.y/TILE)*TILE+12); this.updateHud();
 }
 private blocked(x:number,y:number){const tx=Math.floor(x/TILE),ty=Math.floor(y/TILE);return tx>=33&&tx<=37&&ty>=14&&ty<=20}
 private setTool(tool:Tool){this.tool=tool;this.say(`${tool.toUpperCase()} equipped`)}
 private actionAt(wx:number,wy:number){if(this.time.now-this.lastAction<160)return;this.lastAction=this.time.now;const x=Math.floor(wx/TILE),y=Math.floor(wy/TILE);if(Math.hypot(x-Math.floor(this.player.x/TILE),y-Math.floor(this.player.y/TILE))>4)return this.say('Too far away.');switch(this.tool){case'hoe':this.hoe(x,y);break;case'seeds':this.plant(x,y);break;case'water':this.water(x,y);break;case'axe':this.chop(x,y);break;case'pick':this.mine(x,y);break;case'sword':this.swing();break;case'rod':this.fish(x,y)}}
 private key(x:number,y:number){return `${x},${y}`}
 private hoe(x:number,y:number){if(x<29||x>41||y<22||y>30)return this.say('Till soil inside the farm plot.');const key=this.key(x,y);if(this.crops.has(key))return this.say('Already tilled.');const g=this.add.graphics().setDepth(15);g.fillStyle(0x6b4b2f).fillRect(x*TILE+3,y*TILE+3,18,18);this.crops.set(key,{stage:0,watered:false,g});this.say('Soil tilled.')}
 private plant(x:number,y:number){const c=this.crops.get(this.key(x,y));if(!c)return this.say('Till the soil first.');if(c.stage)return this.say('Already planted.');if(this.inventory.seeds<1)return this.say('No seeds.');this.inventory.seeds--;c.stage=1;c.g.fillStyle(0x6b4b2f).fillRect(x*TILE+3,y*TILE+3,18,18);c.g.fillStyle(0x70b85a).fillCircle(x*TILE+12,y*TILE+13,4);this.say('Parsnip planted.')}
 private water(x:number,y:number){const c=this.crops.get(this.key(x,y));if(!c||c.stage<1)return this.say('Nothing to water.');c.watered=true;c.g.fillStyle(0x4e8cc0).fillCircle(x*TILE+12,y*TILE+18,3);this.say('Watered.')}
 private chop(x:number,y:number){const tree=this.trees.find(t=>Math.abs((t.getData('x') as number)-x)<=1&&Math.abs((t.getData('y') as number)-y)<=1);if(!tree)return this.say('No tree nearby.');tree.destroy();this.trees=this.trees.filter(t=>t.active);this.inventory.wood+=3;this.say('+3 wood')}
 private mine(x:number,y:number){const rock=this.rocks.find(r=>Math.abs((r.getData('x') as number)-x)<=1&&Math.abs((r.getData('y') as number)-y)<=1);if(!rock)return this.say('No rock nearby.');this.inventory.stone+=2;if(rock.getData('ore'))this.inventory.ore+=1;rock.destroy();this.rocks=this.rocks.filter(r=>r.active);this.say('Mined rock.')}
 private swing(){this.say('⚔ Sword swing');this.tweens.add({targets:this.player,scaleX:1.35,duration:90,yoyo:true});}
 private fish(x:number,y:number){if(this.fishCooldown>0)return;if(Math.hypot(x-13,y-11)>6)return this.say('Fish at the pond.');if(!this.inventory.rod)return this.say('Craft a fishing rod first.');this.fishCooldown=1.5;this.inventory.fish++;this.say('Caught a fish! +$25')}
 private eat=()=>{if(this.inventory.berry<1)return this.say('No berries.');this.inventory.berry--;this.hunger=Math.min(100,this.hunger+25);this.say('A sweet berry restores hunger.')}
 private salve=()=>{if(this.inventory.berry<2||this.inventory.crystal<1)return this.say('Need 2 berries + 1 crystal.');this.inventory.berry-=2;this.inventory.crystal--;this.health=Math.min(100,this.health+35);this.say('Healing salve used.')}
 private sprint=()=>{this.stamina=Math.max(0,this.stamina-10);this.say('Sprint!')}
 private ship=()=>{if(!this.inventory.parsnip&&!this.inventory.fish)return this.say('Nothing ready to ship.');const value=this.inventory.parsnip*35+this.inventory.fish*25;this.inventory.parsnip=0;this.inventory.fish=0;this.money+=value;this.say(`Shipped goods for $${value}.`)}
 private saveGame=()=>{try{localStorage.setItem('core2d-save-v41',JSON.stringify({day:this.day,money:this.money,health:this.health,hunger:this.hunger,stamina:this.stamina,inventory:this.inventory,pickaxeLevel:this.pickaxeLevel})) ;this.say('Game saved.')}catch{this.say('Save unavailable.')}}
 private onCraft=(e:Event)=>{const id=(e as CustomEvent<{id:string}>).detail?.id;if(id==='fishingRod'&&this.inventory.wood>=6&&this.inventory.stone>=2){this.inventory.wood-=6;this.inventory.stone-=2;this.inventory.rod=1;this.say('Fishing rod crafted.')}else if(id==='copperPickaxe'&&this.inventory.wood>=8&&this.inventory.ore>=4){this.inventory.wood-=8;this.inventory.ore-=4;this.pickaxeLevel=2;this.say('Copper pickaxe crafted.')}else if(id==='sword'&&this.inventory.wood>=4&&this.inventory.ore>=6){this.inventory.wood-=4;this.inventory.ore-=6;this.inventory.sword=1;this.say('Copper sword crafted.')}else if(id==='torch'&&this.inventory.wood>=2&&this.inventory.coal>=1){this.inventory.wood-=2;this.inventory.coal--;this.inventory.torch+=3;this.say('Torches crafted.')}else this.say('Not enough materials.')}
 private onMine=()=>this.mine(Math.floor(this.player.x/TILE)+1,Math.floor(this.player.y/TILE)); private onAttack=()=>this.swing(); private onPlace=()=>this.actionAt(this.player.x,this.player.y); private onSelect=(e:Event)=>{const slot=Number((e as CustomEvent<{slot:number}>).detail?.slot);const tools:Tool[]=['sword','hoe','seeds','water','axe','pick','rod'];if(slot>=0&&slot<tools.length)this.setTool(tools[slot])};
 private updateNight(){const phase=this.clock/DAY_SECONDS;this.night.setAlpha(phase>.68?Math.min(.5,(phase-.68)/.18*.5):0)}
 private say(text:string){if(this.message)this.message.setText(text);window.dispatchEvent(new CustomEvent('core2d:message',{detail:{text}}))}
 private updateHud(){window.dispatchEvent(new CustomEvent('core2d:state',{detail:{version:'0.4.21',health:this.health,hunger:this.hunger,stamina:this.stamina,pickaxeLevel:this.pickaxeLevel,survivalTime:this.day*DAY_SECONDS+this.clock,threats:this.threats,selectedSlot:0,inventory:this.inventory,inventoryCapacity:24,attackRange:2.3,hasSword:this.inventory.sword>0}}));if(this.hud)this.hud.setText(`DAY ${this.day}  $${this.money}\nHP ${Math.ceil(this.health)}  HUN ${Math.ceil(this.hunger)}  STA ${Math.ceil(this.stamina)}`)}
}

new Phaser.Game({type:Phaser.AUTO,parent:'game',width:960,height:640,backgroundColor:'#739f52',pixelArt:true,antialias:false,scale:{mode:Phaser.Scale.RESIZE,autoCenter:Phaser.Scale.CENTER_BOTH},scene:[CozyFarm]});
