import {addDays,isPlanned,isDuePast,isCarried,planToday,taskContext,uid} from './model.js?v=20261027-project-tabs-1';
export const unfinished=t=>!t.deletedAt&&!['done','cancelled'].includes(t.status);
export function projectTasks(data,id){return data.tasks.filter(t=>!t.deletedAt&&taskContext(data,t).project?.id===id);}
export function projectSummary(data,p){
 const remaining=projectTasks(data,p.id).filter(unfinished);
 const explicit=remaining.find(t=>t.id===p.nextTaskId);
 const due=[...remaining].filter(t=>t.due).sort((a,b)=>(a.due+(a.dueTime||'23:59')).localeCompare(b.due+(b.dueTime||'23:59')))[0];
 return {remaining,next:explicit||due||null,explicit:!!explicit,due:due?.due||null};
}
export function executionSections(data,date,showCompleted=false){
 const eligible=data.tasks.filter(t=>unfinished(t)||(showCompleted&&!t.deletedAt&&t.status==='done'));
 const planned=eligible.filter(t=>!t.excludedDates?.includes(date)&&(isPlanned(t,date)||!Object.hasOwn(t,'startDate')&&t.due===date||t.status==='done'&&t.completedAt?.slice(0,10)===date));
 const overdue=eligible.filter(t=>unfinished(t)&&!planned.includes(t)&&!Object.hasOwn(t,'startDate')&&isDuePast(t,date));
 const upcoming=eligible.filter(t=>unfinished(t)&&!planned.includes(t)&&!overdue.includes(t)&&!Object.hasOwn(t,'startDate')&&(isCarried(t,date)||t.due>date&&t.due<=addDays(date,7)||t.plans.some(p=>p.state==='active'&&p.start>date&&p.start<=addDays(date,7))));
 return {planned,overdue,upcoming};
}
export function removeFromDay(task,date){
 const plans=[];
 for(const p of task.plans){
  if(p.state!=='active'||p.start>date||p.end<date){plans.push(p);continue;}
  plans.push({...p,state:'superseded'});
  if(p.start<date)plans.push({...p,id:uid(),end:addDays(date,-1)});
  if(p.end>date)plans.push({...p,id:uid(),start:addDays(date,1)});
 }
 task.plans=plans;task.blocks=task.blocks.filter(b=>b.date!==date);
 task.excludedDates=[...new Set([...(task.excludedDates||[]),date])];
}
export function moveTaskDate(task,from,to){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(to)||Number.isNaN(Date.parse(to+'T12:00:00Z'))||new Date(to+'T12:00:00Z').toISOString().slice(0,10)!==to)throw new Error('올바른 날짜를 입력해 주세요.');
 if(from===to)return;
 const blocks=task.blocks.filter(b=>b.date===from);
 if(blocks.length&&task.blocks.some(b=>b.date===to))throw new Error('이동할 날짜에 이미 시간이 지정되어 있습니다. 상세에서 시간을 확인해 주세요.');
 removeFromDay(task,from);planToday(task,to);task.blocks.push(...blocks.map(b=>({...b,date:to})));
}
