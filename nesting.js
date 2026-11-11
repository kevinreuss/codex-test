'use strict';
// Conservative 2 mm occupancy cells. Reserve the complete cut silhouette,
// including enclosed holes, so independently cut copies cannot become islands.
function nestDrawings(drawings){
 const cell=2,cols=Math.floor(W/cell),rows=Math.floor(H/cell);
 function variant(d,turn){
  const rot=(p)=>[{x:p.x,y:p.y},{x:-p.y,y:p.x},{x:-p.x,y:-p.y},{x:p.y,y:-p.x}][turn];
  const lines=d.strokes.map(s=>({s,pts:(s.mode==='cut'&&s.loop?s.loop.points:s.points).map(rot)}));
  let left=Infinity,top=Infinity,right=-Infinity,bottom=-Infinity;
  for(const {s,pts} of lines){
   const pad=1+(s.mode==='cut'?.4:s.width/2);
   for(const p of pts){left=Math.min(left,p.x-pad);top=Math.min(top,p.y-pad);right=Math.max(right,p.x+pad);bottom=Math.max(bottom,p.y+pad)}
  }
  const w=Math.ceil((right-left)/cell),h=Math.ceil((bottom-top)/cell);
  if(w>cols||h>rows)return null;
  const mask=document.createElement('canvas');mask.width=w;mask.height=h;
  const ctx=mask.getContext('2d');ctx.setTransform(1/cell,0,0,1/cell,-left/cell,-top/cell);
  ctx.lineCap=ctx.lineJoin='round';
  function path(pts){
   ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i].x,pts[i].y);
  }
  const cuts=lines.filter(l=>l.s.mode==='cut').map(l=>({mode:'cut',name:d.name,shapes:[{lines:[l.pts]}]}));
  for(const r of cutContours(cuts).filter(r=>r.depth===1)){
   path(r.points.map(p=>({x:p.x+W/2,y:H/2-p.y})));ctx.closePath();ctx.fill();ctx.lineWidth=2.8;ctx.stroke();
  }
  for(const {s,pts} of lines){path(pts);ctx.lineWidth=2+(s.mode==='cut'?.8:s.width);ctx.stroke()}
  const pixels=ctx.getImageData(0,0,w,h).data,spans=[];
  let area=0;
  for(let y=0;y<h;y++)for(let x=0;x<w;){
   if(!pixels[4*(y*w+x)+3]){x++;continue}
   const start=x++;while(x<w&&pixels[4*(y*w+x)+3])x++;
   spans.push([y,start,x]);area+=x-start;
  }
  return {w,h,spans,area,place(p,x,y){const q=rot(p);return {x:q.x-left+x*cell,y:q.y-top+y*cell}}};
 }
 const items=drawings.filter(d=>d.strokes.length&&d.count>0).map(d=>({d,variants:[0,1,2,3].map(t=>variant(d,t)).filter(Boolean)}));
 if(!items.length)throw Error('Zeichne zuerst mindestens eine Linie.');
 if(items.some(i=>!i.variants.length)||items.reduce((a,i)=>a+i.d.count*i.variants[0].area,0)>cols*rows)
  throw Error('Die Motive passen mit diesen Stückzahlen und Abständen nicht auf die Platte.');
 let best=null;
 for(const strategy of ['area','long']){
  const used=new Uint8Array(cols*rows),placements=[];
  let width=0,height=0,failed=false;
  const rank=i=>strategy==='area'?i.variants[0].area:Math.max(i.variants[0].w,i.variants[0].h);
  for(const {d,variants} of items.slice().sort((a,b)=>rank(b)-rank(a))){
   for(let n=0;n<d.count;n++){
    let choice=null,score=Infinity;
    for(const v of variants){
     for(let y=0;y<=Math.min(height,rows-v.h);y++)for(let x=0;x<=Math.min(width,cols-v.w);x++){
      const nw=Math.max(width,x+v.w),nh=Math.max(height,y+v.h);
      const cost=nw*nh+(nw+nh)*.03+nh*.001+(x+y)*.000001;
      if(cost>=score)continue;
      const collision=v.spans.some(([dy,start,end])=>{
       const off=(y+dy)*cols+x;
       for(let k=start;k<end;k++)if(used[off+k])return true;
       return false;
      });
      if(!collision){choice={d,v,x,y,n};score=cost}
     }
    }
    if(!choice){failed=true;break}
    const {v,x,y}=choice;
    for(const [dy,start,end] of v.spans){const off=(y+dy)*cols+x;used.fill(1,off+start,off+end)}
    width=Math.max(width,x+v.w);height=Math.max(height,y+v.h);placements.push(choice);
   }
   if(failed)break;
  }
  if(!failed&&(!best||width*height<best.area))best={placements,area:width*height,width:width*cell,height:height*cell};
 }
 if(!best)throw Error('Keine passende Anordnung gefunden. Verringere die Stückzahl oder verkleinere ein Motiv.');
 return best;
}
