import {today,reminderTasks,taskContext} from './model.js';

// The view date never controls notifications. A visit is recorded only once
// account data is ready; waiting for sync must not consume today's first visit.
export function dailyReminderGate(storage,namespace='what-to-do:reminder-visit:v1'){
  const memory=new Map();
  const key=scope=>`${namespace}:${encodeURIComponent(scope)}`;
  function visited(scope,date){
    let saved;try{saved=storage.getItem(key(scope));}catch{}
    return saved===date||memory.get(scope)===date;
  }
  function mark(scope,date){memory.set(scope,date);try{storage.setItem(key(scope),date);}catch{}}
  return {mark,shouldOpen({scope,date,ready,hasItems,busy}){
    if(!scope||!ready||visited(scope,date))return false;
    if(busy)return false;
    if(!hasItems){mark(scope,date);return false;}
    mark(scope,date);return true;
  }};
}

export function todayReminders(data,date=today()){
  return reminderTasks(data,date).sort((a,b)=>(a.due||'9999').localeCompare(b.due||'9999')||(a.dueTime||'23:59').localeCompare(b.dueTime||'23:59')||a.title.localeCompare(b.title,'ko'));
}

export function createReminderCenter({getData,getScope=()=> 'preview',isReady=()=>true,getDate=today,esc,icon,onOpen,onAcknowledge,onPlan,storage={getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value)}}){
  const gate=dailyReminderGate(storage),panel=document.createElement('section');
  panel.id='reminder-popover';panel.className='reminder-popover';panel.hidden=true;
  panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','false');panel.setAttribute('aria-labelledby','reminder-heading');
  document.body.append(panel);
  let scope=getScope(),signature='',items=[];
  const bell=()=>document.querySelector('[data-reminder-bell]');
  const busy=()=>document.hidden||!!document.querySelector('dialog[open],[data-menu-panel]:not([hidden]),[data-quick-task],[data-check-form]:not([hidden])')||/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName)||document.body.classList.contains('task-dragging');
  function close(restore=false){panel.hidden=true;bell()?.setAttribute('aria-expanded','false');if(restore)bell()?.focus();}
  function position(){
    const anchor=bell();if(!anchor||panel.hidden)return;
    const rect=anchor.getBoundingClientRect(),width=Math.min(420,window.innerWidth-32),top=Math.max(16,rect.bottom+10);
    panel.style.width=`${width}px`;panel.style.left=`${Math.max(16,Math.min(rect.right-width,window.innerWidth-width-16))}px`;
    panel.style.top=`${top}px`;panel.style.maxHeight=`${Math.max(80,Math.min(560,window.innerHeight-top-16))}px`;
  }
  function paint(){
    if(panel.hidden)return;
    const date=getDate(),data=getData(),next=JSON.stringify([date,isReady(),items.map(task=>[task,taskContext(data,task)])]);
    if(next===signature){position();return;}signature=next;
    const active=document.activeElement?.closest('[data-reminder-action]'),action=active?.dataset.reminderAction,id=active?.dataset.id,scroll=panel.querySelector('.reminder-items')?.scrollTop||0;
    panel.innerHTML=`<header class="reminder-popover-header"><h2 id="reminder-heading">리마인드 <span>${Number(date.slice(5,7))}/${Number(date.slice(8,10))}</span></h2><button class="icon-button" data-reminder-action="close" aria-label="리마인드 닫기">${icon('close')}</button></header><div class="reminder-items">${items.length?items.map(task=>{
      const {project,work}=taskContext(data,task),context=[project?.title,work?.title].filter(Boolean).join(' / '),due=task.due?`${task.due===date?'오늘':Number(task.due.slice(5,7))+'/'+Number(task.due.slice(8,10))}${task.dueTime?' '+task.dueTime:''} 마감`:'';
      return `<article class="reminder-item"><button class="reminder-item-open" data-reminder-action="open" data-id="${esc(task.id)}">${context?`<span class="reminder-item-context">${esc(context)}</span>`:''}<strong>${esc(task.title)}</strong>${due?`<span class="reminder-item-due">${esc(due)}</span>`:''}</button><div class="reminder-item-actions"><button class="reminder-today" data-reminder-action="plan" data-id="${esc(task.id)}" aria-label="${esc(task.title)} 오늘 일정에 추가">오늘</button><button class="icon-button" data-reminder-action="acknowledge" data-id="${esc(task.id)}" aria-label="${esc(task.title)} 오늘 리마인드 확인" title="오늘 리마인드 확인 · 원본 유지">${icon('close')}</button></div></article>`;
    }).join(''):`<p class="reminder-empty">${!scope?'로그인하면 리마인드를 확인할 수 있어요.':!isReady()?'리마인드를 불러오는 중이에요.':'오늘 확인할 리마인드가 없어요.'}</p>`}</div>`;
    panel.querySelector('.reminder-items').scrollTop=scroll;
    if(active){const nextButton=[...panel.querySelectorAll('[data-reminder-action]')].find(el=>el.dataset.reminderAction===action&&el.dataset.id===id);(nextButton||panel.querySelector('[data-reminder-action="close"]')).focus({preventScroll:true});}
    position();
  }
  function open(){
    if(!bell())return;
    if(scope&&isReady())gate.mark(scope,getDate());
    panel.hidden=false;bell().setAttribute('aria-expanded','true');paint();
    panel.querySelector('[data-reminder-action="close"]')?.focus({preventScroll:true});
  }
  function refresh({auto=true}={}){
    const nextScope=getScope();if(scope!==nextScope){close();scope=nextScope;signature='';}
    items=scope&&isReady()?todayReminders(getData(),getDate()):[];
    const anchor=bell();if(!anchor){close();return;}
    if(!panel.hidden&&scope&&isReady())gate.mark(scope,getDate());
    const badge=anchor.querySelector('[data-reminder-count]');badge.hidden=!items.length;badge.textContent=items.length>99?'99+':String(items.length);
    anchor.setAttribute('aria-label',items.length?`리마인드 ${items.length}개`:'리마인드');anchor.setAttribute('aria-expanded',String(!panel.hidden));
    paint();
    if(auto&&panel.hidden&&gate.shouldOpen({scope,date:getDate(),ready:isReady(),hasItems:items.length>0,busy:busy()}))open();
  }
  document.addEventListener('click',event=>{
    if(event.target.closest('[data-reminder-bell]')){refresh({auto:false});panel.hidden?open():close(true);return;}
    const action=event.target.closest('[data-reminder-action]');if(!action)return;
    const {reminderAction:kind,id}=action.dataset;
    if(kind==='close'){close(true);return;}
    const task=items.find(item=>item.id===id);if(!task)return;
    if(kind==='open'){close();onOpen(id);return;}
    if(kind==='acknowledge')onAcknowledge(task,getDate());
    if(kind==='plan')onPlan(task,getDate());
    refresh({auto:false});
  });
  document.addEventListener('pointerdown',event=>{if(!panel.hidden&&!panel.contains(event.target)&&!event.target.closest('[data-reminder-bell]'))close();},true);
  document.addEventListener('keydown',event=>{if(!panel.hidden&&event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();close(true);}},true);
  document.addEventListener('focusin',event=>{if(!panel.hidden&&!panel.contains(event.target)&&!event.target.closest('[data-reminder-bell]'))close();});
  document.addEventListener('close',()=>queueMicrotask(()=>refresh()),true);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
  window.addEventListener('focus',()=>refresh());window.addEventListener('resize',position);
  window.addEventListener('scroll',position,true);
  return {refresh,close,isOpen:()=>!panel.hidden};
}
