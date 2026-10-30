// Read compatibility without rewriting historical records.
export function taskPeriod(task){
 if(Object.hasOwn(task,'workPeriod'))return task.workPeriod||{start:null,end:null};
 const plans=(task.plans||[]).filter(p=>p.state==='active');
 const start=task.startDate||plans.map(p=>p.start).sort()[0]||task.due||null;
 const end=task.due||plans.map(p=>p.end).sort().at(-1)||start;
 return {start,end};
}
export const activeTask=t=>!t.deletedAt&&!['done','cancelled'].includes(t.status);
export function executionBuckets(data,date){
 const result={today:[],remaining:[],overdue:[]};
 for(const t of data.tasks){if(!activeTask(t))continue;const end=taskPeriod(t).end;result[end&&end<date?'overdue':t.todaySelected?'today':'remaining'].push(t);}
 return result;
}
export function selectToday(task,selected=true){task.todaySelected=!!selected;}
export function validatePeriod(period){
 if(period===null)return;
 const valid=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&!Number.isNaN(Date.parse(d+'T12:00:00Z'))&&new Date(d+'T12:00:00Z').toISOString().slice(0,10)===d;
 if(!period||!valid(period.start)||!valid(period.end))throw Error('올바른 작업일자를 입력해 주세요.');
 if(period.start>period.end)throw Error('시작일은 종료일보다 늦을 수 없습니다.');
}
export function workPeriod(work){return Object.hasOwn(work,'workPeriod')?work.workPeriod:{start:work.due||null,end:work.due||null};}
export function outsideWork(task,work){const t=taskPeriod(task),w=workPeriod(work);return !!(w?.start&&w?.end&&t.start&&t.end&&(t.start<w.start||t.end>w.end));}
export function todayOrder(data,tasks){const rank=new Map((data.todayOrder||[]).map((id,i)=>[id,i]));return [...tasks].sort((a,b)=>(rank.get(a.id)??Infinity)-(rank.get(b.id)??Infinity));}
export function reorderToday(data,date,id,before=null){const ids=todayOrder(data,executionBuckets(data,date).today).map(t=>t.id);if(!ids.includes(id)||id===before)return;const rest=ids.filter(x=>x!==id),at=before?rest.indexOf(before):-1;rest.splice(at<0?rest.length:at,0,id);data.todayOrder=rest;}
export const lateDays=(task,date)=>Math.max(0,Math.round((Date.parse(date+'T12:00:00Z')-Date.parse(taskPeriod(task).end+'T12:00:00Z'))/86400000));
