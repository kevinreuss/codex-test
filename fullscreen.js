'use strict';
const simulatorView=document.querySelector('main');
const fullscreenButton=$('fullscreenToggle');
let nativeFullscreen=false;

function setSettings(open){
 simulatorView.classList.toggle('settings-open',open);
 $('settingsToggle').setAttribute('aria-expanded',String(open));
}
function setExpanded(open){
 simulatorView.classList.toggle('expanded',open);
 fullscreenButton.textContent=open?'Vollbild beenden':'⛶ Vollbild';
 fullscreenButton.setAttribute('aria-pressed',String(open));
 if(!open)setSettings(false);
}
fullscreenButton.onclick=async()=>{
 if(simulatorView.classList.contains('expanded')){
  if(document.fullscreenElement===simulatorView)await document.exitFullscreen();
  setExpanded(false);
 }else{
  setExpanded(true);
  // Embedded browsers may support only a viewport-filling layout.
  try{await simulatorView.requestFullscreen?.()}catch{}
 }
};
document.addEventListener('fullscreenchange',()=>{
 const active=document.fullscreenElement===simulatorView;
 if(active||nativeFullscreen)setExpanded(active);
 nativeFullscreen=active;
});
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'&&!document.fullscreenElement&&simulatorView.classList.contains('expanded')){
  setExpanded(false);fullscreenButton.focus();
 }
});
$('settingsToggle').onclick=()=>setSettings(!simulatorView.classList.contains('settings-open'));
$('fullscreenUpload').onclick=()=>$('upload').click();
