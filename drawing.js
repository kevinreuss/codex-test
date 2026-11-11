'use strict';
const designs=[{name:'Zeichnung 1',count:1,strokes:[]}];
let selected=designs[0],strokes=selected.strokes,layout=null;
function editDesign(d){
 selected=d;strokes=d.strokes;layout=null;$('nestStatus').textContent='';
 refreshDesigns();listLines();renderPaper();
}
function refreshDesigns(){
 $('designs').replaceChildren();
 for(const d of designs){
  const row=document.createElement('div'),btn=document.createElement('button'),label=document.createElement('label'),qty=document.createElement('input');
  row.className='design-row';btn.textContent=d.name;btn.setAttribute('aria-pressed',String(d===selected));
  btn.onclick=()=>editDesign(d);
  qty.type='number';qty.min=0;qty.step=1;qty.value=d.count;
  qty.setAttribute('aria-label','Stückzahl '+d.name);
  qty.onchange=()=>{const v=qty.valueAsNumber;if(Number.isSafeInteger(v)&&v>=0)d.count=v;qty.value=d.count;layout=null;$('nestStatus').textContent='';listLines();renderPaper()};
  label.append(qty,' Stück');row.append(btn,label);$('designs').append(row);
 }
 $('lineTitle').textContent='Linien · '+selected.name;
}
$('newDesign').onclick=()=>{
 const d={name:'Zeichnung '+(designs.length+1),count:1,strokes:[]};designs.push(d);editDesign(d);
};
function invalidate(){layout=null;$('nestStatus').textContent=''}

const paper=$('paper'),ink=paper.getContext('2d');
const strokeColors={engrave:'#795238',cut:'#b94532'};
let activeStroke=null;

function renderPaper(){
 ink.setTransform(S,0,0,S,0,0);
 ink.clearRect(0,0,W,H);
 ink.lineCap=ink.lineJoin='round';
 const visible=layout?layout.placements.flatMap(({d,v,x,y})=>d.strokes.map(s=>placedStroke(s,p=>v.place(p,x,y)))):strokes;
 for(const stroke of visible){
  ink.strokeStyle=strokeColors[stroke.mode];
  ink.lineWidth=stroke.mode==='engrave'?stroke.width:.8;
  ink.stroke(stroke.mode==='cut'&&stroke.loop?stroke.loop.path:stroke.path);
 }
}

function listLines(){
 $('lineList').replaceChildren();
 if(!strokes.length)$('lineList').textContent='Ziehe mit der Maus, um die erste Linie zu zeichnen.';
 strokes.forEach((stroke,index)=>{
  const row=document.createElement('label'),select=document.createElement('select');
  row.className='line-item';
  row.append('Linie '+(index+1),select);
  select.add(new Option('Gravur','engrave'));select.add(new Option('Schnitt','cut'));
  select.value=stroke.mode;
  select.onchange=()=>{stroke.mode=select.value;invalidate();renderPaper()};
  $('lineList').append(row);
 });
 $('undoLine').disabled=!strokes.length;
 $('nest').disabled=$('applyLines').disabled=!designs.some(d=>d.strokes.length&&d.count);
}
function editing(open){
 if(open)leaveRealView();
 for(const id of ['editor','lineSettings'])$(id).hidden=!open;
 for(const id of ['stage','pan','jobSettings'])$(id).hidden=open;
 for(const selector of ['.playback','.foot'])document.querySelector(selector).hidden=open;
 $('drawTab').classList.toggle('active',open);
 if(open){
  playing=false;show(t);$('iso').classList.remove('active');$('topView').classList.remove('active');
  refreshDesigns();listLines();renderPaper();
 }
}
$('drawTab').onclick=()=>editing(true);
for(const [id,top] of [['iso',false],['topView',true]])$(id).onclick=()=>{leaveRealView();editing(false);preset(top)};
$('brush').oninput=()=>{$('widthValue').value=$('brush').value+' mm'};
function paperPoint(e){
 const rect=paper.getBoundingClientRect();
 return {x:Math.max(0,Math.min(W,(e.clientX-rect.left)*W/rect.width)),y:Math.max(0,Math.min(H,(e.clientY-rect.top)*H/rect.height))};
}
paper.onpointerdown=e=>{
 if(activeStroke||e.button!==0)return;
 if(layout){$('nestStatus').textContent='Zum Weiterzeichnen eine Zeichnung auswählen.';return}
 const start=paperPoint(e),path=new Path2D();
 path.moveTo(start.x,start.y);
 const stroke={points:[start],width:Number($('brush').value),mode:$('brushMode').value,path};
 strokes.push(stroke);activeStroke={id:e.pointerId,stroke};paper.setPointerCapture(e.pointerId);
};
function extendStroke(e){
 const stroke=activeStroke.stroke,p=paperPoint(e),last=stroke.points[stroke.points.length-1];
 if(p.x===last.x&&p.y===last.y)return;
 stroke.points.push(p);stroke.path.lineTo(p.x,p.y);
}
paper.onpointermove=e=>{
 if(activeStroke?.id!==e.pointerId)return;
 for(const sample of e.getCoalescedEvents?.()||[])extendStroke(sample);
 extendStroke(e);renderPaper();
};
// Walk in drawing order. When one segment crosses several earlier ones,
// the first intersection reached along the new segment closes the cut.
function firstCutLoop(points){
 for(let end=3;end<points.length;end++){
  const a=points[end-1],b=points[end],dx=b.x-a.x,dy=b.y-a.y;
  let nearest=Infinity,loop=null;
  for(let j=1;j<end-1;j++){
   const c=points[j-1],d=points[j],ex=d.x-c.x,ey=d.y-c.y;
   if(Math.max(a.x,b.x)<Math.min(c.x,d.x)||Math.min(a.x,b.x)>Math.max(c.x,d.x)||
      Math.max(a.y,b.y)<Math.min(c.y,d.y)||Math.min(a.y,b.y)>Math.max(c.y,d.y))continue;
   const cross=dx*ey-dy*ex;
   if(Math.abs(cross)<1e-10)continue;
   const ox=c.x-a.x,oy=c.y-a.y;
   const t=(ox*ey-oy*ex)/cross,u=(ox*dy-oy*dx)/cross;
   if(t<0||t>1||u<0||u>1||t>=nearest)continue;
   const hit={x:a.x+t*dx,y:a.y+t*dy};
   const ring=[hit,...points.slice(j,end),hit];
   if(Math.abs(THREE.ShapeUtils.area(ring))<=.05)continue;
   nearest=t;loop=ring;
  }
  if(loop){
   const path=new Path2D();
   path.moveTo(loop[0].x,loop[0].y);
   for(const p of loop.slice(1))path.lineTo(p.x,p.y);
   path.closePath();
   return {points:loop,path};
  }
 }
 return null;
}
paper.onpointerup=e=>{
 if(activeStroke?.id!==e.pointerId)return;
 extendStroke(e);
 const stroke=activeStroke.stroke;
 if(stroke.points.length===1){
  const p=stroke.points[0],end={x:p.x+(p.x<W/2?.01:-.01),y:p.y};
  stroke.points.push(end);stroke.path.lineTo(end.x,end.y);
 }
 stroke.loop=firstCutLoop(stroke.points);
 activeStroke=null;renderPaper();listLines();
};
paper.onlostpointercapture=e=>{
 if(activeStroke?.id!==e.pointerId)return;
 strokes.pop();activeStroke=null;renderPaper();listLines();
};
$('undoLine').onclick=()=>{invalidate();strokes.pop();renderPaper();listLines()};
function placedStroke(s,place){
 function line(points){
  const mapped=points.map(place),path=new Path2D();
  path.moveTo(mapped[0].x,mapped[0].y);
  for(const p of mapped.slice(1))path.lineTo(p.x,p.y);
  return {points:mapped,path};
 }
 return {...s,...line(s.points),loop:s.loop?line(s.loop.points):null};
}
function arrange(){
 try{
  layout=nestDrawings(designs);
  $('nestStatus').textContent=layout.placements.length+' Stück · Belegte Fläche '+layout.width+' × '+layout.height+' mm';
  renderPaper();return true;
 }catch(e){layout=null;$('nestStatus').textContent=e.message;renderPaper();return false}
}
$('nest').onclick=arrange;
$('applyLines').onclick=()=>{
 const enabled=designs.filter(d=>d.strokes.length&&d.count);
 if(!enabled.length)return;
 if(!layout&&(enabled.length>1||enabled[0].count>1)&&!arrange())return;
 const entries=layout?layout.placements:[{d:enabled[0]}];
 const jobs=new Map();
 for(const {d,v,x,y} of entries)d.strokes.forEach((source,i)=>{
  const s=v?placedStroke(source,p=>v.place(p,x,y)):source;
  if(!jobs.has(source))jobs.set(source,{name:d.name+' · Linie '+(i+1),color:strokeColors[s.mode],mode:s.mode,speed:speeds[s.mode],shapes:[]});
  jobs.get(source).shapes.push({lines:[s.points],path:s.path,cutLoop:s.loop,width:s.width,stroke:true});
 });
 groups=[...jobs.values()].sort((a,b)=>Number(a.mode==='cut')-Number(b.mode==='cut'));
 $('filename').textContent=layout?'Nesting':'Freihandzeichnung';
 $('dimensions').textContent=entries.length+' Stück auf dem Werkstück';
 $('error').textContent='';editing(false);panel();plan();preset(false);
};

$('realView').onclick=()=>{
 if(realViewTime!==null)return;
 if(!$('editor').hidden&&designs.some(d=>d.count&&d.strokes.length)){
  $('applyLines').click();
  if(!$('editor').hidden)return;
 }
 editing(false);
 cancelAnimationFrame(frame);playing=false;
 realViewTime=t;
 clearReveal();
 $('iso').classList.remove('active');$('topView').classList.remove('active');
 $('realView').classList.add('active');$('realView').setAttribute('aria-pressed','true');
 document.querySelector('.playback').hidden=true;
 show(duration,true);
};
