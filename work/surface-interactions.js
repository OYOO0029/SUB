// Small anchored menus and a horizontally draggable reminder strip.
// These interactions do not change task data.
export function installSurfaceInteractions(){
  const panelFor=button=>document.getElementById(button.getAttribute('aria-controls'));
  const triggerFor=panel=>document.querySelector(`[aria-controls="${panel.id}"]`);
  const entries=panel=>[...panel.children].flatMap(el=>el.matches('button')?[el]:[...el.children].filter(child=>child.matches('button'))).filter(el=>!el.disabled);
  function close(panel,focus=false){
    if(!panel)return;
    panel.querySelectorAll('[data-menu-panel]').forEach(child=>{child.hidden=true;triggerFor(child)?.setAttribute('aria-expanded','false');});
    panel.hidden=true;const trigger=triggerFor(panel);trigger?.setAttribute('aria-expanded','false');if(focus)trigger?.focus();
  }
  function closeAll(except){
    document.querySelectorAll('[data-menu-panel]:not([hidden])').forEach(panel=>{if(panel!==except&&!panel.contains(except))close(panel);});
  }
  function open(button,focus=false){
    const panel=panelFor(button);if(!panel)return;
    closeAll(panel);panel.hidden=false;button.setAttribute('aria-expanded','true');
    panel.classList.remove('opens-left');panel.style.removeProperty('--menu-shift-y');
    if(button.closest('.pl-table,.tt-table')){
      const anchor=button.getBoundingClientRect();panel.style.position='fixed';panel.style.transform='none';panel.style.right='auto';panel.style.maxHeight=Math.max(100,innerHeight-24)+'px';panel.style.overflowY='auto';
      panel.style.left=Math.max(12,Math.min(anchor.left,innerWidth-panel.offsetWidth-12))+'px';panel.style.top=Math.max(12,Math.min(anchor.bottom+6,innerHeight-panel.offsetHeight-12))+'px';
      if(focus)entries(panel)[0]?.focus();return;
    }
    const rect=panel.getBoundingClientRect();
    if(panel.hasAttribute('data-submenu')&&rect.right>innerWidth-12)panel.classList.add('opens-left');
    const after=panel.getBoundingClientRect();
    if(after.bottom>innerHeight-12)panel.style.setProperty('--menu-shift-y',`${Math.max(12-after.top,innerHeight-12-after.bottom)}px`);
    if(focus)entries(panel)[0]?.focus();
  }
  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-menu-toggle]');
    if(button){event.preventDefault();const panel=panelFor(button);if(button.hasAttribute('data-menu-hover')||panel.hidden)open(button);else close(panel);return;}
    if(!event.target.closest('[data-dropdown]'))closeAll();
  });
  document.addEventListener('pointerover',event=>{
    if(event.pointerType==='touch')return;
    const button=event.target.closest('[data-menu-hover]');
    if(button&&!button.contains(event.relatedTarget))open(button);
  });
  document.addEventListener('keydown',event=>{
    const button=event.target.closest('[data-menu-toggle]'),panel=event.target.closest('[data-menu-panel]');
    if(button&&['ArrowDown','ArrowRight'].includes(event.key)){
      event.preventDefault();event.stopImmediatePropagation();open(button,true);return;
    }
    if(panel&&['ArrowDown','ArrowUp','Home','End'].includes(event.key)){
      event.preventDefault();event.stopImmediatePropagation();const options=entries(panel),at=options.indexOf(event.target);
      options[event.key==='Home'?0:event.key==='End'?options.length-1:(at+(event.key==='ArrowDown'?1:-1)+options.length)%options.length]?.focus();return;
    }
    if(panel&&event.key==='ArrowLeft'&&panel.hasAttribute('data-submenu')){event.preventDefault();event.stopImmediatePropagation();close(panel,true);return;}
    if(event.key==='Escape'){
      const opened=[...document.querySelectorAll('[data-menu-panel]:not([hidden])')];
      if(opened.length){event.preventDefault();event.stopImmediatePropagation();close(panel||opened.at(-1),true);}
    }
  },true);
  document.addEventListener('focusin',event=>{if(!event.target.closest('[data-dropdown]'))closeAll();});
  window.addEventListener('resize',()=>closeAll());
  document.addEventListener('scroll',event=>{if(event.target.matches?.('.project-list-scroll'))closeAll();},true);

  let drag=null,suppressUntil=0,suppressedStrip=null;
  const finish=()=>{
    if(!drag)return;const current=drag;drag=null;
    if(current.active){suppressUntil=performance.now()+400;suppressedStrip=current.strip;}
    current.strip.classList.remove('is-panning');document.body.classList.remove('dragging-reminders');
    if(current.strip.hasPointerCapture(current.pointer))current.strip.releasePointerCapture(current.pointer);
  };
  document.addEventListener('pointerdown',event=>{
    const strip=event.target.closest('[data-reminder-scroll]');
    if(!strip||event.button!==0||event.pointerType==='touch'||strip.scrollWidth<=strip.clientWidth+1)return;
    drag={strip,pointer:event.pointerId,x:event.clientX,y:event.clientY,left:strip.scrollLeft,active:false};
  });
  document.addEventListener('pointermove',event=>{
    if(!drag||event.pointerId!==drag.pointer)return;
    const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
    if(!drag.active&&Math.abs(dx)>6&&Math.abs(dx)>Math.abs(dy)){
      drag.active=true;drag.strip.setPointerCapture(event.pointerId);drag.strip.classList.add('is-panning');document.body.classList.add('dragging-reminders');
    }
    if(drag.active){event.preventDefault();drag.strip.scrollLeft=drag.left-dx;}
  });
  document.addEventListener('pointerup',finish);document.addEventListener('pointercancel',finish);
  document.addEventListener('click',event=>{
    if(performance.now()<suppressUntil&&suppressedStrip?.contains(event.target)){event.preventDefault();event.stopImmediatePropagation();}
  },true);
  document.addEventListener('keydown',event=>{
    const strip=event.target.closest('[data-reminder-scroll]');if(!strip||event.target!==strip)return;
    if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){
      event.preventDefault();strip.scrollTo({left:event.key==='Home'?0:event.key==='End'?strip.scrollWidth:strip.scrollLeft+(event.key==='ArrowRight'?1:-1)*strip.clientWidth*.75,behavior:'smooth'});
    }
  });
  return {restore(ids){for(const id of ids){const panel=document.getElementById(id),trigger=panel&&triggerFor(panel);if(trigger)open(trigger);}}};
}
