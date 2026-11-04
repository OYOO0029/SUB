import {taskContext} from './ownership.js';
export const koreaDay=(now=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
export const inPeriod=(date,p)=>!!p?.start&&p.start<=date&&(p.end||p.start)>=date;
export function historyContext(data,t){const c=data?taskContext(data,t):{};return {title:t.title,projectId:c.project?.id||t.projectId||null,projectTitle:c.project?.title||'',workTitle:c.work?.title||'',workPeriod:Object.hasOwn(t,'workPeriod')?structuredClone(t.workPeriod):undefined};}
export function recordTask(t,kind,{date=koreaDay(),data,...fields}={}){const entry={id:crypto.randomUUID(),kind,date,at:new Date().toISOString(),...historyContext(data,t),...fields};(t.history??=[]).push(entry);return entry;}
export function selectDay(t,date,selected=true,data){
 if(!t.dayPlans?.length&&t.todaySelected&&t.selectionDate&&t.selectionDate!==date)t.dayPlans=[{date:t.selectionDate,selected:true,at:new Date().toISOString(),...historyContext(data,t)}];
 const previous=t.dayPlans?.find(p=>p.date===date);if(previous?.selected===selected)return;
 const entry={date,selected,at:new Date().toISOString(),...historyContext(data,t)};
 t.dayPlans=(t.dayPlans||[]).filter(p=>p.date!==date);t.dayPlans.push(entry);
 recordTask(t,selected?'plan':'unplan',{date,data});if(date===koreaDay()){t.todaySelected=selected;t.selectionDate=date;}
}
export function selectedOn(t,date){const p=t.dayPlans?.find(p=>p.date===date);return p?p.selected:!t.dayPlans?.length&&!!t.todaySelected&&(t.selectionDate||koreaDay())===date;}
// Preserve existing selection on the first observed day; never invent past plans.
export function initializeHistory(data,date=koreaDay()){let changed=false;for(const t of data.tasks){if(t.todaySelected&&t.selectionDate===undefined){t.selectionDate=date;changed=true;} }return changed;}
export function deadline(t){return Object.hasOwn(t,'deadline')?t.deadline:t.due||null;}
export function doneOn(t,date){
 const events=(t.history||[]).filter(e=>['complete','reopen'].includes(e.kind)&&koreaDay(new Date(e.at))<=date).sort((a,b)=>a.at.localeCompare(b.at));
 if(events.length)return events.at(-1).kind==='complete';
 return !!t.completedAt&&koreaDay(new Date(t.completedAt))<=date;
}
export function completeTask(t,data,now=new Date()){
 if(t.status==='done'&&t.completedAt&&!(t.history||[]).some(e=>e.kind==='complete'))recordTask(t,'complete',{date:koreaDay(new Date(t.completedAt)),at:t.completedAt,data});
 const done=t.status!=='done';t.status=done?'done':'waiting';t.completedAt=done?now.toISOString():null;
 const entry=recordTask(t,done?'complete':'reopen',{date:koreaDay(now),data});entry.at=now.toISOString();return entry;
}
export function addWorkLog(data,t,date,text){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||new Date(date+'T12:00Z').toISOString().slice(0,10)!==date)throw Error('기록 날짜를 확인해 주세요.');
 text=text.trim();if(!text||text.length>1000)throw Error('진행 내용을 1~1000자로 입력해 주세요.');return recordTask(t,'worklog',{date,data,text});
}
export function historicalTask(t,date){
 const relevant=(t.history||[]).filter(e=>e.date===date||inPeriod(date,e.period));
 const plan=t.dayPlans?.find(p=>p.date===date);const snap=relevant.find(e=>e.kind==='plan')||plan||relevant[0];
 return {...t,...(snap&&Object.hasOwn(snap,'workPeriod')?{workPeriod:snap.workPeriod}:{}),...(snap?{projectId:snap.projectId||null,workId:null}:{}),title:snap?.title||t.title,status:doneOn(t,date)?'done':'waiting',_historical:true,_projectTitle:snap?.projectTitle,_recorded:!!snap};
}
export function recordedOn(t,date,period){return selectedOn(t,date)||inPeriod(date,period)||(t.blocks||[]).some(b=>b.date===date)||(t.history||[]).some(e=>e.date===date||inPeriod(date,e.period))||!!t.completedAt&&koreaDay(new Date(t.completedAt))===date;}
export function historicalBlocks(t,date){const current=(t.blocks||[]).filter(b=>b.date===date);if(current.length)return current;const time=(t.history||[]).filter(e=>['time','time-clear'].includes(e.kind)&&e.date===date).at(-1);return time?.kind==='time'&&time.start?[{id:time.id,date,start:time.start,end:time.end}]:[];}
export function recordRows(data,{taskId,projectId,from='',to='',query=''}={}){return data.tasks.filter(t=>!t.deletedAt&&(!taskId||t.id===taskId)).flatMap(t=>[...(t.history||[]),...(t.completedAt&&!(t.history||[]).some(e=>e.kind==='complete')?[{id:'legacy-complete:'+t.id,kind:'complete',date:koreaDay(new Date(t.completedAt)),at:t.completedAt,...historyContext(data,t)}]:[])].filter(e=>(!projectId||e.projectId===projectId)&&(!from||e.date>=from)&&(!to||e.date<=to)&&(!query||[e.title,e.projectTitle,e.text].join(' ').toLowerCase().includes(query.toLowerCase()))).map(e=>({...e,taskId:t.id}))).sort((a,b)=>b.date.localeCompare(a.date)||b.at.localeCompare(a.at));}
