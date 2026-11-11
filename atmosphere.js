'use strict';
function photoTexture(name,repeatX=1,repeatY=1){
 const map=new THREE.TextureLoader().load(workshopPhotos[name],()=>view());
 map.encoding=THREE.sRGBEncoding;
 map.wrapS=map.wrapT=THREE.MirroredRepeatWrapping;
 map.repeat.set(repeatX,repeatY);
 map.anisotropy=renderer.capabilities.getMaxAnisotropy();
 return map;
}

function createExtraction(scene){
 // Layered smoke in the closed chamber, carried toward the rear-left inlet.
 const intake=new THREE.Vector3(-256,13,-181);
 box(82,27,7,0x23292a,intake.x,intake.y,intake.z);
 for(let i=-4;i<=4;i++)box(2,24,2,0x929896,intake.x+i*8,intake.y,intake.z+4);
 const cloud=document.createElement('canvas');cloud.width=cloud.height=96;
 const ctx=cloud.getContext('2d');
 for(let i=0;i<24;i++){
  const a=i*2.4,r=15*Math.sin(i*1.7),x=48+r*Math.cos(a),y=48+r*Math.sin(a);
  const grad=ctx.createRadialGradient(x,y,0,x,y,22+i%8);
  grad.addColorStop(0,'rgba(96,92,88,.34)');grad.addColorStop(.52,'rgba(172,170,167,.18)');grad.addColorStop(1,'rgba(213,216,213,0)');
  ctx.fillStyle=grad;ctx.fillRect(0,0,96,96);
 }
 const map=new THREE.CanvasTexture(cloud),particles=[];
 for(let i=0;i<80;i++){
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map,transparent:true,depthWrite:false,opacity:0}));
  sprite.visible=false;sprite.renderOrder=1;scene.add(sprite);
  particles.push({sprite,age:2,origin:new THREE.Vector3(),phase:i*2.399});
 }
 const ember=new THREE.PointLight(0xff983b,0,26);scene.add(ember);
 let last=0,budget=0,next=0;
 return {update(x,z,mode,running,reset){
  const now=performance.now(),dt=Math.min(.075,(now-last)/1000);last=now;
  const cutting=running&&mode!=='travel';
  ember.position.set(x,3,z);ember.intensity=cutting?.8:0;
  if(reset||!running){budget=0;for(const p of particles){p.age=2;p.sprite.visible=false}return}
  if(cutting)budget+=dt*(mode==='cut'?42:30);
  while(budget>=1){
   const p=particles[next++%particles.length];p.age=0;p.origin.set(x,2,z);p.sprite.visible=true;budget--;
  }
  for(const p of particles){
   if(!p.sprite.visible)continue;
   p.age+=dt;const u=p.age/1.8;
   if(u>=1){p.sprite.visible=false;continue}
   const swirl=Math.sin(Math.PI*u);
   p.sprite.position.lerpVectors(p.origin,intake,u*u);
   p.sprite.position.x+=swirl*9*Math.sin(p.phase+u*6);
   p.sprite.position.y+=swirl*(24+4*Math.cos(p.phase));
   p.sprite.scale.setScalar(15+Math.sqrt(u)*49);p.sprite.material.rotation=p.phase+u*1.2;
   p.sprite.material.opacity=.78*Math.min(1,u*24)*Math.pow(1-u,.68);
  }
 }};
}

// A soft window and warm overhead strips reflected by varnish, metal and glass.
function workshopReflections(renderer){
 const studio=new THREE.Scene();studio.background=new THREE.Color(0x726b60);
 function card(x,y,z,w,h,color,intensity){
  const panel=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide}));
  panel.material.color.multiplyScalar(intensity);panel.position.set(x,y,z);panel.lookAt(0,0,0);studio.add(panel);
 }
 card(-4,2,-2,3,4,0xddeaff,5);card(1,5,1,6,.65,0xffecd6,4);card(4,1,2,1,3,0xffefd7,2);
 const generator=new THREE.PMREMGenerator(renderer);
 const result=generator.fromScene(studio,.04);generator.dispose();
 studio.traverse(o=>{o.geometry?.dispose();o.material?.dispose()});return result.texture;
}

function highlightTexture(){
 const c=document.createElement('canvas');c.width=c.height=128;
 const ctx=c.getContext('2d'),g=ctx.createRadialGradient(64,64,0,64,64,63);
 g.addColorStop(0,'rgba(255,253,234,1)');g.addColorStop(.07,'rgba(255,232,177,.95)');
 g.addColorStop(.2,'rgba(255,214,135,.38)');g.addColorStop(1,'rgba(255,203,120,0)');
 ctx.fillStyle=g;ctx.fillRect(0,0,128,128);return new THREE.CanvasTexture(c);
}
