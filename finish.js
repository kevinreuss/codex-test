'use strict';
let reveal=null,finishFrame=0;

function cutLines(shape,mode){
 return mode==='cut'&&shape.cutLoop?[shape.cutLoop.points]:shape.lines;
}

// Join separate strokes at their ends before testing enclosure.
function cutContours(operations){
 const paths=[];
 for(const g of operations.filter(g=>g.mode==='cut')){
  for(const shape of g.shapes)for(const points of cutLines(shape,g.mode)){
   if(points.length>1)paths.push({points:points.slice(),gap:g.name?2:.02});
  }
 }
 const near=(a,b,tol)=>Math.hypot(a.x-b.x,a.y-b.y)<=tol;
 const rings=[];
 while(paths.length){
  const chain=paths.pop();
  let pts=chain.points;
  while(!near(pts[0],pts.at(-1),chain.gap)){
   let joined=false;
   for(let i=0;i<paths.length;i++){
    const next=paths[i],p=next.points,gap=Math.min(chain.gap,next.gap);
    if(near(p[0],p.at(-1),next.gap))continue;
    if(near(pts.at(-1),p[0],gap))pts=pts.concat(p);
    else if(near(pts.at(-1),p.at(-1),gap))pts=pts.concat(p.reverse());
    else if(near(pts[0],p.at(-1),gap))pts=p.concat(pts);
    else if(near(pts[0],p[0],gap))pts=p.reverse().concat(pts);
    else continue;
    paths.splice(i,1);joined=true;break;
   }
   if(!joined)break;
  }
  if(pts.length<3||!near(pts[0],pts.at(-1),chain.gap))continue;
  const points=pts.map(p=>new THREE.Vector2(p.x-W/2,H/2-p.y));
  const area=Math.abs(THREE.ShapeUtils.area(points));
  if(area>.05)rings.push({points,area,children:[],depth:1});
 }
 rings.sort((a,b)=>b.area-a.area);
 function inside(p,poly){
  let hit=false;
  for(let i=0,j=poly.length-1;i<poly.length;j=i++){
   const a=poly[i],b=poly[j];
   if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)hit=!hit;
  }
  return hit;
 }
 for(let i=0;i<rings.length;i++){
  const r=rings[i];
  for(let j=i-1;j>=0;j--){
   const parent=rings[j];
   if(inside(r.points[0],parent.points)){
    r.depth=parent.depth+1;parent.children.push(r);break;
   }
  }
 }
 return rings;
}

function clearReveal(){
 if(!reveal)return;
 cancelAnimationFrame(finishFrame);
 const {root,original}=reveal;
 scene.remove(root);reveal.glints.dispose();
 root.traverse(obj=>{obj.geometry?.dispose();for(const m of [].concat(obj.material||[]))m.dispose()});
 reveal=null;lidHinge.rotation.x=0;
 blank.visible=sheetFace.visible=true;overlay.visible=$('guide').checked;
 target.copy(original.target);zoom=original.zoom;elevation=original.elevation;angle=original.angle;view();
}

function cutMesh(points,holes){
 const shape=new THREE.Shape(points);
 shape.holes=holes.map(r=>new THREE.Path(r.points));
 const geo=new THREE.ExtrudeGeometry(shape,{depth:3,bevelEnabled:false});
 const uv=geo.attributes.uv,pos=geo.attributes.position;
 for(let i=0;i<uv.count;i++)uv.setXY(i,pos.getX(i)/W+.5,pos.getY(i)/H+.5);
 const mesh=new THREE.Mesh(geo,[new THREE.MeshPhysicalMaterial({map:texture,roughness:.64,clearcoat:.14,clearcoatRoughness:.55}),new THREE.MeshStandardMaterial({color:0x633d25})]);
 mesh.rotation.x=-Math.PI/2;mesh.position.y=-3;mesh.castShadow=mesh.receiveShadow=true;
 return mesh;
}

function startReveal(){
 if(reveal)return;
 const rings=cutContours(groups);
 if(!rings.length)return;
 const root=new THREE.Group(),product=new THREE.Group(),stars=new THREE.Group();
 const corners=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,y])=>new THREE.Vector2(x*W/2,y*H/2));
 root.add(cutMesh(corners,rings.filter(r=>r.depth===1)));
 for(const ring of rings.filter(r=>r.depth%2))product.add(cutMesh(ring.points,ring.children));
 const scraps=new THREE.Group();
 for(const ring of rings.filter(r=>r.depth%2===0))scraps.add(cutMesh(ring.points,ring.children));
 const bounds=new THREE.Box3().setFromObject(product),center=bounds.getCenter(new THREE.Vector3());
 for(const mesh of product.children)mesh.position.sub(center);
 const size=bounds.getSize(new THREE.Vector3()),radius=Math.max(30,Math.hypot(size.x,size.z)*.54);
 root.add(product,stars,scraps);scene.add(root);
 const glints=highlightTexture();
 for(let i=0;i<16;i++){
  const shape=new THREE.Shape(),length=radius*(.033+(i%3)*.015);
  for(let j=0;j<8;j++){
   const a=j*Math.PI/4,r=j%2?length*.22:length;
   if(j)shape.lineTo(Math.cos(a)*r,Math.sin(a)*r);else shape.moveTo(r,0);
  }
  shape.closePath();
  const star=new THREE.Mesh(new THREE.ShapeGeometry(shape),new THREE.MeshBasicMaterial({color:i%3?0xffda80:0xfff6dd,transparent:true,depthWrite:false,side:THREE.DoubleSide}));
  const halo=new THREE.Sprite(new THREE.SpriteMaterial({map:glints,blending:THREE.AdditiveBlending,transparent:true,depthWrite:false}));
  halo.scale.setScalar(length*4.8);star.add(halo);stars.add(star);
 }
 const glow=new THREE.PointLight(0xffdf9e,0,radius*8);root.add(glow);
 const original={target:target.clone(),angle,elevation,zoom};
 reveal={root,original,glints};
 blank.visible=sheetFace.visible=overlay.visible=false;
 const started=performance.now(),smooth=v=>{v=Math.min(1,Math.max(0,v));return v*v*(3-2*v)};
 function animate(now){
  const sec=(now-started)/1000,open=smooth(sec/1.05),lift=smooth((sec-.8)/1.15),out=smooth((sec-1.55)/1.5);
  lidHinge.rotation.x=-1.25*open;
  // The honeycomb catches loose inner pieces just beneath the sheet.
  scraps.position.y=-2.7*smooth(sec/.35);
  product.position.set(center.x*(1-out),center.y+135*lift+67*out,center.z+(340-center.z)*out);
  const arrival=Math.max(0,sec-2.35);
  const bounce=Math.sin(arrival*6)*Math.exp(-arrival*2.8);
  product.position.y+=radius*(.24*bounce+.024*Math.sin(sec*1.8)*out);
  product.rotation.z=.09*bounce;
  product.rotation.x=out*(.88+.045*Math.sin(sec*1.1));product.rotation.y=out*(.28*Math.sin(sec*.85)+.35*Math.sin(Math.PI*out));
  if(sec<=3.2){
   target.copy(original.target).lerp(product.position,out*.94);
   angle=original.angle*(1-out)+.12*out;elevation=original.elevation*(1-out)+.48*out;
   zoom=original.zoom*(1-out)+Math.min(12,355/radius)*out;
  }
  glow.position.copy(product.position);glow.position.y+=radius;glow.position.z+=radius;glow.intensity=1.6*out;
  stars.position.copy(product.position);stars.quaternion.copy(camera.quaternion);
  stars.children.forEach((star,i)=>{
   const a=i*2.39996+sec*.055,r=radius*(1.12+.14*Math.sin(i));
   star.position.set(Math.cos(a)*r,Math.sin(a)*r*.88,10);
   star.children[0].material.opacity=out*(.48+.34*Math.sin(sec*2.5+i));
   star.material.opacity=out*(.58+.41*Math.sin(sec*2.5+i));star.scale.setScalar(.8+.25*Math.sin(sec*2+i));
  });
  $('state').textContent=out===1?'Werkstück fertig':lift>0?'Werkstück entnehmen':'Deckel öffnet sich';
  view();finishFrame=requestAnimationFrame(animate);
 }
 animate(started);
}
