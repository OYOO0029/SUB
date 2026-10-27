import {isPlanned,isVisible,isDuePast,planToday,taskContext} from './model.js?v=20261027-inline-entry-1';

export function automaticOrder(tasks,date){
  const start=t=>t.blocks.filter(b=>b.date===date).map(b=>b.start).sort()[0];
  const due=t=>t.due?`${t.due}T${t.dueTime||'23:59'}`:'9999';
  return [...tasks].sort((a,b)=>{
    const x=start(a),y=start(b);
    if(!!x!==!!y)return x?-1:1;
    if(x&&x!==y)return x.localeCompare(y);
    return due(a).localeCompare(due(b));
  });
}
export function orderedTasks(state,tasks,date){
  const sorted=automaticOrder(tasks,date),manual=state.dailyOrder?.[date];
  if(!manual)return sorted;
  const ranks=new Map(manual.map((id,i)=>[id,i]));
  return sorted.sort((a,b)=>(ranks.get(a.id)??Infinity)-(ranks.get(b.id)??Infinity));
}
export function taskSections(state,date,includeCompleted=false){
  const visible=state.tasks.filter(t=>isVisible(t,date,includeCompleted));
  const planned=visible.filter(t=>isPlanned(t,date)||t.status==='done'||!isDuePast(t,date));
  return {planned:orderedTasks(state,planned,date),overdue:automaticOrder(visible.filter(t=>!planned.includes(t)&&isDuePast(t,date)),date)};
}
export function moveToDay(state,date,id,beforeId=null){
  const task=state.tasks.find(t=>t.id===id&&!t.deletedAt&&t.status!=='cancelled');
  if(!task)throw new Error('이동할 할 일을 찾지 못했습니다.');
  if(id===beforeId)return;
  planToday(task,date);
  const ids=taskSections(state,date,true).planned.map(t=>t.id).filter(x=>x!==id);
  const at=beforeId?ids.indexOf(beforeId):-1;
  ids.splice(at<0?ids.length:at,0,id);
  state.dailyOrder??={};state.dailyOrder[date]=ids;
}
export function taskFilter(state,task,{project='',work='',status='active'}={}){
  const context=taskContext(state,task);
  return !task.deletedAt&&task.status!=='cancelled'&&(!project||(project==='standalone'?!context.project:context.project?.id===project))&&(!work||(work==='standalone'?!context.work:task.workId===work))&&(status==='all'||status==='active'&&task.status!=='done'||task.status===status);
}
export function searchEntities(state,query,scope='all',filters={}){
  const q=query.trim().toLocaleLowerCase();if(!q)return [];
  const has=e=>[e.title,e.notes,...(e.tags||[]),...(e.checks||[]).filter(c=>!c.deletedAt).map(c=>c.title)].join(' ').toLocaleLowerCase().includes(q);
  const result=[];
  if(scope==='all'||scope==='projects')for(const e of state.projects)if(!e.deletedAt&&has(e)&&(!filters.project||e.id===filters.project))result.push({type:'project',item:e});
  if(scope==='all'||scope==='works')for(const e of state.works)if(!e.deletedAt&&has(e)&&(!filters.project||(filters.project==='standalone'?!e.projectId:e.projectId===filters.project))&&(!filters.work||e.id===filters.work))result.push({type:'work',item:e});
  if(scope==='all'||scope==='tasks')for(const e of state.tasks)if(has(e)&&taskFilter(state,e,filters))result.push({type:'task',item:e});
  return result;
}
export function deadlineConflict(task,date,end){return !!task.due&&(date>task.due||date===task.due&&!!task.dueTime&&end>task.dueTime);}
export function countdown(now=new Date()){
  const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',hour12:false}).format(now).split(':').map(Number);
  const left=Math.max(0,18*60-parts[0]*60-parts[1]);return `${String(Math.floor(left/60)).padStart(2,'0')}:${String(left%60).padStart(2,'0')}`;
}
