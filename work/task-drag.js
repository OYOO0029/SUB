// Pointer drag supports mouse and touch. The handle's click opens the keyboard menu.
export function installTaskDrag(onMove){
  let drag=null,suppressedHandle=null,suppressUntil=0,frame;
  const clearTarget=()=>document.querySelectorAll('.drop-before,.drop-end,.drop-active').forEach(el=>el.classList.remove('drop-before','drop-end','drop-active'));
  function target(){
    clearTarget();if(!drag?.active)return;
    const zone=document.elementFromPoint(drag.x,drag.y)?.closest('[data-day-drop]');
    drag.valid=!!zone;drag.before=null;
    if(!zone)return;
    zone.classList.add('drop-active');
    const before=[...zone.querySelectorAll('.task-card')].filter(el=>el.dataset.task!==drag.id).find(el=>{const r=el.getBoundingClientRect();return drag.y<r.top+r.height/2;});
    if(before){drag.before=before.dataset.task;before.classList.add('drop-before');}else zone.classList.add('drop-end');
  }
  function tick(){
    if(!drag?.active)return;
    if(drag.y<70)window.scrollBy(0,-12);else if(drag.y>innerHeight-70)window.scrollBy(0,12);
    target();frame=requestAnimationFrame(tick);
  }
  function finish(commit){
    if(!drag)return;const d=drag;drag=null;cancelAnimationFrame(frame);clearTarget();d.ghost?.remove();d.card.classList.remove('is-dragging');document.body.classList.remove('task-dragging');
    if(d.handle.hasPointerCapture(d.pointer))d.handle.releasePointerCapture(d.pointer);
    if(d.active){suppressedHandle=d.id;suppressUntil=performance.now()+350;if(commit&&d.valid)onMove(d.id,d.before);}
  }
  document.addEventListener('pointerdown',event=>{
    const handle=event.target.closest('[data-drag-task]');if(!handle||event.button!==0)return;
    event.preventDefault();handle.focus({preventScroll:true});handle.setPointerCapture(event.pointerId);
    drag={handle,pointer:event.pointerId,id:handle.dataset.dragTask,card:handle.closest('.task-card'),startX:event.clientX,startY:event.clientY,x:event.clientX,y:event.clientY,active:false};
  });
  document.addEventListener('pointermove',event=>{
    if(!drag||event.pointerId!==drag.pointer)return;drag.x=event.clientX;drag.y=event.clientY;
    if(!drag.active&&Math.hypot(drag.x-drag.startX,drag.y-drag.startY)>6){drag.active=true;drag.card.classList.add('is-dragging');document.body.classList.add('task-dragging');drag.ghost=document.createElement('div');drag.ghost.className='task-drag-ghost';drag.ghost.textContent=drag.card.querySelector('.task-title').textContent;document.body.append(drag.ghost);tick();}
    if(drag.active){event.preventDefault();drag.ghost.style.left=`${Math.min(drag.x+12,innerWidth-220)}px`;drag.ghost.style.top=`${drag.y+12}px`;target();}
  });
  document.addEventListener('pointerup',event=>{if(drag&&event.pointerId===drag.pointer)finish(true);});
  document.addEventListener('pointercancel',()=>finish(false));
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&drag){event.preventDefault();finish(false);}});
  document.addEventListener('click',event=>{if(performance.now()<suppressUntil&&event.target.closest('[data-drag-task]')?.dataset.dragTask===suppressedHandle){event.preventDefault();event.stopImmediatePropagation();}},true);
}
