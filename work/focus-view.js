import {createTodayTable} from './today-table.js?v=20261027-click-add-1';
import {today,taskContext,setTime,removeTime,isDuePast} from './model.js?v=20261027-click-add-1';
import {executionSections,unfinished} from './workflow.js?v=20261027-click-add-1';
import {orderedTasks,deadlineConflict} from './work-view.js?v=20261026-controls-1';
import {createItem,conflicts} from './editing.js?v=20261027-click-add-1';
import {createFocusTimer} from './focus-timer.js?v=20261026-controls-1';
import {DAY_START,DAY_END,minute,time,koreaClock,timelineRows} from './focus-timeline.js?v=20261026-controls-1';

export function createFocusView({getData,getScope,ui,esc,icon,flow,passes,render,persist,notify,storage,save=()=>persist(''),filters=()=>''}){
  const timer=createFocusTimer({storage,getScope});
  const table=createTodayTable({getData,getScope,ui,esc,icon,timer,render,save,notify,flow});
  window.addEventListener('task-project-context',()=>{picker=null;});
  let picker=null,addOpen=false,addDraft='',timerEditing=false,timerDraft='60',lastView='',lastDay=today();
  const find=id=>getData().tasks.find(t=>t.id===id&&!t.deletedAt);
  const eligible=()=>executionSections(getData(),ui.date).planned.filter(unfinished).filter(table.matchesProject);
  const currentClock=()=>ui.date<today()?1440:ui.date>today()?-1:koreaClock();
  const phase=(start,end)=>end<=currentClock()?'past':start<=currentClock()&&currentClock()<end?'now':'future';
  const action=(label,name,attrs='',cls='focus-button')=>`<button type="button" class="${cls}" data-focus="${name}" ${attrs}>${label}</button>`;
  function context(t){const {project,work}=taskContext(getData(),t);return [project?.title,work?.title].filter(Boolean).join(' > ')||'단발성 업무';}
  function deadline(t){if(!t.due)return '';return t.due===ui.date?(t.dueTime?`${t.dueTime}까지`:'오늘까지'):`${Number(t.due.slice(5,7))}/${Number(t.due.slice(8))}${t.dueTime?' '+t.dueTime:''}까지`;}
  function row(t){
    const selected=timer.read().taskId===t.id,done=t.status==='done',late=!done&&isDuePast(t,ui.date),menu='focus-task-menu-'+t.id;
    return `<article class="focus-task${selected?' is-selected':''}${done?' is-done':''}" data-task="${esc(t.id)}"><label class="focus-check"><input type="checkbox" data-complete="${esc(t.id)}" aria-label="${esc(t.title)} 완료" ${done?'checked':''}></label><div class="focus-task-body"><div class="focus-context">${esc(context(t))}</div><button type="button" class="focus-task-title" data-action="detail" data-type="task" data-id="${esc(t.id)}">${esc(t.title)}</button></div><span class="focus-due${late?' is-late':''}" ${late?'aria-label="'+esc(deadline(t))+' · 마감 지남"':''}>${esc(deadline(t))}${late?'<small>마감 지남</small>':''}</span><div class="focus-task-menu" data-dropdown><button type="button" class="icon-button" data-action="menu" data-menu-toggle aria-haspopup="menu" aria-expanded="false" aria-controls="${menu}" aria-label="${esc(t.title)} 더보기">${icon('more')}</button><div id="${menu}" class="surface-menu" data-menu-panel role="menu" hidden>${!done?action(selected?'타이머 연결 해제':'타이머에 연결','select',`data-id="${esc(t.id)}" role="menuitem"`,'menu-option')+action('시간 배치','plan',`data-id="${esc(t.id)}" role="menuitem"`,'menu-option'):''}<button class="menu-option" data-action="detail" data-type="task" data-id="${esc(t.id)}" role="menuitem">상세 수정</button><button class="menu-option" data-action="order-task" data-id="${esc(t.id)}" role="menuitem">순서 변경</button><button class="menu-option" data-action="reschedule" data-id="${esc(t.id)}" data-from="${ui.date}" role="menuitem">할 날짜 변경</button><button class="menu-option" data-action="unschedule" data-id="${esc(t.id)}" role="menuitem">선택한 날에서 빼기</button></div></div></article>`;
  }
  function timerView(){
    const s=timer.read(),linked=find(s.taskId),selected=linked&&unfinished(linked)?linked:null;
    return `<aside class="focus-timer" aria-label="집중 타이머"><div class="focus-ring"><svg viewBox="0 0 280 280" aria-hidden="true"><circle class="focus-track" cx="140" cy="140" r="117"/><circle class="focus-progress" cx="140" cy="140" r="117" pathLength="100" stroke-dasharray="${s.ratio*100} 100" transform="rotate(-90 140 140)"/></svg>${action(`<span class="focus-clock${s.clock.length>5?' is-long':''}" role="timer" aria-live="off">${s.clock}</span>`,'timer-edit','aria-label="타이머 시간 설정"','focus-clock-button')}</div><div class="focus-timer-controls">${action('▶','start',`aria-label="타이머 시작" ${s.running?'disabled':''}`)}${action('■','pause',`aria-label="타이머 일시정지" ${s.running?'':'disabled'}`)}${action('↻','reset','aria-label="타이머 초기화"')}</div>${timerEditing?`<form data-focus-timer-form class="focus-timer-form"><label><input type="number" name="minutes" min="1" max="1440" step="1" required value="${esc(timerDraft)}" aria-label="타이머 시간, 분">분</label><button type="submit" class="small-button">설정</button>${action('취소','timer-cancel')}<p class="form-error" role="alert"></p></form>`:''}<p class="focus-linked" ${selected?'':'hidden'}>${selected?esc(selected.title):''}</p><p class="focus-ended" role="status" ${s.remaining===0?'':'hidden'}>설정한 시간이 끝났어요</p></aside>`;
  }
  function tick(m){const hour=m%60===0,now=Math.floor(currentClock()/10)*10===m;return `<span class="focus-tick${hour?' is-hour':''}${now?' is-now':''}" data-tick="${m}">${hour||now?`<span>${time(m)}</span>`:''}</span>`;}
  function rail(start,end){return `<div class="focus-rail" style="--ticks:${(end-start)/10}" aria-hidden="true">${Array.from({length:(end-start)/10},(_,i)=>tick(start+i*10)).join('')}</div>`;}
  function timelineRow(r){
    const p=phase(r.start,r.end);
    if(r.type==='gap')return `<div class="focus-time-row">${rail(r.start,r.end)}${action(`<span>${p==='now'?'지금, 비어 있는 시간':'빈 시간'}</span>${icon('plus')}`,'gap',`data-start="${r.start}" data-end="${r.end}" aria-label="${time(r.start)}부터 ${time(r.end)}까지 빈 시간에 할 일 배치"`,'focus-gap is-'+p)}</div>`;
    return `<div class="focus-time-row">${rail(r.start,r.end)}<div class="focus-events">${r.events.map(({task:t,block,start,end})=>`<article class="focus-event is-${phase(start,end)}"><div class="focus-event-content"><button class="ux-event-detail" data-tt="detail" data-id="${esc(t.id)}"><span class="focus-context">${esc(context(t))}</span><span class="focus-event-title">${esc(t.title)}</span></button><button class="tt-focus" data-tt="focus" data-id="${esc(t.id)}" aria-label="${esc(t.title)} 집중" title="집중">${icon('play')}</button></div><div class="ux-event-meta">${action(block.start+'–'+block.end,'plan',`data-id="${esc(t.id)}" aria-label="${esc(t.title)} 시간 변경" title="시간 변경"`,'focus-plan-time')}<span class="focus-due">${esc(deadline(t))}</span></div>${deadlineConflict(t,ui.date,block.end)?'<span class="focus-warning">마감 이후 배치</span>':''}</article>`).join('')}${r.events.length>1?'<small class="focus-warning">시간 겹침</small>':''}</div></div>`;
  }
  function timeline(tasks){
    const rows=timelineRows(tasks,ui.date,currentClock()),past=rows.filter(r=>r.end<=currentClock()),remaining=rows.filter(r=>r.end>currentClock());
    const unscheduled=tasks.filter(t=>!t.blocks.some(b=>b.date===ui.date)),outside=tasks.filter(t=>t.blocks.some(b=>b.date===ui.date&&(minute(b.end)<=DAY_START||minute(b.start)>=DAY_END)));
    const extra=(title,items)=>items.length?`<details class="focus-fold" data-fold="focus-${title}"><summary>${title} ${items.length}개</summary>${items.map(t=>action(`<span class="focus-context">${esc(context(t))}</span>${esc(t.title)}`,'plan',`data-id="${esc(t.id)}"`,'focus-unplanned')).join('')}</details>`:'';
    return `<div class="focus-time-heading"><span>08:00–19:00</span>${ui.date===today()?`<span>지금 <span data-focus-now>${time(koreaClock())}</span></span>`:''}</div><div class="focus-timeline">${past.length?`<details class="focus-history" data-fold="focus-past"><summary><span class="when-closed">지난 시간 펼치기</span><span class="when-open">지난 시간 접기</span></summary>${past.map(timelineRow).join('')}</details>`:''}${remaining.map(timelineRow).join('')}<div class="focus-time-row focus-time-end">${rail(DAY_END,DAY_END+10)}</div></div>${extra('시간 미정',unscheduled)}${extra('08:00–19:00 외 일정',outside)}`;
  }
  function openPicker(id,start,end){
    const task=find(id),block=task?.blocks.find(b=>b.date===ui.date);
    const initial=start??(block?minute(block.start):Math.ceil(koreaClock()/10)*10);
    const s=Math.max(DAY_START,Math.min(DAY_END-10,Math.floor(initial/10)*10)),e=Math.max(s+10,Math.min(DAY_END,Math.ceil((end??(block?minute(block.end):s+60))/10)*10));
    picker={taskId:task?.id||'',date:ui.date,start:s,end:e,anchor:null,query:'',choosing:!task,newTitle:'',projectId:table.addContext().projectId||''};
    render();const grid=document.querySelector('.focus-hours');if(grid){const row=grid.querySelectorAll('.focus-hour-row')[Math.max(0,Math.floor(s/60)-9)];if(row)grid.scrollTop=row.offsetTop-grid.querySelector('.focus-hour-row').offsetTop};document.querySelector('[data-focus-search]')?.focus();
  }
  function pickerView(){
    const p=picker,t=find(p.taskId),existing=t?.blocks.find(b=>b.date===p.date),busy=conflicts(getData(),p.taskId,p.date,time(p.start),time(p.end));
    const sections=executionSections(getData(),p.date,true),all=[...new Map([...sections.planned,...sections.overdue,...sections.upcoming].filter(unfinished).map(t=>[t.id,t])).values()],q=p.query.trim();
    const results=all.filter(table.matchesProject).filter(t=>(t.title+' '+context(t)).toLowerCase().includes(q.toLowerCase()));
    const chooser=p.choosing?`<div class="focus-task-picker"><input data-focus-search type="search" maxlength="160" aria-label="할 일 검색 또는 새로 입력" placeholder="할 일 검색 또는 새로 입력" value="${esc(p.query)}" autocomplete="off"><div class="focus-task-results">${results.map(t=>action(`<span>${esc(t.title)}</span><small>${esc(context(t))}</small>`,'pick-task',`data-id="${esc(t.id)}"`,'focus-task-option')).join('')}${q?action(icon('plus')+'<span>“'+esc(q)+'” 추가</span>','new-task','','focus-task-option focus-new-task'):''}${!results.length&&!q?'<span class="focus-no-results">할 일 이름을 입력하세요.</span>':''}</div></div>`:action(`<span>${esc(t?.title||p.newTitle)}</span>${icon('down')}`,'choose-task','aria-label="배치할 할 일 변경"','focus-chosen-task');
    return `<form data-focus-plan-form class="focus-picker"><div class="focus-picker-heading"><h2>시간 배치</h2>${action(icon('close'),'close-picker','aria-label="시간 배치 닫기"')}</div>${chooser}${p.newTitle&&!p.choosing?`<select data-focus-new-project aria-label="새 할 일 프로젝트"><option value="">프로젝트 없음</option>${getData().projects.filter(p=>!p.deletedAt).map(x=>`<option value="${esc(x.id)}" ${p.projectId===x.id?'selected':''}>${esc(x.title)}</option>`).join('')}</select>`:''}<output class="focus-selection" aria-live="polite"><strong>${time(p.start)} → ${time(p.end)}</strong><span>${p.end-p.start}분</span></output><div class="focus-hours" role="group" aria-label="시작과 마지막 10분 블록">${Array.from({length:(DAY_END-DAY_START)/60},(_,h)=>DAY_START+h*60).map(hour=>`<div class="focus-hour-row"><span>${hour/60}시</span><div class="focus-hour-buttons">${Array.from({length:6},(_,i)=>hour+i*10).map(m=>{const occupied=conflicts(getData(),p.taskId,p.date,time(m),time(m+10)),selected=m>=p.start&&m<p.end;return action(time(m).slice(3),'block',`data-minute="${m}" aria-pressed="${selected}" title="${time(m)}–${time(m+10)}${occupied.length?' · '+occupied.map(x=>esc(x.title)).join(', '):''}" aria-label="${time(m)}부터 ${time(m+10)}까지${occupied.length?', 다른 일정 있음':''}"`,'focus-block'+(occupied.length?' is-busy':'')+(m+10<=currentClock()?' is-past':'')+(m<=currentClock()&&currentClock()<m+10?' is-current':'')+(selected?' in-range':'')+(m===p.start?' range-start':'')+(m===p.end-10?' range-end':''));}).join('')}</div></div>`).join('')}</div>${busy.length?`<p class="focus-warning" role="status">겹치는 일정: ${esc([...new Set(busy.map(b=>b.title))].join(', '))}</p>`:''}${t&&deadlineConflict(t,p.date,time(p.end))?'<p class="focus-warning">마감 이후에 끝나는 일정입니다.</p>':''}${existing&&(minute(existing.start)%10||minute(existing.end)%10)?'<p class="focus-warning">저장 시 10분 단위로 맞춰집니다.</p>':''}<p class="form-error" role="alert"></p><div class="focus-picker-actions">${existing?action('배치 해제','remove-plan','','focus-remove'):''}<button type="submit" class="small-button" ${p.choosing||(!t&&!p.newTitle)?'disabled':''}>${existing?'변경 저장':'배치 저장'}</button></div></form>`;
  }
  function screen(){
    if(ui.view==='list')return table.screen(addOpen?`<form data-focus-add class="focus-add"><input name="title" value="${esc(addDraft)}" placeholder="새로운 할 일" maxlength="160" required aria-label="새로운 할 일"><button type="submit" class="small-button">추가</button>${action('취소','cancel-add')}<p class="form-error" role="alert"></p></form>`:'');
    const viewKey=`${ui.tab}/${ui.view}/${ui.date}`;
    if(lastView&&lastView!==viewKey)picker=null;lastView=viewKey;
    const s=executionSections(getData(),ui.date,true),planned=orderedTasks(getData(),table.filterTasks(s.planned).filter(t=>unfinished(t)&&passes(t)),ui.date),done=table.filterTasks(s.planned).filter(t=>t.status==='done'&&passes({...t,status:ui.status==='active'?'todo':t.status}));
    const fold=(label,key,tasks)=>tasks.length?`<details class="focus-fold" data-fold="${key}"><summary>${label} ${tasks.length}개</summary>${tasks.map(t=>flow.row(t,{carry:true})).join('')}</details>`:'';
    return `<section class="focus-screen tt-screen"><div class="focus-layout"><section class="focus-work" aria-label="오늘 할 일">${table.toolbar(true)}${table.projectTabs()}${table.toolbarMenu()}${addOpen?`<form data-focus-add class="focus-add"><input name="title" value="${esc(addDraft)}" placeholder="새로운 할 일" maxlength="160" required aria-label="새로운 할 일"><button type="submit" class="small-button">추가</button>${action('취소','cancel-add')}<p class="form-error" role="alert"></p></form>`:''}${picker?pickerView():ui.view==='timeline'?timeline(planned):planned.map(row).join('')||(done.length?'':ui.project||ui.work||ui.status!=='active'?'<p class="focus-empty">조건에 맞는 할 일이 없습니다. <button type="button" class="text-button" data-action="clear-filters">필터 초기화</button></p>':'<p class="focus-empty">오늘 할 일이 없습니다. +로 추가하세요.</p>')}${picker?'':table.remainingView({...s,overdue:s.overdue.filter(passes),upcoming:s.upcoming.filter(passes)})+(done.length?`<details class="focus-fold" data-fold="focus-done"><summary>완료한 일 ${done.length}개</summary>${done.map(row).join('')}</details>`:'')}</section></div>${table.panelView()}${table.miniView()}</section>`;
  }
  function updateTimer(){
    const ended=timer.tick();table.tick();const s=timer.read(),clock=document.querySelector('.focus-clock');
    if(clock){clock.textContent=s.clock;clock.classList.toggle('is-long',s.clock.length>5);document.querySelector('.focus-progress')?.setAttribute('stroke-dasharray',`${s.ratio*100} 100`);document.querySelector('[data-focus="start"]').disabled=s.running;document.querySelector('[data-focus="pause"]').disabled=!s.running;document.querySelector('.focus-ended').hidden=s.remaining!==0;}
    if(ended&&getScope())notify('타이머가 끝났어요.');
  }
  function repaintPicker(){const host=document.querySelector('[data-focus-plan-form]'),scroll=host?.querySelector('.focus-hours')?.scrollTop||0;if(host&&picker){host.outerHTML=pickerView();document.querySelector('.focus-hours').scrollTop=scroll;}}
  function resetPanels(){table.reset();picker=null;addOpen=false;addDraft='';timerEditing=false;lastView='';}
  document.addEventListener('click',event=>{
    const b=event.target.closest('[data-focus]');if(!b||b.disabled||!getScope())return;
    event.preventDefault();const a=b.dataset.focus,id=b.dataset.id;
    if(['start','pause','reset'].includes(a)){timer.change(a);updateTimer();return;}
    if(a==='select'){const t=find(id);if(t&&unfinished(t))timer.change('select',timer.read().taskId===id?null:id);render();return;}
    if(a==='timer-edit'){timerEditing=!timerEditing;timerDraft=String(timer.read().minutes);render();document.querySelector('[data-focus-timer-form] input')?.focus();return;}
    if(a==='timer-cancel'){timerEditing=false;render();return;}
    if(a==='add'){window.dispatchEvent(new CustomEvent('work-add-tasks'));return;}
    if(a==='cancel-add'){addOpen=false;addDraft='';render();return;}
    if(a==='gap'){let start=Number(b.dataset.start);const end=Number(b.dataset.end);if(event.detail>0){const box=b.getBoundingClientRect();if(box.height>0)start+=Math.max(0,Math.min((end-start)/10-1,Math.round((event.clientY-box.top-14)/box.height*((end-start)/10))))*10;}openPicker(eligible().some(t=>t.id===timer.read().taskId)?timer.read().taskId:null,start,Math.min(end,start+60));return;}
    if(a==='plan'){openPicker(id);return;}
    if(a==='close-picker'){picker=null;render();document.querySelector('.focus-tab[aria-pressed="true"]')?.focus();return;}
    if(!picker)return;
    if(a==='choose-task'){picker.choosing=true;picker.query='';repaintPicker();document.querySelector('[data-focus-search]')?.focus();return;}
    if(a==='pick-task'){const t=find(id);if(!t||!unfinished(t))return;picker.taskId=id;picker.newTitle='';picker.choosing=false;picker.anchor=null;const block=t.blocks.find(b=>b.date===picker.date);if(block){picker.start=Math.max(DAY_START,Math.min(DAY_END-10,Math.floor(minute(block.start)/10)*10));picker.end=Math.max(picker.start+10,Math.min(DAY_END,Math.ceil(minute(block.end)/10)*10));}repaintPicker();return;}
    if(a==='new-task'){if(!picker.query.trim())return;picker.newTitle=picker.query.trim();picker.taskId='';picker.choosing=false;repaintPicker();return;}
    if(a==='block'){const m=Number(b.dataset.minute);if(!Number.isInteger(m)||m<DAY_START||m>=DAY_END||m%10)return;if(picker.anchor===null){picker.start=m;picker.end=m+10;picker.anchor=m;}else{picker.start=Math.min(m,picker.anchor);picker.end=Math.max(m,picker.anchor)+10;picker.anchor=null;}repaintPicker();document.querySelector(`[data-minute="${m}"]`)?.focus();return;}
    if(a==='remove-plan'){const t=find(picker.taskId);if(t)removeTime(t,picker.date);picker=null;persist('시간 배치를 해제했습니다.');}
  });
  document.addEventListener('change',event=>{if(event.target.matches('[data-focus-new-project]')&&picker)picker.projectId=event.target.value;});
  document.addEventListener('input',event=>{if(event.target.matches('[data-focus-search]')&&picker){picker.query=event.target.value;const template=document.createElement('template');template.innerHTML=pickerView();document.querySelector('.focus-task-results').replaceChildren(...template.content.querySelector('.focus-task-results').childNodes);return;}if(event.target.closest('[data-focus-add]'))addDraft=event.target.value;if(event.target.closest('[data-focus-timer-form]'))timerDraft=event.target.value;});
  document.addEventListener('submit',event=>{
    const form=event.target;if(!form.matches('[data-focus-add],[data-focus-plan-form],[data-focus-timer-form]'))return;event.preventDefault();if(!getScope())return;
    try{
      if(form.matches('[data-focus-add]')){const task=createItem(getData(),'task',new FormData(form).get('title'),{date:ui.date});addDraft='';addOpen=false;if(picker)picker.taskId=task.id;persist('오늘 할 일에 추가했습니다.');}
      else if(form.matches('[data-focus-timer-form]')){timer.change('minutes',Number(new FormData(form).get('minutes')));timerEditing=false;render();}
      else if(picker){if(picker.choosing)throw new Error('할 일을 선택하거나 추가해 주세요.');const state=getData(),existing=find(picker.taskId);if(!existing&&!picker.newTitle)throw new Error('할 일을 선택하거나 추가해 주세요.');if(existing&&!unfinished(existing))throw new Error('진행 중인 할 일을 선택해 주세요.');const draft=existing?structuredClone(existing):createItem({...state,tasks:[]},'task',picker.newTitle,{projectId:picker.projectId||null});setTime(draft,picker.date,time(picker.start),time(picker.end));if(existing)Object.assign(existing,draft);else state.tasks.push(draft);picker=null;persist('시간을 배치했습니다.');}
    }catch(error){form.querySelector('.form-error').textContent=error.message;}
  });
  document.addEventListener('keydown',event=>{
    const form=event.target.closest('[data-focus-add],[data-focus-timer-form],[data-focus-plan-form]');if(!form)return;
    if(event.key==='Enter'&&(event.isComposing||event.keyCode===229)){event.preventDefault();return;}
    if(event.key==='Enter'&&event.target.matches('[data-focus-search]')){event.preventDefault();document.querySelector('[data-focus="new-task"]')?.click();return;}
    if(event.key==='Escape'){event.preventDefault();if(form.matches('[data-focus-add]')){addOpen=false;addDraft='';}else if(form.matches('[data-focus-timer-form]'))timerEditing=false;else picker=null;render();}
  });
  const interval=setInterval(updateTimer,1000);
  window.addEventListener('storage',event=>{if(event.key?.startsWith('my-work-focus-timer-v1:')){timer.reload();updateTimer();}});
  function rollover(){const next=today();if(next!==lastDay){if(ui.tab==='tasks'&&ui.date===lastDay)ui.date=next;lastDay=next;}}
  return {addContext:()=>({...table.addContext(),...(ui.view==='timeline'?{date:ui.date}:{})}),screen,overlays:()=>ui.tab!=='tasks'?table.panelView()+table.miniView():'',updateTimer,resetPanels,rollover,busy:()=>table.busy()||!!picker||addOpen||timerEditing,destroy:()=>clearInterval(interval)};
}
