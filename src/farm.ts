import Phaser from 'phaser';

const VERSION='0.3.18';
const TILE=24,W=70,H=52,DAY_LENGTH=120,MAX_STAMINA=100;
type Crop={stage:number,watered:boolean,plantedDay:number,graphic:Phaser.GameObjects.Graphics};
const grass=0x6f9b4f,dirt=0x9a6845,path=0xb49363,water=0x4f8fa3,wood=0x7b5537;

class FarmScene extends Phaser.Scene{
 private player!:Phaser.GameObjects.Rectangle; private tiles:Phaser.GameObjects.Rectangle[][]=[]; private crops=new Map<string,Crop>();
 private trees:Phaser.GameObjects.Rectangle[]=[]; private animals:Phaser.GameObjects.Ellipse[]=[]; private keys!:Record<string,Phaser.Input.Keyboard.Key>; private cursors!:Phaser.Types.Input.Keyboard.CursorKeys;
 private day=1; private clock=0; private stamina=MAX_STAMINA; private hunger=100; private health=100; private money=120; private selectedTool=0; private lastAction=0; private selected={x:0,y:0};
 private hud!:Phaser.GameObjects.Text; private message!:Phaser.GameObjects.Text; private night!:Phaser.GameObjects.Rectangle; private rng=()=>Math.random();
 private inventory={wood:12,ore:8,stone:10,berry:4,sword:1,torch:6};
 constructor(){super('farm');}
 create(){
  const k=this.input.keyboard!; this.cursors=k.createCursorKeys();
  this.keys={W:k.addKey('W'),A:k.addKey('A'),S:k.addKey('S'),D:k.addKey('D'),ONE:k.addKey('ONE'),TWO:k.addKey('TWO'),THREE:k.addKey('THREE'),FOUR:k.addKey('FOUR'),FIVE:k.addKey('FIVE'),SIX:k.addKey('SIX'),E:k.addKey('E'),SPACE:k.addKey('SPACE'),C:k.addKey('C'),I:k.addKey('I'),F:k.addKey('F')};
  this.makeWorld(); this.makeFarmhouse(); this.makeTrees(); this.makeAnimals();
  const sx=35,sy=27; this.player=this.add.rectangle(sx*TILE+12,sy*TILE+12,15,20,0xf1cf91).setDepth(30);
  this.cameras.main.setBounds(0,0,W*TILE,H*TILE);this.cameras.main.startFollow(this.player,true,.12,.12);this.cameras.main.setZoom(1.3);
  this.night=this.add.rectangle(480,320,960,640,0x17243b,.0).setScrollFactor(0).setDepth(90);
  this.hud=this.add.text(14,12,'',{fontFamily:'Georgia',fontSize:'15px',color:'#fff',backgroundColor:'#26351ddd',padding:{x:10,y:8}}).setScrollFactor(0).setDepth(100);
  this.message=this.add.text(480,14,'Good morning, farmer.',{fontFamily:'Georgia',fontSize:'15px',color:'#ffe9ad',backgroundColor:'#26351ddd',padding:{x:10,y:7}}).setOrigin(.5,0).setScrollFactor(0).setDepth(100);
  this.input.on('pointerdown',(p:Phaser.Input.Pointer)=>{if(p.leftButtonDown())this.actionAt(p.worldX,p.worldY);});
  window.addEventListener('core2d:craft',this.onCraft as EventListener);window.addEventListener('core2d:mine',this.onMine as EventListener);window.addEventListener('core2d:attack',this.onAttack as EventListener);window.addEventListener('core2d:place',this.onPlace as EventListener);window.addEventListener('core2d:select',this.onSelect as EventListener);window.addEventListener('core2d:eat',this.eat as EventListener);
  this.updateHud();console.info(`[Core2D] v${VERSION} — cozy farm build`);this.say('Day 1 • Plant some parsnips, water them, then explore.');
 }
 private makeWorld(){for(let y=0;y<H;y++){this.tiles[y]=[];for(let x=0;x<W;x++){let c=grass;if(x>=27&&x<=43&&y>=19&&y<=35)c=dirt;if((x>=30&&x<=40&&y>=23&&y<=31)&&((x+y)%4!==0))c=dirt;if(y>38&&x>3&&x<18)c=path;this.tiles[y][x]=this.add.rectangle(x*TILE+12,y*TILE+12,23,23,c);}}
  for(let x=29;x<=41;x++)for(let y=22;y<=30;y++)if((x+y)%3===0)this.add.rectangle(x*TILE+12,y*TILE+12,19,19,dirt).setDepth(1);
  const pond=this.add.ellipse(13*TILE,11*TILE,230,150,water).setDepth(2);pond.setStrokeStyle(4,0x315f70);
 }
 private makeFarmhouse(){const b=this.add.rectangle(35*TILE+12,17*TILE+12,12*TILE,6*TILE,0xc18a55).setDepth(5).setStrokeStyle(3,wood);this.add.rectangle(b.x,b.y+28,42,34,0x65432e).setDepth(6);this.add.polygon(b.x-145,b.y-55,[0,55,145,0,290,55],0x9a4e43).setDepth(6);this.add.text(b.x,b.y-8,'HOME',{fontFamily:'Georgia',fontSize:'13px',color:'#ffe6ad'}).setOrigin(.5).setDepth(7);}
 private makeTrees(){for(let i=0;i<28;i++){const x=4+Math.floor(this.rng()*62),y=3+Math.floor(this.rng()*42);if(x>26&&x<45&&y>15&&y<37)continue;const t=this.add.rectangle(x*TILE+12,y*TILE+15,12,22,0x60452e).setDepth(4);this.add.circle(t.x,t.y-13,16,0x355d3b).setDepth(5);this.trees.push(t);}}
 private makeAnimals(){for(let i=0;i<5;i++){const a=this.add.ellipse((22+i*2)*TILE+12,34*TILE+12,19,14,0xf1dfbd).setDepth(12);this.animals.push(a);}}
 update(_t:number,delta:number){const dt=Math.min(delta,50)/1000;this.clock+=dt;this.hunger=Math.max(0,this.hunger-dt*.35);this.stamina=Math.min(MAX_STAMINA,this.stamina+dt*15);let dx=0,dy=0;if(this.cursors.left.isDown||this.keys.A.isDown)dx--;if(this.cursors.right.isDown||this.keys.D.isDown)dx++;if(this.cursors.up.isDown||this.keys.W.isDown)dy++;if(this.cursors.down.isDown||this.keys.S.isDown)dy++;if(dx||dy){const l=Math.hypot(dx,dy),speed=135*(this.stamina>4?1:0.45);this.player.x=Phaser.Math.Clamp(this.player.x+dx/l*speed*dt,10,W*TILE-10);this.player.y=Phaser.Math.Clamp(this.player.y+dy/l*speed*dt,10,H*TILE-10);this.stamina=Math.max(0,this.stamina-dt*5);}
  if(Phaser.Input.Keyboard.JustDown(this.keys.ONE))this.tool(0);if(Phaser.Input.Keyboard.JustDown(this.keys.TWO))this.tool(1);if(Phaser.Input.Keyboard.JustDown(this.keys.THREE))this.tool(2);if(Phaser.Input.Keyboard.JustDown(this.keys.FOUR))this.tool(3);if(Phaser.Input.Keyboard.JustDown(this.keys.FIVE))this.tool(4);if(Phaser.Input.Keyboard.JustDown(this.keys.SIX))this.tool(5);if(Phaser.Input.Keyboard.JustDown(this.keys.E))this.actionSelected();if(Phaser.Input.Keyboard.JustDown(this.keys.SPACE))this.eat();if(Phaser.Input.Keyboard.JustDown(this.keys.F))this.swing();
  if(this.clock>=DAY_LENGTH){this.clock-=DAY_LENGTH;this.day++;this.growCrops();this.say(`Day ${this.day} • A fresh morning. Crops that were watered are growing.`);}
  const hour=this.clock/DAY_LENGTH*24;this.night.setAlpha(hour>18?(hour-18)/8:hour<6?(6-hour)/6:0);this.selected.x=Math.floor(this.player.x/TILE);this.selected.y=Math.floor(this.player.y/TILE);this.updateHud();
 }
 private tool(n:number){this.selectedTool=n;const names=['Hoe','Seeds','Watering Can','Axe','Pickaxe','Sword'];this.say(`${names[n]} equipped • click a tile`);}
 private actionSelected(){this.actionAt(this.selected.x*TILE+12,this.selected.y*TILE+12);}
 private actionAt(wx:number,wy:number){if(this.time.now-this.lastAction<180)return;this.lastAction=this.time.now;const x=Math.floor(wx/TILE),y=Math.floor(wy/TILE);if(Math.abs(x-this.selected.x)>5||Math.abs(y-this.selected.y)>5)return this.say('That is too far away.');
  if(this.selectedTool===0)return this.hoe(x,y);if(this.selectedTool===1)return this.plant(x,y);if(this.selectedTool===2)return this.water(x,y);if(this.selectedTool===3)return this.chop(x,y);if(this.selectedTool===4)return this.mine(x,y);this.swing();}
 private key(x:number,y:number){return `${x},${y}`;}
 private plot(x:number,y:number){return x>=29&&x<=41&&y>=22&&y<=30;}
 private hoe(x:number,y:number){if(!this.plot(x,y))return this.say('Hoe the soil inside your farm plot.');this.tiles[y][x].setFillStyle(dirt);this.say('Tilled soil • plant seeds here.');this.stamina=Math.max(0,this.stamina-4);}
 private plant(x:number,y:number){if(!this.plot(x,y))return this.say('Seeds need tilled soil.');const k=this.key(x,y);if(this.crops.has(k))return this.say('Something is already growing here.');if((this.inventory.berry??0)<1)return this.say('You need a Berry as a starter seed.');this.inventory.berry!--;const g=this.add.graphics().setDepth(15);g.fillStyle(0x7a4f2d);g.fillCircle(x*TILE+12,y*TILE+14,3);this.crops.set(k,{stage:0,watered:false,plantedDay:this.day,graphic:g});this.say('Parsnip planted • water it every day.');this.stamina=Math.max(0,this.stamina-2);}
 private water(x:number,y:number){const c=this.crops.get(this.key(x,y));if(!c)return this.say('Water a planted crop.');c.watered=true;c.graphic.clear();c.graphic.fillStyle(0x6b4b2f);c.graphic.fillCircle(x*TILE+12,y*TILE+14,4);c.graphic.fillStyle(0x7eb45b);c.graphic.fillRect(x*TILE+10,y*TILE+7,4,10);this.say('Watered crop • keep the soil green.');this.stamina=Math.max(0,this.stamina-1);}
 private growCrops(){for(const [k,c] of this.crops){if(c.watered){c.stage++;c.watered=false;const [x,y]=k.split(',').map(Number);c.graphic.clear();c.graphic.fillStyle(0x6b4b2f);c.graphic.fillCircle(x*TILE+12,y*TILE+15,4);c.graphic.fillStyle(c.stage>=3?0xffd45c:0x70b85a);c.graphic.fillCircle(x*TILE+12,y*TILE+10,5+c.stage);}}}
 private chop(x:number,y:number){const t=this.trees.findIndex(v=>Math.floor(v.x/TILE)===x&&Math.floor(v.y/TILE)===y);if(t<0)return this.say('No tree there.');this.trees[t].destroy();this.trees.splice(t,1);this.inventory.wood=(this.inventory.wood??0)+3;this.say('+3 Wood • the forest will regrow eventually.');this.stamina=Math.max(0,this.stamina-8);}
 private mine(x:number,y:number){if(!this.plot(x,y))return this.say('The farm is for farming; use the caves later.');this.say('Pickaxe ready • mine stone and ore once the cave area is unlocked.');}
 private swing(){const a=this.add.arc(this.player.x,this.player.y,42,0,Math.PI*1.4,false,0xffe39a,.35).setDepth(40);this.tweens.add({targets:a,alpha:0,scale:1.5,duration:150,onComplete:()=>a.destroy()});this.say('Whoosh!');}
 private onCraft=(e:Event)=>{const id=(e as CustomEvent).detail?.id;if(id==='sword')this.inventory.sword=1;this.say('Crafting bench used • tools are ready.');};private onMine=()=>this.actionSelected();private onAttack=()=>this.swing();private onPlace=()=>this.actionSelected();private onSelect=(e:Event)=>{const s=Number((e as CustomEvent).detail?.slot);if(Number.isFinite(s))this.selectedTool=s;};private eat=()=>{if((this.inventory.berry??0)<1)return this.say('No berries to eat.');this.inventory.berry!--;this.hunger=Math.min(100,this.hunger+28);this.health=Math.min(100,this.health+6);this.say('Ate a berry • feeling refreshed.');};
 private updateHud(){const mins=Math.floor(this.clock/60),secs=Math.floor(this.clock%60).toString().padStart(2,'0'),h=Math.floor(this.clock/DAY_LENGTH*24),m=Math.floor((this.clock/DAY_LENGTH*24%1)*60),period=h<6||h>=18?'Night':'Day';window.dispatchEvent(new CustomEvent('core2d:state',{detail:{version:VERSION,health:this.health,hunger:this.hunger,stamina:this.stamina,pickaxeLevel:1,survivalTime:(this.day-1)*DAY_LENGTH+this.clock,threats:h>=19||h<5?1:0,selectedSlot:this.selectedTool,inventory:{...this.inventory},inventoryCapacity:24,attackRange:1.8,hasSword:true}}));this.hud.setText(`DAY ${this.day}  ${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}  ${period}\n♥ ${Math.ceil(this.health)}   Energy ${Math.ceil(this.hunger)}   Stamina ${Math.ceil(this.stamina)}\n$ ${this.money}   Tool ${['HOE','SEEDS','WATER','AXE','PICK','SWORD'][this.selectedTool]}`);}
 private say(text:string){this.message.setText(text);window.dispatchEvent(new CustomEvent('core2d:message',{detail:{text}}));}
}
new Phaser.Game({type:Phaser.AUTO,parent:'game',width:960,height:640,backgroundColor:'#5f8749',pixelArt:true,scene:[FarmScene]});
