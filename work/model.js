import {taskContext} from './ownership.js?v=20261028-domain-rules-1';
export {taskContext} from './ownership.js?v=20261028-domain-rules-1';
// All date/view decisions live here. This module has no DOM or storage dependency.
export const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export const addDays=(date,n)=>{const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);};
export const addMonths=(date,n)=>{const d=new Date(date.slice(0,8)+'01T12:00:00Z');d.setUTCMonth(d.getUTCMonth()+n);const last=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();d.setUTCDate(Math.min(Number(date.slice(8)),last));return d.toISOString().slice(0,10);};
export const weekDays=date=>{const n=new Date(date+'T12:00:00Z').getUTCDay();const start=addDays(date,-((n+6)%7));return Array.from({length:7},(_,i)=>addDays(start,i));};
export const monthDays=date=>{const start=date.slice(0,8)+'01';const first=weekDays(start)[0];return Array.from({length:42},(_,i)=>addDays(first,i));};
export const uid=()=>globalThis.crypto.randomUUID();
export function scheduleOf(task){const periods=task.plans.filter(p=>p.state==='active'),legacy=!Object.hasOwn(task,'startDate');return {legacy,periods,start:legacy?periods.map(p=>p.start).sort()[0]||null:task.startDate||null};}
export function isPlanned(task,date){const s=scheduleOf(task);if(task.excludedDates?.includes(date))return false;return s.legacy?s.periods.some(p=>p.start<=date&&p.end>=date):!!s.start&&s.start<=date&&(!task.completedAt||date<=task.completedAt.slice(0,10));}
export function isCarried(task,date){const {legacy,periods:plans}=scheduleOf(task);if(!legacy)return false;return plans.some(p=>p.end<date)&&!plans.some(p=>p.end>=date);}
export function isDuePast(task,date,now=new Date()){
  if(!task.due)return false;
  if(task.due<date)return true;
  const current=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
  return task.due===date&&date===current&&!!task.dueTime&&new Date(`${task.due}T${task.dueTime}:00+09:00`)<now;
}
export function taskDay(task,date,includeCompleted=false){
 const schedule=scheduleOf(task),excluded=!!task.excludedDates?.includes(date),planned=isPlanned(task,date),overdue=isDuePast(task,date),carried=isCarried(task,date);
 let section=null;
 if(!task.deletedAt&&task.status!=='cancelled'&&(task.status!=='done'||includeCompleted)){
  if(!excluded&&(planned||schedule.legacy&&task.due===date||task.status==='done'&&task.completedAt?.slice(0,10)===date))section='planned';
  else if(task.status!=='done'&&schedule.legacy&&!excluded){if(overdue)section='overdue';else if(carried||task.due>date&&task.due<=addDays(date,7)||schedule.periods.some(p=>p.start>date&&p.start<=addDays(date,7)))section='upcoming';}
 }
 return {...schedule,planned,overdue,carried,excluded,section,listSection:section==='upcoming'?(carried?'planned':null):section};
}
export function isVisible(task,date,includeCompleted=false){const d=taskDay(task,date,includeCompleted);return d.section==='planned'||d.section==='overdue'||d.section==='upcoming'&&d.carried;}

export function reminderTasks(state,date){return state.tasks.filter(t=>!t.deletedAt&&t.status!=='done'&&t.status!=='cancelled'&&t.reminderAcknowledgedOn!==date&&!!t.remindFrom&&t.remindFrom<=date&&(!t.remindUntil||date<=t.remindUntil));}
export function planFor(task,date){return task.plans.find(p=>p.state==='active'&&p.start<=date&&p.end>=date);}
export function planToday(task,date){
  if(Object.hasOwn(task,'startDate'))task.startDate=date;
  if(task.excludedDates)task.excludedDates=task.excludedDates.filter(d=>d!==date);
  const existing=planFor(task,date);if(existing)return existing;
  task.plans.forEach(p=>{if(p.state==='active'&&p.end<date)p.state='superseded';});
  const plan={id:uid(),start:date,end:date,state:'active'};task.plans.push(plan);return plan;
}
export function setTime(task,date,start,end){
  if(!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(start)||(!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(end)&&end!=='24:00')||end<=start)throw new Error('종료 시간을 시작 시간보다 늦게 설정해 주세요.');
  const previousStart=task.startDate;planToday(task,date);if(previousStart&&previousStart<date)task.startDate=previousStart;task.blocks=task.blocks.filter(b=>b.date!==date);task.blocks.push({id:uid(),date,start,end});
}
export function removeTime(task,date){task.blocks=task.blocks.filter(b=>b.date!==date);}
export const duration=(start,end)=>{const parse=x=>Number(x.split(':')[0])*60+Number(x.split(':')[1]);return parse(end)-parse(start);};
export function complete(task,date){task.status=task.status==='done'?'todo':'done';task.completedAt=task.status==='done'?date+'T'+new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(new Date())+'+09:00':null;}

export function matches(state,task,query,project){const c=taskContext(state,task);return (!project||(project==='standalone'?!c.project:c.project?.id===project))&&(!query||[task.title,task.notes,...task.tags,c.work?.title,c.project?.title].join(' ').toLowerCase().includes(query.toLowerCase()));}

export const taskStart=task=>scheduleOf(task).start;
