// All date/view decisions live here. This module has no DOM or storage dependency.
export const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export const addDays=(date,n)=>{const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);};
export const addMonths=(date,n)=>{const d=new Date(date.slice(0,8)+'01T12:00:00Z');d.setUTCMonth(d.getUTCMonth()+n);const last=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();d.setUTCDate(Math.min(Number(date.slice(8)),last));return d.toISOString().slice(0,10);};
export const weekDays=date=>{const n=new Date(date+'T12:00:00Z').getUTCDay();const start=addDays(date,-((n+6)%7));return Array.from({length:7},(_,i)=>addDays(start,i));};
export const monthDays=date=>{const start=date.slice(0,8)+'01';const first=weekDays(start)[0];return Array.from({length:42},(_,i)=>addDays(first,i));};
export const uid=()=>globalThis.crypto.randomUUID();
export function isPlanned(task,date){return task.plans.some(p=>p.state==='active'&&p.start<=date&&p.end>=date);}
export function isCarried(task,date){const plans=task.plans.filter(p=>p.state==='active');return plans.some(p=>p.end<date)&&!plans.some(p=>p.end>=date);}
export function isDuePast(task,date,now=new Date()){
  if(!task.due)return false;
  if(task.due<date)return true;
  const current=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
  return task.due===date&&date===current&&!!task.dueTime&&new Date(`${task.due}T${task.dueTime}:00+09:00`)<now;
}
export function isVisible(task,date,includeCompleted=false){
  if(task.deletedAt||task.status==='cancelled')return false;
  if(task.status==='done')return includeCompleted&&(task.completedAt?.slice(0,10)===date||isPlanned(task,date));
  return isPlanned(task,date)||isDuePast(task,date)||isCarried(task,date)||task.due===date;
}
export function reminderTasks(state,date){return state.tasks.filter(t=>!t.deletedAt&&t.status!=='done'&&t.status!=='cancelled'&&t.reminderAcknowledgedOn!==date&&!!t.remindFrom&&t.remindFrom<=date);}
export function planFor(task,date){return task.plans.find(p=>p.state==='active'&&p.start<=date&&p.end>=date);}
export function planToday(task,date){
  const existing=planFor(task,date);if(existing)return existing;
  task.plans.forEach(p=>{if(p.state==='active'&&p.end<date)p.state='superseded';});
  const plan={id:uid(),start:date,end:date,state:'active'};task.plans.push(plan);return plan;
}
export function setTime(task,date,start,end){
  if(!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(start)||(!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(end)&&end!=='24:00')||end<=start)throw new Error('종료 시간을 시작 시간보다 늦게 설정해 주세요.');
  planToday(task,date);task.blocks=task.blocks.filter(b=>b.date!==date);task.blocks.push({id:uid(),date,start,end});
}
export function removeTime(task,date){task.blocks=task.blocks.filter(b=>b.date!==date);}
export const duration=(start,end)=>{const parse=x=>Number(x.split(':')[0])*60+Number(x.split(':')[1]);return parse(end)-parse(start);};
export function complete(task,date){task.status=task.status==='done'?'todo':'done';task.completedAt=task.status==='done'?date+'T'+new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(new Date())+'+09:00':null;}
export function taskContext(state,task){const work=state.works.find(w=>w.id===task.workId);return {work,project:state.projects.find(p=>p.id===(work?work.projectId:task.projectId))};}
export function matches(state,task,query,project){const c=taskContext(state,task);return (!project||(project==='standalone'?!c.project:c.project?.id===project))&&(!query||[task.title,task.notes,...task.tags,c.work?.title,c.project?.title].join(' ').toLowerCase().includes(query.toLowerCase()));}
