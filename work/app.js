import {installTableResize} from './table-resize.js?v=20261026-controls-1';
import {workImages} from './image-store.mjs';
import {createFocusView} from './focus-view.js?v=20261026-controls-1';
import {appStorage} from '../schedule-storage.mjs';
import {createWorkflowUI} from './workflow-ui.js?v=20261026-controls-1';
import {projectSummary,projectTasks,unfinished,removeFromDay,moveTaskDate} from './workflow.js?v=20261026-controls-1';
import {createItem,changeCheck} from './editing.js?v=20261026-controls-1';
import {PROJECT_STATES,projectState,projectList,projectActiveWorks,projectWorkDue} from './project-view.js?v=20261026-controls-1';
import {createReminderCenter} from './reminders.js?v=20261026-controls-1';
import {createDetailUI} from './detail-ui.js?v=20261026-controls-1';
import {activeChecks} from './editing.js?v=20261026-controls-1';
import {today,addDays,addMonths,weekDays,monthDays,uid,isVisible,isPlanned,isDuePast,isCarried,planToday,planFor,setTime,removeTime,complete,taskContext,matches,duration} from './model.js?v=20261026-controls-1';
import {startWorkCloud} from './integration.js?v=20261026-controls-1';
import {loadState,saveState,validate,workAccount} from './repository.js?v=20261026-controls-1';
import {automaticOrder,orderedTasks,taskSections,taskFilter,searchEntities,moveToDay,deadlineConflict,countdown} from './work-view.js?v=20261026-controls-1';
import {installTaskDrag} from './task-drag.js';
import {installSurfaceInteractions} from './surface-interactions.js?v=20261026-controls-1';
import {workCalendarDays,calendarWeeks,monthLaneCapacity} from './calendar-layout.js?v=20261026-controls-1';

const loaded=loadState();let data=loaded.state;
const ui={mode:'work',tab:'tasks',projectPage:null,projectPageTab:'tasks',calendarPlans:true,calendarDue:true,view:'list',monthLanes:3,projectStates:['active'],projectSort:'added',projectDirection:'asc',date:today(),completed:false,cloudStatus:'online',search:'',searchOpen:false,searchScope:'all',project:'',work:'',status:'active',group:'none',tools:false,detail:null,saveWarning:loaded.warning};
const $=s=>document.querySelector(s), esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paths={check:'m5 12 4 4L19 6',plus:'M12 5v14M5 12h14',chevron:'m9 5 7 7-7 7',left:'m15 5-7 7 7 7',close:'m6 6 12 12M6 18 18 6',clock:'M12 8v4l3 2',search:'m21 21-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',folder:'M3 7V5h6l2 2h10v13H3Z',briefcase:'M8 6V3h8v3M3 7h18v13H3ZM3 12h18M10 12v3h4v-3',home:'m3 10 9-7 9 7v11h-6v-7H9v7H3Z',settings:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2',list:'M9 6h12M9 12h12M9 18h12M3 6h1M3 12h1M3 18h1',calendar:'M4 5h16v16H4ZM4 10h16M8 2v6M16 2v6',bell:'M18 8a6 6 0 0 0-12 0v6l-2 3h16l-2-3ZM10 21h4',arrow:'M4 12h16m-6-6 6 6-6 6',edit:'m15 4 5 5M4 20l5-1L21 7l-5-5L4 14Z',tag:'M3 3h8l10 10-8 8L3 11ZM7 7h.01',note:'M5 3h14v13l-5 5H5ZM14 21v-6h5M8 7h8M8 11h6',users:'M8 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M2 21v-3a6 6 0 0 1 12 0v3M16 4a4 4 0 0 1 0 7M17 14a5 5 0 0 1 5 5v2',download:'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5',trash:'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7',sun:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1 1M18 18l1 1M5 19l1-1M18 6l1-1',moon:'M20 14A9 9 0 0 1 10 3a9 9 0 1 0 10 11',leaf:'M20 3C8 1 2 8 5 15c5 8 16 1 15-12ZM5 20 16 8',eye:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12ZM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6',undo:'M8 4 3 9l5 5M3 9h11a6 6 0 0 1 0 12',info:'M12 11v6M12 7h.01'};
paths.sort='M8 4v16m-4-4 4 4 4-4M14 6h7M14 11h5M14 16h3';paths.down='m6 9 6 6 6-6';paths.up='m6 15 6-6 6 6';paths.play='m8 5 11 7-11 7Z';
paths.week='M4 5h16v14H4ZM9 5v14M15 5v14';paths.more='M5 12h.01M12 12h.01M19 12h.01';
paths.filter='M3 6h7m4 0h7M3 18h11m4 0h3M10 3v6M14 15v6M3 12h3m4 0h11M6 9v6';paths.grip='M9 5h.01M15 5h.01M9 12h.01M15 12h.01M9 19h.01M15 19h.01';
function icon(name,cls=''){return `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${['clock','info'].includes(name)?'<circle cx="12" cy="12" r="9"/>':''}<path d="${paths[name]||paths.note}"/></svg>`;}
const dateObj=date=>new Date(date+'T12:00:00Z');
const fmt=(date,opts={month:'numeric',day:'numeric'})=>new Intl.DateTimeFormat('ko-KR',{timeZone:'UTC',...opts}).format(dateObj(date));
const short=date=>date?`${Number(date.slice(5,7))}/${Number(date.slice(8,10))}`:'미정';
const button=(label,action,attrs='',cls='button')=>`<button class="${cls}" data-action="${action}" ${attrs} ${!attrs.includes('title=')&&attrs.match(/aria-label="([^"]+)"/) ? 'title="'+attrs.match(/aria-label="([^"]+)"/)[1]+'"' : ''}>${label}</button>`;
const badge=(label,kind='')=>`<span class="badge ${kind}">${esc(label)}</span>`;
const tagList=tags=>(tags||[]).map(t=>`<span class="tag">${esc(t)}</span>`).join('');
function dueLabel(task){if(!task.due)return '';if(isDuePast(task,ui.date)){const days=Math.round((dateObj(ui.date)-dateObj(task.due))/86400000);return days?`${days}일 지연`:'마감 지남';}if(task.due===ui.date)return task.dueTime?`오늘 ${task.dueTime}`:'오늘';if(task.due===addDays(ui.date,1))return '내일';const days=Math.round((dateObj(task.due)-dateObj(ui.date))/86400000);return days<=7?`${days}일 후`:short(task.due);}
const passes=t=>taskFilter(data,t,ui);
const findTask=id=>data.tasks.find(t=>t.id===id);
const flow=createWorkflowUI({getData:()=>data,ui,esc,icon,button,passes,projectInfo:p=>detailUI.projectInfo(p)});
let toastTimer,undoFn=null;
let projectListScroll={owner:null,top:0};
const focus=createFocusView({getData:()=>data,getScope:()=>workAccount.owner,ui,esc,icon,flow,passes,render,persist,notify:toast,storage:appStorage,save:()=>{const ok=saveState(data);ui.saveWarning=ok?'':'저장하지 못했습니다. 현재 입력을 유지합니다.';if(!ok)toast(ui.saveWarning);return ok;},filters:()=>workspaceActions(true)});
function toast(message,undo=null){clearTimeout(toastTimer);undoFn=undo;$('#toast').innerHTML=`${icon('check')}<span>${esc(message)}</span>${undo?button('되돌리기','undo','','text-button'):''}`;$('#toast').classList.add('visible');toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),6000);}
function persist(message,undo,keepMenus=false){const ok=saveState(data);ui.saveWarning=ok?'':'기기에 저장하지 못했습니다. 내보내기로 현재 내용을 보관해 주세요.';render({keepMenus});if(ui.detail&&$('#detail').open)renderDetail();toast(ok?message:'저장 공간을 확인해 주세요. 입력 내용은 현재 창에 유지됩니다.',undo);}
function taskCard(task,{compact=false,showPlan=false,listMode=false,movable=false}={}){
  const checks=activeChecks(task);
  const {work,project}=taskContext(data,task),block=task.blocks.find(b=>b.date===ui.date),done=task.status==='done';
  return `<article class="task-card ${done?'is-done':''} ${compact?'compact':''}" data-task="${esc(task.id)}">
    ${movable?button(icon('grip'),'drag-handle',`data-drag-task="${esc(task.id)}" aria-label="${esc(task.title)} 순서 이동" title="드래그로 이동 · Enter로 이동 메뉴"`,'drag-handle'):''}
    <input class="task-check" type="checkbox" aria-label="${esc(task.title)} 완료" data-complete="${esc(task.id)}" ${done?'checked':''}>
    <div class="task-content"><button class="task-open" data-action="detail" data-type="task" data-id="${esc(task.id)}">${listMode?'':`<span class="eyebrow">${esc(project?.title||'단발성 업무')}${work?` <span class="crumb">/</span> ${esc(work.title)}`:''}</span>`}<span class="task-title">${esc(task.title)}</span></button>
    ${!compact||listMode?`<div class="inline-checks">${checks.map(c=>`<div class="mini-check ${c.done?'checked':''}"><input type="checkbox" data-check="${esc(c.id)}" data-task-id="${esc(task.id)}" aria-label="${esc(c.title)} 확인" ${c.done?'checked':''}><input class="inline-check-title" data-check-title="${esc(c.id)}" data-task-id="${esc(task.id)}" aria-label="확인사항 내용" value="${esc(c.title)}" maxlength="160">${button(icon('close'),'delete-check',`data-task-id="${task.id}" data-check-id="${c.id}" aria-label="${esc(c.title)} 확인사항 삭제"`,'check-delete icon-button')}</div>`).join('')}${detailUI.checkForm(task.id)}</div>`:''}
    ${!compact&&!listMode?`<div class="task-footer">${block?button(icon('clock')+`${block.start} – ${block.end}`,'time',`data-id="${esc(task.id)}"`,'time-chip'):button(icon('clock')+'시간 배치','time',`data-id="${esc(task.id)}"`,'quiet-link')}${task.tags.slice(0,2).map(t=>`<span class="text-tag">#${esc(t)}</span>`).join('')}</div>`:''}</div>
    <div class="task-meta">${done?badge('완료','done'):(task.status==='paused'?badge('보류','neutral'):'')+(task.due?badge(dueLabel(task),isDuePast(task,ui.date)?'overdue':'neutral'):'')}${block&&deadlineConflict(task,ui.date,block.end)?`<span class="schedule-warning" title="배치 시간이 실제 마감을 넘습니다" aria-label="배치 시간이 실제 마감을 넘습니다">${icon('info')}</span>`:''}${showPlan?button('오늘 '+icon('arrow'),'plan',`data-id="${esc(task.id)}"`,'small-button'):''}</div>
    ${!compact||listMode?detailUI.checkAddButton(task.id):''}
  </article>`;
}
function empty(title,description,action='add',label='할 일 추가'){return `<div class="empty-state">${icon('leaf')}<h3>${title}</h3><p>${description}</p>${action?button(icon('plus')+label,action,'','small-button'):''}</div>`;}
function projectGroups(items,renderItem,className='task-list',projectFor=item=>taskContext(data,item).project){
  const groups=new Map();
  for(const item of items){
    const project=projectFor(item),key=project&&!project.deletedAt?project.id:null;
    if(!groups.has(key))groups.set(key,{project:key?project:null,items:[]});
    groups.get(key).items.push(item);
  }
  return [...groups.values()].map(({project,items})=>`<section class="project-task-group"><h3 class="project-group-heading">${project?button(icon('folder')+'<span>'+esc(project.title)+'</span>','detail',`data-type="project" data-id="${esc(project.id)}"`,'project-group-link'):icon('briefcase')+'<span>프로젝트 없는 일</span>'}</h3><div class="${className}">${items.map(renderItem).join('')}</div></section>`).join('');
}
function groupedTasks(tasks){
  const card=t=>taskCard(t,{listMode:true,movable:true});
  if(ui.group==='project')return projectGroups(tasks,card);
  if(ui.group==='work'){
    const groups=new Map();for(const t of tasks){const w=taskContext(data,t).work,key=w?.id||'';if(!groups.has(key))groups.set(key,{work:w,tasks:[]});groups.get(key).tasks.push(t);}
    return [...groups.values()].map(g=>`<section class="project-task-group"><h3 class="project-group-heading">${g.work?button(icon('briefcase')+esc(g.work.title),'detail',`data-type="work" data-id="${esc(g.work.id)}"`,'project-group-link'):'업무 없는 일'}</h3><div class="task-list">${g.tasks.map(card).join('')}</div></section>`).join('');
  }
  return tasks.map(card).join('');
}
function taskScreen(){
  if(ui.tab!=='calendar'&&['list','timeline'].includes(ui.view))return focus.screen();
  const sections=taskSections(data,ui.date,ui.completed),planned=sections.planned.filter(passes),overdue=sections.overdue.filter(passes);
  const overdueSection=overdue.length?`<section class="list-section overdue-section" aria-label="지연된 일정"><div class="section-heading"><h2>지연된 일정</h2></div><div class="task-list">${groupedTasks(overdue)}</div></section>`:'';
  return ['week','month'].includes(ui.view)?calendarView():`<div class="task-stack">${ui.view==='timeline'?`${timeline(planned)}${button(icon('plus'),'quick-add','aria-label="할 일 추가" title="할 일 추가"','quick-add')}${overdueSection}`:`<section class="list-section today-section" data-day-drop aria-label="${ui.date===today()?'오늘':short(ui.date)} 일정"><div class="task-list">${groupedTasks(planned)||'<p class="list-empty">할 일을 추가하거나 지연된 일정을 여기로 옮기세요.</p>'}</div>${button(icon('plus'),'quick-add','aria-label="할 일 추가" title="할 일 추가"','quick-add')}</section>${overdueSection}`}</div>`;
}
function timelineTask(task){
  const done=task.status==='done';
  return `<article class="timeline-task ${done?'is-done':''}"><input class="task-check" type="checkbox" data-complete="${esc(task.id)}" aria-label="${esc(task.title)} 완료" ${done?'checked':''}><button class="timeline-task-title" data-action="detail" data-type="task" data-id="${esc(task.id)}">${esc(task.title)}</button>${!done&&isDuePast(task,ui.date)?badge(dueLabel(task),'overdue'):''}${task.blocks.some(b=>b.date===ui.date&&deadlineConflict(task,b.date,b.end))?`<span class="schedule-warning" title="배치 시간이 실제 마감을 넘습니다" aria-label="배치 시간이 실제 마감을 넘습니다">${icon('info')}</span>`:''}</article>`;
}
function timeline(tasks){
  const scheduled=tasks.flatMap(t=>t.blocks.filter(b=>b.date===ui.date).map(b=>({t,b}))).sort((a,b)=>a.b.start.localeCompare(b.b.start));
  const unscheduled=tasks.filter(t=>!t.blocks.some(b=>b.date===ui.date));
  const now=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date());
  const marker=ui.date===today()?`<div class="now-line"><span>지금 ${now}</span><i></i></div>`:'';
  let marked=false;
  let rows=scheduled.map(({t,b})=>{
    let before='';if(!marked&&b.start>now){before=marker;marked=true;}
    return `${before}<div class="timeline-row ${today()===ui.date&&b.start<=now&&b.end>now?'current':''}">${button('<strong>'+b.start+'</strong><span>'+b.end+'</span>','time',`data-id="${esc(t.id)}" aria-label="${esc(t.title)} 시간 변경, ${b.start}부터 ${b.end}까지"`,'time-axis')}<div class="timeline-card">${timelineTask(t)}</div></div>`;
  }).join('');
  if(!rows)rows='<p class="list-empty">배치된 시간이 없습니다.</p>';else if(!marked)rows+=marker;
  return `<section class="timeline-section"><div class="timeline">${rows}</div></section>${unscheduled.length?`<section class="list-section"><div class="section-heading"><h2>시간 미정 <span class="count">${unscheduled.length}</span></h2></div><div class="timeline">${unscheduled.map(t=>`<div class="timeline-row">${button(icon('clock'),'time',`data-id="${esc(t.id)}" aria-label="${esc(t.title)} 시간 배치" title="시간 배치"`,'time-axis unscheduled-time')}<div class="timeline-card">${timelineTask(t)}</div></div>`).join('')}</div></section>`:''}`;
}
function calendarTasks(){return data.tasks.filter(t=>!t.deletedAt&&t.status!=='cancelled'&&(ui.completed||t.status!=='done')&&passes(t));}
function calendarView(){
  const monthly=ui.view==='month',days=workCalendarDays(ui.date,monthly),weeks=calendarWeeks(calendarTasks(),days,monthly?ui.monthLanes:Infinity,{plans:ui.calendarPlans,due:ui.calendarDue});
  const monthNav='';
  return `${monthNav}<div class="calendar-help"><label><input type="checkbox" data-calendar-layer="calendarPlans" ${ui.calendarPlans?'checked':''}>할 일정</label><label><input type="checkbox" data-calendar-layer="calendarDue" ${ui.calendarDue?'checked':''}>마감</label></div><div class="calendar-scroll"><div class="work-calendar connected-calendar ${monthly?'monthly':''}" style="--weeks:${weeks.length}"><div class="calendar-weekdays">${['일','월','화','수','목','금','토'].map(d=>`<div class="calendar-weekday">${d}</div>`).join('')}</div>${weeks.map(week=>`<div class="calendar-week" style="--lanes:${monthly?ui.monthLanes:Math.max(3,week.laneCount)}">${week.dates.map((date,index)=>`<section class="calendar-day ${date===today()?'is-today':''} ${monthly&&date.slice(0,7)!==ui.date.slice(0,7)?'outside':''}" style="grid-column:${index+1};--day-event-rows:${week.addRows[index]}" aria-label="${date}" data-calendar-date="${date}"><div class="calendar-day-heading"><button class="day-number" data-action="calendar-day" data-date="${date}" aria-label="${date} 할 일 보기">${Number(date.slice(8))}${date===today()?'<small>오늘</small>':''}</button>${week.hidden[index].length?button(icon('plus'),'calendar-more',`data-date="${date}" aria-label="${date} 일정 ${week.dayTasks[index].length}개 전체 보기" title="${week.hidden[index].length}개 더 보기" aria-haspopup="dialog"`,'calendar-more'):''}</div>${button(icon('plus'),'add',`data-date="${date}" aria-label="${date} 할 일 추가"`,'day-add')}</section>`).join('')}${week.segments.map(s=>{const t=s.task,range=week.dates[s.start]===week.dates[s.end]?week.dates[s.start]:`${week.dates[s.start]} ~ ${week.dates[s.end]}`,label=`${t.title} · ${range}${s.due?' · '+s.due+' 마감':''}`;return `<button class="calendar-event ${s.kind==='deadline'?'deadline-only':''} ${t.status==='done'?'is-done':''} ${s.continuesBefore?'continues-before':''} ${s.continuesAfter?'continues-after':''}" style="grid-column:${s.start+1} / ${s.end+2};grid-row:${s.lane+2}" data-action="calendar-event-detail" data-date="${week.dates[s.start]}" data-id="${esc(t.id)}" aria-label="${esc(label)}" title="${esc(label)}"><span>${esc(t.title)}</span>${s.due?`<small class="deadline">${s.start===s.end?'마감':short(s.due)+' 마감'}</small>`:''}</button>`;}).join('')}</div>`).join('')}</div></div>`;
}
function calendarDayDetails(date){
 ui.date=date;
 const tasks=calendarTasks().filter(t=>ui.calendarPlans&&isPlanned(t,date)||ui.calendarDue&&t.due===date);
 showEditor(editorFrame(`${fmt(date,{month:'long',day:'numeric',weekday:'short'})} · 할 일 ${tasks.length}`,`<div class="editor-body calendar-day-events">${tasks.map(t=>button(`<span>${esc(t.title)}</span><small>${t.due===date?'마감':t.blocks.some(b=>b.date===date)?t.blocks.filter(b=>b.date===date).map(b=>b.start+'–'+b.end).join(', '):'종일'}</small>`,'calendar-event-detail',`data-id="${esc(t.id)}"`,'calendar-day-event')).join('')||'<p>등록된 일정이 없습니다.</p>'}${button('+ 할 일 추가','calendar-add',`data-date="${date}"`,'small-button')}</div>`));
}
function workCard(w){
  const tasks=data.tasks.filter(t=>t.workId===w.id&&!t.deletedAt),done=tasks.filter(t=>t.status==='done').length;
  return `<button class="work-card compact-work" data-action="detail" data-type="work" data-id="${esc(w.id)}"><div class="work-card-body"><h3>${esc(w.title)}</h3>${w.stage?'<span class="work-stage">'+esc(w.stage)+'</span>':''}</div><span class="work-completion" aria-label="할 일 ${tasks.length}개 중 ${done}개 완료">${done}/${tasks.length}</span>${icon('chevron')}</button>`;
}
function worksScreen(){const list=data.works.filter(w=>!w.deletedAt&&(!ui.project||(ui.project==='standalone'?!w.projectId:w.projectId===ui.project))&&(!ui.work||w.id===ui.work)).filter(w=>[w.title,w.notes,...w.tags].join(' ').toLowerCase().includes(ui.search.toLowerCase()));return `<div class="work-project-groups">${projectGroups(list,workCard,'work-grid',w=>data.projects.find(p=>p.id===w.projectId))||'<p class="list-empty">표시할 업무가 없습니다.</p>'}</div>${button(icon('plus'),'add-work','aria-label="업무 추가" title="업무 추가"','quick-add')}`;}
function projectCard(p){
 const state=PROJECT_STATES.find(([v])=>v===projectState(p))[1],works=projectActiveWorks(data,p.id),rows=works.length?works:[null],span=rows.length;
 return rows.map((w,i)=>`<tr>${i?'':`<td rowspan="${span}" class="pl-status-cell"><span class="pl-status-badge" data-state="${projectState(p)}"><i aria-hidden="true"></i>${state}</span><select data-project-status="${esc(p.id)}" aria-label="${esc(p.title)} 현황" title="현황 변경">${PROJECT_STATES.map(([v,l])=>`<option value="${v}" ${projectState(p)===v?'selected':''}>${l}</option>`).join('')}</select></td><td rowspan="${span}" class="pl-text">${button(esc(p.title),'detail',`data-type="project" data-id="${esc(p.id)}" title="${esc(p.title)}"`,'pl-name')}</td>`}<td class="pl-text">${w?button(esc(w.title),'detail',`data-type="work" data-id="${esc(w.id)}" title="${esc(w.title)}"`,'pl-name'):'<span class="ux-empty">-</span>'}</td><td title="${esc(w?.due||'')}">${w?.due?short(w.due):'<span class="ux-empty">-</span>'}</td>${i?'':`<td rowspan="${span}" class="pl-end-cell" title="${esc(p.end||'')}">${p.end?short(p.end):'<span class="ux-empty">-</span>'}</td>`}</tr>`).join('');
}
function projectsScreen(){
 let ps=projectList(data.projects,ui.projectStates,['due','work'].includes(ui.projectSort)?'added':ui.projectSort,ui.projectDirection);
 if(['due','work'].includes(ui.projectSort))ps.sort((a,b)=>{const x=ui.projectSort==='due'?projectWorkDue(data,a.id):projectActiveWorks(data,a.id)[0]?.title,y=ui.projectSort==='due'?projectWorkDue(data,b.id):projectActiveWorks(data,b.id)[0]?.title;if(!x||!y)return x?-1:y?1:0;return x.localeCompare(y,'ko')*(ui.projectDirection==='desc'?-1:1);});
 const matchDate=(d,filter)=>!filter|| (filter==='none'?!d:filter==='today'?d===today():d&&d<today());
 ps=ps.filter(p=>(!ui.projectQuery||p.title.toLowerCase().includes(ui.projectQuery.toLowerCase()))&&(!ui.projectWorkQuery||projectActiveWorks(data,p.id).some(w=>w.title.toLowerCase().includes(ui.projectWorkQuery.toLowerCase())))&&matchDate(projectWorkDue(data,p.id),ui.projectDue)&&matchDate(p.end,ui.projectEnd));
 const label=ui.projectStates.length===4?'전체':PROJECT_STATES.filter(([v])=>ui.projectStates.includes(v)).map(([,l])=>l).join('·')||'선택 없음';
 const menu=(id,label,content,heading='',active=false)=>`<div data-dropdown>${button(heading?'<span>'+heading+'</span>'+icon('down')+(active?'<i class="tt-filter-dot"></i>':''):icon('sort'),'menu',`data-menu-toggle aria-haspopup="menu" aria-expanded="false" aria-controls="${id}" aria-label="${label}"`,heading?'pl-column':'icon-button')}<div id="${id}" class="surface-menu" data-menu-panel role="menu" aria-label="${label}" hidden>${content}</div></div>`;
 const sorts=[['name','프로젝트명순'],['added','추가순'],['work','업무명순'],['due','업무 마감일순'],['end','사업 종료일순']];
 const sortItems=keys=>sorts.filter(([v])=>keys.includes(v)).map(([v,l])=>button(l,'project-sort',`data-value="${v}" role="menuitemradio" aria-checked="${ui.projectSort===v}"`,'menu-option')).join('')+[['asc','오름차순'],['desc','내림차순']].map(([v,l])=>button(l,'project-direction',`data-value="${v}" role="menuitemradio" aria-checked="${ui.projectDirection===v}"`,'menu-option')).join('');
 const states=button('전체','project-filter',`data-value="all" role="menuitemcheckbox" aria-checked="${ui.projectStates.length===4?'true':ui.projectStates.length?'mixed':'false'}"`,'menu-option')+PROJECT_STATES.map(([v,l])=>button(l,'project-filter',`data-value="${v}" role="menuitemcheckbox" aria-checked="${ui.projectStates.includes(v)}"`,'menu-option')).join('');
 const dates=(field)=>[['','전체'],['today','오늘'],['overdue','지난 날짜'],['none','날짜 없음']].map(([v,l])=>button(l,field==='end'?'project-end-filter':'project-due-filter',`data-value="${v}" role="menuitemradio" aria-checked="${(ui[field==='end'?'projectEnd':'projectDue']||'')===v}"`,'menu-option')).join('')+sortItems([field]);
 return `<section class="project-overview"><header class="project-list-toolbar"><h2 aria-live="polite">${label} ${ps.length}개</h2><div class="project-list-actions">${menu('project-sort','프로젝트 정렬',sortItems(sorts.map(([v])=>v)))}${button(icon('plus'),'add-project','aria-label="프로젝트 추가"','icon-button')}</div></header><div class="project-list-scroll"><table class="pl-table pl-project-table" aria-label="프로젝트 목록"><colgroup><col style="width:82px"><col><col><col style="width:82px"><col style="width:94px"></colgroup><thead><tr><th scope="col" class="pl-status-heading">${menu('project-state-menu','프로젝트 현황 필터',states,'현황')}</th><th scope="col">${menu('project-name-menu','프로젝트 이름 정렬',`<input type="search" data-project-query aria-label="프로젝트 이름 검색" placeholder="프로젝트 검색" value="${esc(ui.projectQuery||'')}">`+sortItems(['name','added']),'프로젝트명',!!ui.projectQuery)}</th><th scope="col">${menu('project-work-menu','진행중인 업무 검색 및 정렬',`<input type="search" data-project-work-query aria-label="업무 이름 검색" placeholder="업무 검색" value="${esc(ui.projectWorkQuery||'')}">`+sortItems(['work']),'진행중인 업무',!!ui.projectWorkQuery)}</th><th scope="col">${menu('project-due-menu','업무 마감일 필터 및 정렬',dates('due'),'마감일',!!ui.projectDue)}</th><th scope="col">${menu('project-end-menu','사업 종료일 필터 및 정렬',dates('end'),'사업 종료일',!!ui.projectEnd)}</th></tr></thead><tbody>${ps.map(projectCard).join('')||'<tr><td colspan="5" class="pl-empty">조건에 맞는 프로젝트가 없습니다.</td></tr>'}</tbody></table></div></section>`;
}
function personalScreen(){const days=ui.view==='month'?monthDays(ui.date):weekDays(ui.date),trackNames=['물 마시기','운동','독서'];return `<div class="page-heading"><div><div class="overline">PERSONAL / ${ui.view==='month'?'MONTH':'WEEK'}</div><h1>나의 ${ui.view==='month'?'한 달':'한 주'}</h1><p>일상도, 나를 위한 시간도 한눈에.</p></div><div class="view-tabs">${button('주간','personal-view','data-value="week"',ui.view!=='month'?'view-tab active':'view-tab')}${button('월간','personal-view','data-value="month"',ui.view==='month'?'view-tab active':'view-tab')}${button('트래커','tracker','','view-tab')}</div></div><div class="personal-notice">${icon('info')}개인 화면은 연결 전 구성 미리보기입니다. <a href="https://oyoo0029.github.io/SUB/schedule.html?v=990fa1e" target="_blank" rel="noopener">기존 일정 열기 ${icon('arrow')}</a></div>${ui.view==='month'?`<div class="calendar-scroll"><div class="work-calendar monthly">${['월','화','수','목','금','토','일'].map(d=>`<div class="calendar-weekday">${d}</div>`).join('')}${days.map(date=>`<section class="calendar-day ${date===today()?'is-today':''}"><span class="day-number">${Number(date.slice(8))}</span>${data.personal.filter(e=>e.date===date).map(eventButton).join('')}</section>`).join('')}</div></div>`:`<div class="calendar-scroll"><div class="personal-calendar"><div class="row-label"></div>${days.map(d=>`<div class="personal-day ${d===today()?'is-today':''}"><span>${fmt(d,{weekday:'short'})}</span><strong>${Number(d.slice(8))}</strong></div>`).join('')}<div class="row-label">트래커</div>${days.map(d=>`<div class="tracker-cell">${trackNames.map((t,i)=>`<button data-action="track" data-date="${d}" data-index="${i}" class="tracker-dot ${data.tracker[d+'-'+i]?'checked':''}" aria-label="${d} ${t}" aria-pressed="${!!data.tracker[d+'-'+i]}">${icon(['leaf','sun','note'][i])}</button>`).join('')}</div>`).join('')}${[['am','오전','sun'],['pm','오후','sun'],['eve','저녁','moon']].map(([period,label,i])=>`<div class="row-label">${icon(i)}${label}</div>${days.map(d=>`<div class="personal-slot ${d===today()?'today-slot':''}">${period!=='eve'&&dateObj(d).getUTCDay()>0&&dateObj(d).getUTCDay()<6?'<div class="routine-event"><strong>회사</strong><span>09:00 – 18:00</span></div>':''}${data.personal.filter(e=>e.date===d&&e.period===period).map(eventButton).join('')}</div>`).join('')}`).join('')}</div></div>`}`;}
function eventButton(e){return `<button class="calendar-event personal-event" data-action="event" data-id="${e.id}"><strong>${esc(e.title)}</strong><span>${esc(e.time)}</span></button>`;}
function viewButtons(){const views=ui.tab==='calendar'?[['week','주간'],['month','월간']]:[['list','목록'],['timeline','시간순']];return `<div class="view-tabs" role="group" aria-label="보기 선택">${views.map(([v,l])=>button(l,'view',`data-value="${v}" aria-pressed="${ui.view===v}"`,'view-tab'+(ui.view===v?' active':''))).join('')}</div>`;}
const searchScopes=[['all','전체'],['projects','프로젝트'],['works','업무 묶음'],['tasks','할 일']];
const screens=[['projects','프로젝트'],['works','업무 묶음'],['tasks','할 일']];
function menuItems(items,value,action,extra=''){
  return items.map(([id,label])=>button(esc(label),action,`data-value="${esc(id)}" ${extra} role="menuitemradio" aria-checked="${value===id}" title="${esc(label)}"`,'menu-option'+(value===id?' selected':''))).join('');
}
function searchPanel(){
  if(!ui.searchOpen)return button(icon('search'),'toggle-search','aria-label="검색" title="검색" aria-expanded="false"','icon-button');
  return `<div class="header-search" role="search" aria-label="전체 조회"><div class="search-scope-dropdown" data-dropdown>${button(esc(searchScopes.find(([v])=>v===ui.searchScope)[1])+icon('chevron'),'menu', 'data-menu-toggle aria-haspopup="menu" aria-expanded="false" aria-controls="search-scope-menu" aria-label="검색 범위"','search-scope-toggle')}<div id="search-scope-menu" class="surface-menu scope-menu" data-menu-panel role="menu" aria-label="검색 범위 선택" hidden>${menuItems(searchScopes,ui.searchScope,'search-scope')}</div></div><input id="search" type="search" placeholder="검색어 입력" aria-label="검색어" value="${esc(ui.search)}" autocomplete="off">${button(icon('close'),'clear-search',`aria-label="${ui.search?'검색어 지우기':'검색 닫기'}" title="${ui.search?'검색어 지우기':'검색 닫기'}"`,'search-clear')}${button(icon('search'),'focus-search','aria-label="검색 실행" title="검색"','search-submit')}</div>`;
}
function searchScreen(){
  const results=searchEntities(data,ui.search,ui.searchScope,ui);
  return `<section class="search-results" aria-label="검색 결과"><div class="section-heading"><h2>검색 결과 <span class="count">${results.length}</span></h2><span class="section-hint">전체 날짜</span></div>${results.map(({type,item})=>{const context=type==='task'?taskContext(data,item):type==='work'?{project:data.projects.find(p=>p.id===item.projectId)}:{};return `<button class="search-result" data-action="detail" data-type="${type}" data-id="${esc(item.id)}"><span class="result-kind">${{task:'할 일',work:'업무',project:'프로젝트'}[type]}</span><span class="result-content"><strong>${esc(item.title)}</strong>${context.project||context.work?`<small>${esc([context.project?.title,context.work?.title].filter(Boolean).join(' / '))}</small>`:''}</span>${icon('chevron')}</button>`;}).join('')||'<p class="list-empty">검색 결과가 없습니다.</p>'}</section>`;
}
function workspaceOptions(compact=false){
  const projects=[['','전체'],...data.projects.filter(p=>!p.deletedAt).map(p=>[p.id,p.title]),['standalone','프로젝트 없음']];
  const works=[['','전체'],...data.works.filter(w=>!w.deletedAt&&(!ui.project||(ui.project==='standalone'?!w.projectId:w.projectId===ui.project))).map(w=>[w.id,w.title]),['standalone','업무 없음']];
  const groups=[['none','묶지 않음'],['project','프로젝트별'],['work','업무 묶음별']];
  const states=[['active','미완료'],['all','완료 포함'],['done','완료만'],['paused','보류만']];
  const row=(key,label,items,value)=>`<div class="submenu-row">${button('<span>'+label+'</span>'+icon('chevron'),'menu',`data-menu-toggle data-menu-hover aria-haspopup="menu" aria-expanded="false" aria-controls="filter-${key}-menu" aria-label="${label} 필터"`,'menu-parent'+(value&&value!=='active'&&value!=='none'?' selected':''))}<div id="filter-${key}-menu" class="surface-menu submenu" data-menu-panel data-submenu role="menu" aria-label="${label} 선택" hidden>${menuItems(items,value,'apply-filter',`data-filter="${key}"`)}</div></div>`;
  return `<div id="filter-menu" class="surface-menu filter-menu" data-menu-panel role="menu" aria-label="필터 옵션 메뉴" hidden>${row('project','프로젝트',projects,ui.project)}${row('work','업무 묶음',works,ui.work)}${row('status','할 일 상태',states,ui.status)}${!compact&&ui.view==='timeline'?row('group','목록 묶기',groups,ui.group):''}${data.dailyOrder?.[ui.date]?button('자동 정렬','auto-sort','role="menuitem"','menu-option menu-reset'):''}${button('초기화','clear-filters','role="menuitem"','menu-option menu-reset')}</div>`;
}
function workspaceActions(compact=false){
 const filtered=ui.project||ui.work||ui.status!=='active'||ui.group!=='none';
 return `<div class="workspace-actions"><div data-dropdown>${button(icon('filter')+(filtered?'<i class="filter-dot"></i>':''),'menu','data-menu-toggle aria-haspopup="menu" aria-expanded="false" aria-controls="filter-menu" aria-label="필터 옵션"','filter-toggle')}${workspaceOptions(compact)}</div></div>`;
}
function bodyScreen(){if(!workAccount.owner)return '<div class="list-empty">로그인하면 계정에 저장된 업무가 표시됩니다.</div>';return ui.mode==='personal'?personalScreen():ui.search.trim()?searchScreen():ui.tab==='works'?worksScreen():ui.tab==='projects'?(ui.projectPage?flow.projectPage():projectsScreen()):taskScreen();}
function updateCountdown(){const el=$('#leave-count');if(el)el.textContent=countdown();}
function render({keepMenus=false}={}){
 focus.rollover();
 const projectGrid=$('.project-overview .project-list-scroll');
 if(projectListScroll.owner!==workAccount.owner)projectListScroll={owner:workAccount.owner,top:0};
 else if(projectGrid)projectListScroll.top=projectGrid.scrollTop;
 const folds=new Map([...document.querySelectorAll('details[data-fold]')].map(d=>[d.dataset.fold,d.open]));
  const menus=keepMenus?[...document.querySelectorAll('[data-menu-panel]:not([hidden])')].map(el=>el.id):[];
  const filtered=ui.project||ui.work||ui.status!=='active'||ui.group!=='none';
  $('#app').innerHTML=`<header class="app-header new-header ${ui.searchOpen&&ui.mode==='work'?'search-expanded':''}"><div class="header-inner"><div class="header-start"><div class="mode-switch planner-switch" role="group" aria-label="개인 업무 전환">${button(icon('home'),'mode',`data-value="personal" aria-label="개인" title="개인" aria-pressed="${ui.mode==='personal'}"`,'mode planner-mode'+(ui.mode==='personal'?' active':''))}${button(icon('briefcase'),'mode',`data-value="work" aria-label="업무" title="업무" aria-pressed="${ui.mode==='work'}"`,'mode planner-mode'+(ui.mode==='work'?' active':''))}</div>${ui.mode==='work'&&ui.date===today()?`<span class="leave-countdown">퇴근까지 <strong id="leave-count">${countdown()}</strong></span>`:''}</div><div class="header-actions">${ui.mode==='work'?searchPanel()+`<button type="button" class="icon-button reminder-bell" data-reminder-bell aria-label="리마인드" title="리마인드" aria-haspopup="dialog" aria-controls="reminder-popover" aria-expanded="false">${icon('bell')}<span class="reminder-count" data-reminder-count hidden></span></button>`:''}${button(icon('users'),'cloud-open','aria-label="계정 · 동기화" title="계정 · 동기화"','icon-button')}${button(icon('more'),'settings','aria-label="설정" title="설정"','icon-button')}</div></div></header><main class="main"><div id="work-account-notice"></div>${ui.saveWarning?`<div class="save-warning" role="alert">${esc(ui.saveWarning)} ${button('다시 저장','retry-save','','text-button')} ${button('내보내기','export','','text-button')}</div>`:''}<div class="workspace new-workspace ${ui.tab==='projects'?'projects-workspace':''}">${flow.nav()}${ui.mode==='work'&&ui.tab==='calendar'?`<nav class="workspace-nav" aria-label="업무 메뉴">${viewButtons()}<div class="date-navigation">${button(icon('left'),'prev','aria-label="이전 날짜"','icon-button')}<label class="date-label" title="${fmt(ui.date,{year:'numeric',month:'long',day:'numeric',weekday:'short'})}">${ui.view==='month'?fmt(ui.date,{year:'numeric',month:'long'}):short(ui.date)}<input id="date-picker" type="date" value="${ui.date}" aria-label="기준 날짜 선택"></label>${button(icon('chevron'),'next','aria-label="다음 날짜"','icon-button')}${ui.date!==today()?button('오늘','today','','today-button'):''}</div>${workspaceActions()}</nav>`:''}<div class="workspace-content">${bodyScreen()}</div></div>${focus.overlays()}</main>`;
 document.querySelectorAll('details[data-fold]').forEach(d=>{if(folds.has(d.dataset.fold))d.open=folds.get(d.dataset.fold);});
 const restoredProjectGrid=$('.project-overview .project-list-scroll');if(restoredProjectGrid)restoredProjectGrid.scrollTop=projectListScroll.top;
  requestAnimationFrame(fitMonthCalendar);
  if(menus.length)surfaces.restore(menus);reminders.refresh();window.dispatchEvent(new Event('my-week-render'));
}
function property(label,i,value){return `<div class="property-row"><dt>${icon(i)}${label}</dt><dd>${value||'<span class="muted">미정</span>'}</dd></div>`;}
function openDetail(type,id){if(type==='project'){if($('#detail').open)$('#detail').close();ui.detail=null;ui.tab='projects';ui.projectPage=id;ui.projectPageTab='tasks';ui.projectTaskFilter='all';ui.projectDetailQuery='';ui.projectDetailDue='';ui.projectAdd=null;ui.search='';render();return;}detailUI.open(type,id);}
function renderDetail(){detailUI.render();}
function inputField(label,name,value='',type='text',attrs=''){return `<label class="form-field"><span>${label}</span><input name="${name}" type="${type}" value="${esc(value)}" ${attrs}></label>`;}
function selectField(label,name,options){return `<label class="form-field"><span>${label}</span><select name="${name}">${options}</select></label>`;}
function showEditor(html){$('#editor').innerHTML=html;if(!$('#editor').open)$('#editor').showModal();}
function editorFrame(title,body,footer=''){return `<header class="editor-header"><h2 id="editor-title">${title}</h2>${button(icon('close'),'close-editor','type="button" aria-label="닫기"','icon-button')}</header>${body}${footer}`;}
function editEntity(type='task',id=null,opts={}){if(!workAccount.owner){window.dispatchEvent(new Event('my-week-login-request'));return;}if(id)openDetail(type,id);else detailUI.create(type,opts);}
function timeEditor(id){detailUI.timeEditor(id);}
function settings(){showEditor(editorFrame('설정',`<div class="editor-body"><section><h3>계정과 동기화</h3><p class="form-help">개인 일정과 같은 계정으로 업무를 저장합니다.</p><button class="small-button" data-action="cloud-open"><span data-cloud-label>계정 · 동기화</span></button><p class="work-cloud-status" data-cloud-status></p></section><section class="detail-section"><h3>업무 데이터</h3><div class="settings-actions">${button(icon('download')+'JSON 내보내기','export','','small-button')}<button class="small-button" data-open-work-import>업무 백업 가져오기</button><button class="small-button" data-migrate-work-images>기존 이미지 별도 저장</button>${button(icon('trash')+'휴지통','trash','','small-button')}</div></section><section class="detail-section"><a class="property-link" href="../schedule.html">개인 일정 열기 ${icon('arrow')}</a></section></div>`,`<footer class="editor-footer">${button('닫기','close-editor','','small-button')}</footer>`));window.dispatchEvent(new Event('my-week-render'));}
function trash(){detailUI.trash();}
function tracker(){const days=monthDays(ui.date).filter(d=>d.slice(0,7)===ui.date.slice(0,7));showEditor(editorFrame(`${fmt(ui.date,{month:'long'})} 트래커`,`<div class="editor-body"><p class="form-help">날짜별 버튼을 눌러 기록하고 취소할 수 있어요.</p>${['물 마시기','운동','독서'].map((name,i)=>`<section class="tracker-section"><h3>${name} <span class="count">${days.filter(d=>data.tracker[d+'-'+i]).length}일</span></h3><div class="tracker-month">${days.map(d=>`<button class="tracker-date ${data.tracker[d+'-'+i]?'checked':''}" data-action="track-month" data-date="${d}" data-index="${i}" aria-label="${d} ${name}" aria-pressed="${!!data.tracker[d+'-'+i]}">${Number(d.slice(8))}</button>`).join('')}</div></section>`).join('')}</div>`));}
async function download(){try{const portable=await workImages.portable(data);const blob=new Blob([JSON.stringify(portable,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`what-to-do-work-${today()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('업무 데이터를 내보냈어요.');}catch(error){toast(error.message||'백업하지 못했습니다.');}}

const detailUI=createDetailUI({getData:()=>data,ui,esc,icon,button,property,taskCard,workCard,notify:toast,save:(refresh=true)=>{if(!workAccount.owner)return;const ok=saveState(data);ui.saveWarning=ok?'':'저장하지 못했습니다. 입력 내용은 현재 창에 유지됩니다.';if(refresh)render();}});

document.addEventListener('click',event=>{
  const el=event.target.closest('[data-action]');if(!el)return;const a=el.dataset.action,id=el.dataset.id;
  if(a==='submit-check')return;
  event.preventDefault();
  if(a==='mode'){if(el.dataset.value==='personal'){location.href='../schedule.html';return;}ui.mode=el.dataset.value;ui.view=ui.mode==='personal'?'week':'list';ui.search='';render();}
  else if(a==='project-filter'){const v=el.dataset.value;ui.projectStates=v==='all'?(ui.projectStates.length===4?[]:PROJECT_STATES.map(([k])=>k)):ui.projectStates.includes(v)?ui.projectStates.filter(k=>k!==v):[...ui.projectStates,v];render({keepMenus:true});document.querySelector(`[data-action="project-filter"][data-value="${v}"]`)?.focus();}
  else if(a==='project-sort'||a==='project-direction'){ui[a==='project-sort'?'projectSort':'projectDirection']=el.dataset.value;render({keepMenus:true});document.querySelector(`[data-action="${a}"][data-value="${el.dataset.value}"]`)?.focus();}
  else if(a==='retry-save'){persist('다시 저장했습니다.');}
  else if(a==='navigate'){if($('#detail').open)$('#detail').close();ui.tab=el.dataset.value;ui.projectPage=null;ui.completed=false;ui.search='';ui.project='';ui.work='';ui.status='active';ui.group='none';ui.view=ui.tab==='calendar'?'week':'list';if(ui.tab==='tasks')ui.date=today();render();}
  else if(a==='open-project')openDetail('project',id);
  else if(a==='project-back'){ui.projectPage=null;render();}
  else if(a==='project-page-tab'){ui.projectPageTab=el.dataset.value;render();}
  else if(a==='project-due-filter'){ui.projectDue=el.dataset.value;render({keepMenus:true});}
  else if(a==='project-add-toggle'){ui.projectAdd=el.dataset.workId||'general';render();document.querySelector('[data-flow-add] input')?.focus();}
  else if(a==='project-add-cancel'){ui.projectAdd=null;render();}
  else if(a==='project-end-filter'){ui.projectEnd=el.dataset.value;render({keepMenus:true});}
  else if(a==='project-detail-sort'){ui.projectDetailSort=el.dataset.value;render({keepMenus:true});}
  else if(a==='project-detail-direction'){ui.projectDetailDirection=el.dataset.value;render({keepMenus:true});}
  else if(a==='project-detail-due'){ui.projectDetailDue=el.dataset.value;render({keepMenus:true});}
  else if(a==='project-task-filter'){ui.projectTaskFilter=el.dataset.value;render({keepMenus:true});}
  else if(a==='project-info-edit')detailUI.open('project',id);
  else if(a==='do-today'){const t=findTask(id),before=structuredClone(t);planToday(t,today());persist('오늘 할 일에 추가했습니다.',()=>{Object.assign(t,before);persist('이전 계획으로 되돌렸습니다.');});}
  else if(a==='pin-next'){const p=data.projects.find(p=>p.id===el.dataset.projectId);p.nextTaskId=p.nextTaskId===id?null:id;persist(p.nextTaskId?'다음 할 일로 지정했습니다.':'지정을 해제했습니다.');}
  else if(a==='unschedule'){const t=findTask(id),before=structuredClone(t);removeFromDay(t,ui.date);persist('선택한 날에서 뺐습니다. 할 일과 마감일은 유지됩니다.',()=>{Object.assign(t,before);persist('일정을 복원했습니다.');});}
  else if(a==='order-task')moveMenu(id);
  else if(a==='reschedule'){const t=findTask(id),from=el.dataset.from||ui.date;showEditor(editorFrame('할 날짜 변경',`<form data-reschedule="${esc(id)}" data-from="${from}"><div class="editor-body"><p>${esc(t.title)}</p><label class="form-field">할 날짜<input type="date" name="date" value="${from}" required aria-label="새 할 날짜"></label><p class="form-help">선택한 날의 계획과 지정 시간을 이동합니다. 마감일은 바뀌지 않습니다.</p><p class="form-error" role="alert"></p></div><footer class="editor-footer"><button type="submit" class="small-button">이동</button></footer></form>`));}
  else if(a==='tab'){ui.tab=el.dataset.value;ui.search='';render();}
  else if(a==='view'||a==='personal-view'){ui.view=el.dataset.value;render();}
  else if(['today','prev','next'].includes(a)){const direction=a==='prev'?-1:1,step=ui.view==='week'||ui.mode==='personal'?7:1;ui.date=a==='today'?today():ui.view==='month'?addMonths(ui.date,direction):addDays(ui.date,direction*step);render();}
  else if(a==='home'){ui.mode='work';ui.tab='tasks';ui.view='list';ui.date=today();ui.search='';ui.project='';render();}
  else if(a==='calendar-day')calendarDayDetails(el.dataset.date);
  else if(a==='calendar-more')calendarDayDetails(el.dataset.date);
  else if(a==='calendar-add'){$('#editor').close();editEntity('task',null,{date:el.dataset.date});}
  else if(a==='calendar-event-detail'){$('#editor').close();if(el.dataset.date)ui.date=el.dataset.date;openDetail('task',id);}
  else if(a==='toggle-tools'){ui.tools=!ui.tools;render();}
  else if(a==='toggle-search'){ui.searchOpen=!ui.searchOpen;if(!ui.searchOpen)ui.search='';render();if(ui.searchOpen)$('#search').focus();}
  else if(a==='close-search'){ui.searchOpen=false;ui.search='';render();$('[data-action="toggle-search"]')?.focus();}
  else if(a==='clear-search'){if(ui.search){ui.search='';render();$('#search').focus();}else{ui.searchOpen=false;render();$('[data-action="toggle-search"]')?.focus();}}
  else if(a==='focus-search')$('#search').focus();
  else if(a==='select-screen'){ui.tab=el.dataset.value;ui.search='';render();$('[aria-controls="screen-menu"]')?.focus();}
  else if(a==='apply-filter'){const key=el.dataset.filter;ui[key]=el.dataset.value;if(key==='project')ui.work='';if(key==='status')ui.completed=['all','done'].includes(ui.status);render({keepMenus:true});$(`#filter-${key}-menu [aria-checked="true"]`)?.focus();}
  else if(a==='search-scope'){ui.searchScope=el.dataset.value;render();$('#search').focus();}
  else if(a==='clear-filters'){ui.project='';ui.work='';ui.status='active';ui.group='none';ui.completed=false;render({keepMenus:true});$('[data-action="clear-filters"]')?.focus();}
  else if(a==='auto-sort'){if(data.dailyOrder)delete data.dailyOrder[ui.date];persist('시간 → 마감순으로 정렬했습니다.',null,true);$('[aria-controls="filter-menu"]')?.focus();}
  else if(a==='drag-handle')moveMenu(el.dataset.dragTask);
  else if(a==='detail')openDetail(el.dataset.type,id);
  else if(a==='close-detail'){$('#detail').close();ui.detail=null;}
  else if(a==='close-editor')$('#editor').close();
  else if(a==='add')editEntity('task',null,{date:el.dataset.date,workId:el.dataset.workId,projectId:el.dataset.projectId});
  else if(a==='add-work')editEntity('work',null,{projectId:el.dataset.projectId});
  else if(a==='add-project')editEntity('project');
  else if(a==='edit')editEntity(el.dataset.type,id);
  else if(a==='time')timeEditor(id);
  else if(a==='remove-time'){removeTime(findTask(id),ui.date);$('#editor').close();persist('시간 배치를 해제했어요. 할 일은 그대로 유지됩니다.');}
  else if(a==='plan'){const t=findTask(id),before=structuredClone(t);planToday(t,ui.date);persist('선택한 날짜의 일정에 추가했습니다.',()=>{Object.assign(t,before);persist('이전 계획으로 되돌렸어요.');});}
  else if(a==='delete-task'){const t=findTask(id);t.deletedAt=new Date().toISOString();$('#detail').close();ui.detail=null;persist('휴지통으로 옮겼어요.',()=>{t.deletedAt=null;persist('할 일을 복구했어요.');});}
  else if(a==='restore'){findTask(id).deletedAt=null;persist('할 일을 복구했어요.');trash();}
  else if(a==='settings')settings();else if(a==='trash')trash();else if(a==='export')download();else if(a==='tracker')tracker();
  else if(a==='track'||a==='track-month'){const k=el.dataset.date+'-'+el.dataset.index;data.tracker[k]=!data.tracker[k];persist(data.tracker[k]?'기록했어요.':'기록을 취소했어요.');if(a==='track-month')tracker();}
  else if(a==='event'){const e=data.personal.find(e=>e.id===id);showEditor(editorFrame(esc(e.title),`<div class="editor-body"><dl class="properties">${property('날짜','calendar',fmt(e.date))}${property('시간','clock',esc(e.time))}${property('시간대','sun',{am:'오전',pm:'오후',eve:'저녁'}[e.period])}</dl><p class="form-help">기존 데이터에 영향을 주지 않는 개인 일정 샘플입니다.</p></div>`));}
  else if(a==='undo'&&undoFn){const fn=undoFn;undoFn=null;fn();}
});
document.addEventListener('change',async event=>{
  const el=event.target;
  if(el.matches('[data-project-task-status]')){ui.projectTaskFilter=el.value;render();document.querySelector('[data-project-task-status]')?.focus();}
  else if(el.matches('[data-calendar-layer]')){ui[el.dataset.calendarLayer]=el.checked;render();}
  else if(el.matches('[data-complete]')){const t=findTask(el.dataset.complete),before=structuredClone(t);complete(t,today());persist(t.status==='done'?'완료했습니다.':'다시 할 일로 바꿨어요.',()=>{Object.assign(t,before);persist('완료 변경을 되돌렸어요.');});}
  else if(el.matches('[data-check]')){changeCheck(data,el.dataset.taskId,el.dataset.check,{done:el.checked});persist('확인사항을 저장했어요.');}
  else if(el.id==='show-completed'){ui.completed=el.checked;ui.status=el.checked?'all':'active';render();}
  else if(el.id==='project-filter'){ui.project=el.value;ui.work='';render();}
  else if(el.id==='work-filter'){ui.work=el.value;render();}
  else if(el.id==='status-filter'){ui.status=el.value;ui.completed=['all','done'].includes(ui.status);render();}
  else if(el.id==='group-filter'){ui.group=el.value;render();}
  else if(el.id==='screen-select'){ui.tab=el.value;ui.search='';render();}
  else if(el.id==='date-picker'&&el.value){ui.date=el.value;render();}
  else if(el.id==='import-file'&&el.files[0]){
    try{if(el.files[0].size>5*1024*1024)throw new Error('5MB 이하의 백업 파일을 선택해 주세요.');const incoming=validate(JSON.parse(await el.files[0].text()));const previous=structuredClone(data);data=incoming;$('#editor').close();persist('백업 파일을 불러왔어요. 이전 내용은 되돌릴 수 있습니다.',()=>{data=previous;persist('가져오기 전으로 되돌렸어요.');});}catch(error){toast(error.message||'백업 파일을 읽지 못했습니다.');el.value='';}
  }
});
document.addEventListener('input',event=>{if(event.target.id==='search'){ui.search=event.target.value;$('.workspace-content').innerHTML=bodyScreen();const clear=$('[data-action="clear-search"]');clear.setAttribute('aria-label',ui.search?'검색어 지우기':'검색 닫기');clear.title=ui.search?'검색어 지우기':'검색 닫기';}});
document.addEventListener('keydown',event=>{if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'&&!document.querySelector('dialog[open]')){event.preventDefault();ui.mode='work';ui.searchOpen=true;render();$('#search').focus();}if(event.key==='Escape'&&event.target.id==='search'){ui.searchOpen=false;ui.search='';render();$('[data-action="toggle-search"]').focus();}if(event.key==='n'&&!event.target.isContentEditable&&!/INPUT|TEXTAREA|SELECT/.test(event.target.tagName)&&!$('#detail').open&&!$('#editor').open)editEntity(ui.tab==='works'?'work':ui.tab==='projects'?'project':'task');});
$('#detail').addEventListener('close',()=>{ui.detail=null;});
for(const dialog of [$('#detail'),$('#editor')])dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
function moveTask(id,before){
  const task=findTask(id),previous=structuredClone(task),order=structuredClone(data.dailyOrder||{}),grouped=ui.group!=='none';
  moveToDay(data,ui.date,id,before);ui.group='none';
  persist(grouped?'묶기를 해제하고 수동 순서로 이동했습니다.':'일정으로 이동했습니다. 이 날짜는 수동 순서입니다.',()=>{Object.assign(task,previous);data.dailyOrder=order;persist('이동을 되돌렸습니다.');});
}
function moveMenu(id){
  const items=taskSections(data,ui.date,true).planned.filter(t=>t.id!==id);
  showEditor(editorFrame('일정으로 이동',`<form data-move-form="${esc(id)}"><div class="editor-body"><p>${esc(findTask(id).title)}</p><label class="form-field"><span>${short(ui.date)} 일정에서의 위치</span><select name="before" aria-label="이동할 위치">${items.map(t=>`<option value="${esc(t.id)}">${esc(t.title)} 앞</option>`).join('')}<option value="">맨 아래</option></select></label><p class="form-help">마감일과 배치 시간은 유지됩니다. 이 날짜의 목록만 수동 순서로 바뀝니다.</p></div><footer class="editor-footer"><button type="submit" class="small-button">이동</button></footer></form>`));
}
document.addEventListener('submit',event=>{if(!event.target.matches('[data-move-form]'))return;event.preventDefault();const form=event.target;$('#editor').close();moveTask(form.dataset.moveForm,new FormData(form).get('before')||null);});
installTaskDrag(moveTask);
const surfaces=installSurfaceInteractions();
installTableResize();
let reminderAccountReady=false;
const reminders=createReminderCenter({getData:()=>data,getScope:()=>workAccount.owner,isReady:()=>reminderAccountReady,esc,icon,
 onOpen:id=>openDetail('task',id),
 onAcknowledge(task,date){const previous=task.reminderAcknowledgedOn;task.reminderAcknowledgedOn=date;saveReminderChange('오늘 리마인드를 확인했습니다.',()=>{const current=findTask(task.id);if(!current)return;current.reminderAcknowledgedOn=previous;saveReminderChange('리마인드를 다시 표시합니다.');});},
 onPlan(task,date){const before=structuredClone(task);planToday(task,date);persist('오늘 일정에 추가했습니다.',()=>{const current=findTask(task.id);if(!current)return;current.plans=before.plans;persist('이전 계획으로 되돌렸어요.');});}
});
function saveReminderChange(message,undo){const ok=saveState(data);if(!ok){ui.saveWarning='기기에 저장하지 못했습니다. 내보내기로 현재 내용을 보관해 주세요.';render();}reminders.refresh({auto:false});toast(ok?message:'저장하지 못했습니다. 현재 창에 내용은 유지됩니다.',undo);}

render();
window.addEventListener('click',event=>{if(!workAccount.owner&&event.target.closest('.workspace-content')){event.preventDefault();event.stopImmediatePropagation();window.dispatchEvent(new Event('my-week-login-request'));}},true);
const workCloud=startWorkCloud({save:()=>saveState(data),getData:()=>data,replaceData:value=>{data=value;ui.saveWarning='';render();},notify:toast,
 onStatus(kind){ui.cloudStatus=kind;document.querySelectorAll('[data-save-state]').forEach(el=>el.textContent=kind==='online'?'저장됨':kind==='error'?'동기화 실패 · 재시도 필요':kind==='offline'?'기기에 저장됨 · 연결 후 동기화':kind==='conflict'?'다른 기기 변경 확인 필요':kind==='waiting'?'기기에 저장됨 · 동기화 대기':'동기화 중');if(workAccount.owner&&['online','error','offline','conflict'].includes(kind))reminderAccountReady=true;reminders.refresh();},
 resetEditors(){focus.resetPanels();reminderAccountReady=false;reminders.close();clearTimeout(toastTimer);undoFn=null;ui.detail=null;ui.search='';ui.project='';ui.work='';ui.status='active';ui.group='none';document.querySelectorAll('dialog[open]:not(#cloud-dialog)').forEach(dialog=>{dialog.dataset.skipCloseSave='true';dialog.close();});document.body.classList.remove('task-dragging','dragging-reminders');},
 download(text,name){const url=URL.createObjectURL(new Blob([text],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
});
setInterval(()=>{updateCountdown();reminders.refresh();if(!focus.busy()&&!reminders.isOpen()&&ui.mode==='work'&&ui.tab==='tasks'&&!ui.search&&!document.querySelector('dialog[open]')&&!document.body.classList.contains('task-dragging')&&!document.body.classList.contains('dragging-reminders')&&!document.querySelector('[data-menu-panel]:not([hidden]),[data-quick-task],[data-check-form]:not([hidden])')&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName))render();},60000);

window.addEventListener('message',event=>{if(event.origin!==location.origin||event.source!==parent||event.data?.type!=='planner-home')return;Object.assign(ui,{mode:'work',tab:'tasks',view:'list',date:today(),completed:false,search:'',searchOpen:false,project:'',work:'',status:'active',group:'none',tools:false});document.querySelectorAll('dialog[open]').forEach(d=>d.close());render();});

function fitMonthCalendar(){
 const calendar=document.querySelector('.connected-calendar.monthly');if(!calendar||calendar.clientHeight===0)return;
 const count=calendar.querySelectorAll('.calendar-week').length;
 const lanes=monthLaneCapacity(calendar.clientHeight,count);
 if(lanes!==ui.monthLanes){ui.monthLanes=lanes;render();}
}
window.addEventListener('resize',()=>requestAnimationFrame(fitMonthCalendar));

document.addEventListener('submit',event=>{
 const form=event.target;if(!form.matches('[data-flow-add],[data-reschedule]'))return;event.preventDefault();
 if(!workAccount.owner){window.dispatchEvent(new Event('my-week-login-request'));return;}
 try{const f=new FormData(form);if(form.hasAttribute('data-flow-add')){const p=form.dataset.projectId,w=form.dataset.workId;createItem(data,'task',String(f.get('title')),{projectId:p||null,workId:w||null,date:p||w?null:ui.date});ui.projectAdd=null;persist('할 일을 추가했습니다.');const target=document.querySelector(`[data-flow-add][data-project-id="${p}"][data-work-id="${w}"] input`);target?.focus();}
 else{const t=findTask(form.dataset.reschedule),before=structuredClone(t),date=String(f.get('date'));moveTaskDate(t,form.dataset.from,date);$('#editor').close();persist('할 날짜를 변경했습니다.'+(t.due&&date>t.due?' 마감일 이후로 배치되었습니다.':''),()=>{Object.assign(t,before);persist('날짜 변경을 되돌렸습니다.');});}}
 catch(err){form.querySelector('.form-error').textContent=err.message;}
});

window.addEventListener('work-open-project',event=>openDetail('project',event.detail));

document.addEventListener('keydown',event=>{if(!event.target.closest('[data-flow-add]'))return;if(event.key==='Enter'&&(event.isComposing||event.keyCode===229))event.preventDefault();if(event.key==='Escape'){event.preventDefault();if(ui.tab==='projects'){ui.projectAdd=null;render();}else{event.target.closest('form').reset();event.target.blur();}}},true);

document.addEventListener('input',event=>{if(!event.target.matches('[data-project-query]'))return;ui.projectQuery=event.target.value;render({keepMenus:true});document.querySelector('[data-project-query]')?.focus();});

document.addEventListener('input',event=>{const el=event.target;if(el.matches('[data-project-work-query],[data-project-detail-query]')){ui[el.matches('[data-project-work-query]')?'projectWorkQuery':'projectDetailQuery']=el.value;render({keepMenus:true});document.querySelector(el.matches('[data-project-work-query]')?'[data-project-work-query]':'[data-project-detail-query]')?.focus();}});

document.addEventListener('change',event=>{const el=event.target;if(!el.matches('[data-project-status]'))return;const p=data.projects.find(p=>p.id===el.dataset.projectStatus);if(!p)return;const value=el.value;el.value=projectState(p);try{detailUI.changeProjectState(p.id,value);}catch(error){toast(error.message);}});
