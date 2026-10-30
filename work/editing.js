import {validatePeriod} from './schedule-rules.js?v=20261030-work-groups-2';
import {assignTaskOwner} from './ownership.js?v=20261028-domain-rules-1';
import {uid,planToday,today} from './model.js?v=20261030-explicit-schedule-1';
import {validate} from './repository.js?v=20261030-work-groups-2';
import {BASE_STAGES,LEGACY_STATUS,statusOptions,stageOptions,peopleValues} from './detail-fields.js?v=20261030-explicit-schedule-1';

export const collection=type=>({task:'tasks',work:'works',project:'projects'})[type];
export const getItem=(data,type,id)=>data[collection(type)]?.find(x=>x.id===id);
export const activeChecks=task=>task.checks.filter(c=>!c.deletedAt);
export const minutes=value=>Number(value.split(':')[0])*60+Number(value.split(':')[1]);
export const clock=value=>`${String(Math.floor(value/60)).padStart(2,'0')}:${String(value%60).padStart(2,'0')}`;
export function slotRange(first,last=first){
  if(![first,last].every(n=>Number.isInteger(n)&&n>=0&&n<144))throw new Error('시간 블록을 선택해 주세요.');
  return {start:clock(Math.min(first,last)*10),end:clock((Math.max(first,last)+1)*10)};
}
export function timeGridState(date,first=null,now=new Date()){
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now).map(p=>[p.type,p.value]));
  const currentDate=`${parts.year}-${parts.month}-${parts.day}`,slot=Math.floor((Number(parts.hour)*60+Number(parts.minute))/10),isToday=date===currentDate;
  return {focusIndex:Math.max(48,Math.min(113,isToday?slot:first??48)),currentIndex:isToday&&slot>=48&&slot<114?slot:null,pastBefore:date<currentDate?144:isToday?slot:0};
}
export function conflicts(data,taskId,date,start,end){return data.tasks.filter(t=>t.id!==taskId&&!t.deletedAt&&t.status!=='cancelled').flatMap(t=>t.blocks.filter(b=>b.date===date&&b.start<end&&b.end>start).map(b=>({title:t.title,...b})));}

export function createItem(data,type,title,{date=null,workId=null,projectId=null}={}){
  title=title.trim();if(!title||title.length>160)throw new Error('이름을 1~160자로 입력해 주세요.');
  const common={id:uid(),title,tags:[],people:[],notes:'',deletedAt:null};let item;
  if(type==='task'){item={...common,workId,projectId:workId?null:projectId,status:'waiting',due:null,dueTime:'',remindFrom:null,plans:[],blocks:[],checks:[],completedAt:null};assignTaskOwner(data,item,{workId,projectId});if(date)planToday(item,date);}
  else if(type==='work')item={...common,projectId,stage:'',due:null};
  else item={...common,lifecycle:'active',subtitle:'',start:null,end:null,stage:'',stages:[...BASE_STAGES],budget:''};
  const draft=structuredClone(data);draft[collection(type)].push(item);validate(draft);data[collection(type)].push(item);return item;
}

export function updateItem(data,type,id,patch){
  const allowed={task:['todaySelected','workPeriod','startDate','title','notes','tags','people','workId','projectId','status','due','dueTime','remindFrom','remindUntil'],work:['workPeriod','title','notes','tags','people','projectId','stage','due'],project:['nextTaskId','lifecycle','title','notes','tags','people','budget','stage','stages','start','end']}[type];
  if(!allowed||Object.keys(patch).some(k=>!allowed.includes(k)))throw new Error('수정할 수 없는 속성입니다.');
  const draft=structuredClone(data),item=getItem(draft,type,id);if(!item||item.deletedAt)throw new Error('항목을 찾을 수 없습니다.');
  if(type==='task')assignTaskOwner(draft,item,patch);
  Object.assign(item,Object.fromEntries(Object.entries(patch).filter(([k])=>type!=='task'||!['workId','projectId'].includes(k))));
  // A later explicit relation choice cancels any pending automatic reattachment.
  if(type==='task'&&('projectId' in patch||'workId' in patch))for(const parent of [...draft.works,...draft.projects]){if(parent.deletedAt){parent.detachedLinks=(parent.detachedLinks||[]).filter(l=>l.id!==id);parent.detachedTasks=(parent.detachedTasks||[]).filter(t=>t!==id);}}
  if(type==='work'&&'projectId' in patch)for(const parent of draft.projects)if(parent.deletedAt)parent.detachedLinks=(parent.detachedLinks||[]).filter(l=>l.id!==id);
  if('people' in patch){if(typeof patch.people!=='string'&&(!Array.isArray(patch.people)||patch.people.some(p=>typeof p!=='string')))throw new Error('관련 인원을 확인해 주세요.');item.people=peopleValues(patch.people);}
  if(!item.title.trim()||item.title.length>160)throw new Error('이름을 1~160자로 입력해 주세요.');
  item.title=item.title.trim();
  if('workPeriod' in patch){validatePeriod(item.workPeriod);if(type==='task'){item.startDate=item.workPeriod?.start||null;item.due=item.workPeriod?.end||null;}}
  if(type==='task'){
    if(('startDate' in patch||'due' in patch)&&item.startDate&&item.due&&item.startDate>item.due)throw Error('마감은 작업 시작일 이후로 설정하세요.');
    if(!item.due)item.dueTime='';
    if('status' in patch)item.completedAt=item.status==='done'?(item.completedAt||today()+'T'+new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(new Date())+'+09:00'):null;
    if(item.workId&&!draft.works.some(w=>w.id===item.workId&&!w.deletedAt))throw new Error('연결할 업무를 확인해 주세요.');
  }
  if(type==='work'){
    const p=draft.projects.find(p=>p.id===item.projectId&&!p.deletedAt);
    if(item.projectId&&!p)throw new Error('연결할 프로젝트를 확인해 주세요.');
    if('projectId' in patch&&(!p||!p.stages.includes(item.stage)))item.stage='';
    if(p&&item.stage&&!p.stages.includes(item.stage))throw new Error('프로젝트에 등록된 단계를 선택해 주세요.');
  }
  if(type==='project'&&'stages' in patch){
    if(draft.works.some(w=>!w.deletedAt&&w.projectId===id&&w.stage&&!item.stages.includes(w.stage)))throw new Error('업무가 사용 중인 단계는 먼저 해당 업무에서 변경해 주세요.');
    if(!item.stages.includes(item.stage))item.stage='';
  }
  validate(draft);Object.assign(getItem(data,type,id),item);for(const field of ['projects','works'])for(const parent of draft[field]){if(parent.deletedAt){const original=data[field].find(x=>x.id===parent.id);if(parent.detachedLinks)original.detachedLinks=parent.detachedLinks;if(parent.detachedTasks)original.detachedTasks=parent.detachedTasks;}}return item;
}

// Register and select together so a failed save cannot leave a partial option.
export function selectDetailOption(data,type,id,value,{add=false}={}){
  const draft=structuredClone(data),item=getItem(draft,type,id);
  if(!item||item.deletedAt)throw new Error('항목을 찾을 수 없습니다.');
  const field=type==='task'?'status':'stage';
  if(add){
    const label=value.trim();if(!label||label.length>40)throw new Error('항목 이름을 1~40자로 입력해 주세요.');
    const options=type==='task'?[...statusOptions(draft),LEGACY_STATUS]:stageOptions(draft,type,item);
    const existing=options.find(([,name])=>name===label);
    value=existing?.[0]|| (type==='task'?uid():label);
    if(type==='task'&&!existing)(draft.taskStatuses??=[]).push({id:value,label});
  }
  if(type!=='task'){
    const project=type==='project'?item:getItem(draft,'project',item.projectId);
    const options=stageOptions(draft,type,item);
    if(!add&&value&&!options.some(([v])=>v===value))throw new Error('등록된 단계를 선택해 주세요.');
    if(project){if(value&&!project.stages.includes(value))project.stages.push(value);}
    else if(value&&!draft.workStages?.includes(value))(draft.workStages??=[]).push(value);
  }
  updateItem(draft,type,id,{[field]:value});validate(draft);Object.assign(data,draft);return value;
}

export function updatePlan(data,id,start,end){
  if(!!start!==!!end||end<start)throw new Error('작업 시작일과 종료일을 확인해 주세요.');
  const draft=structuredClone(data),t=getItem(draft,'task',id);
  if(t.blocks.some(b=>!start||b.date<start||b.date>end))throw new Error('배치된 시간을 포함하는 기간을 선택하거나, 먼저 시간을 해제해 주세요.');
  if(start&&t.excludedDates)t.excludedDates=t.excludedDates.filter(d=>d<start||d>end);
  t.plans.forEach(p=>p.state='superseded');if(start)t.plans.push({id:uid(),start,end,state:'active'});
  validate(draft);Object.assign(getItem(data,'task',id),t);
}

// Children keep their identity and records when a parent moves to Trash.
export function trashItem(data,type,id){
  const item=getItem(data,type,id);if(!item||item.deletedAt)return;
  item.deletedAt=new Date().toISOString();item.detachedLinks=[];
  if(type==='project'){item.detachedTasks=[];for(const t of data.tasks.filter(t=>t.projectId===id)){item.detachedTasks.push(t.id);t.projectId=null;}}
  if(type==='project')for(const w of data.works.filter(w=>w.projectId===id)){item.detachedLinks.push({id:w.id,stage:w.stage});w.projectId=null;w.stage='';}
  if(type==='work')for(const t of data.tasks.filter(t=>t.workId===id)){item.detachedLinks.push({id:t.id,projectId:t.projectId||null,detachedProjectId:item.projectId||t.projectId||null});t.workId=null;t.projectId=item.projectId||t.projectId||null;}
}
export function restoreItem(data,type,id){
  const item=getItem(data,type,id);if(!item||!item.deletedAt)return;item.deletedAt=null;
  for(const link of item.detachedLinks||[]){
    const child=getItem(data,type==='project'?'work':'task',link.id);
    if(!child)continue;
    if(type==='project'&&!child.projectId){child.projectId=id;child.stage=item.stages.includes(link.stage)?link.stage:'';}
    if(type==='work'&&!child.workId&&(Object.hasOwn(link,'detachedProjectId')?(child.projectId||null)===link.detachedProjectId:!child.projectId)){child.workId=id;child.projectId=link.projectId||null;}
  }
  if(type==='project')for(const taskId of item.detachedTasks||[]){const t=getItem(data,'task',taskId);if(t&&!t.projectId&&!t.workId)t.projectId=id;}
  item.detachedTasks=[];item.detachedLinks=[];
}

// Shared memo/check commands: validate the complete draft before changing UI data.
export function updateMemo(data,id,parts){
 const draft=structuredClone(data),task=getItem(draft,'task',id);
 if(!task||task.deletedAt)throw Error('할 일을 찾을 수 없습니다.');
 task.memoParts=structuredClone(parts);task.notes=parts.map(p=>p.text||'').join('');task.memoText=task.notes;
 validate(draft);Object.assign(getItem(data,'task',id),task);return task;
}
export function changeCheck(data,id,checkId,patch){
 const draft=structuredClone(data),task=getItem(draft,'task',id);
 if(!task||task.deletedAt)throw Error('할 일을 찾을 수 없습니다.');
 let check=checkId?task.checks.find(c=>c.id===checkId&&(!c.deletedAt||patch.deletedAt===null)):null;
 if(checkId&&!check)throw Error('하위 할 일을 찾을 수 없습니다.');
 if(!check){check={id:uid(),title:'',done:false};task.checks.push(check);}
 if(Object.keys(patch).some(k=>!['title','done','deletedAt'].includes(k)))throw Error('수정할 수 없는 속성입니다.');
 Object.assign(check,patch);check.title=check.title.trim();if(!check.title||check.title.length>160)throw Error('하위 할 일 제목을 1~160자로 입력해 주세요.');
 validate(draft);Object.assign(getItem(data,'task',id),task);return check;
}

// Validate the entire batch before publishing any records.
export function createTaskBatch(data,text,{projectId=null,workId=null,startDate=null,due=null,todaySelected=false}={}){
 const titles=text.split(/\r?\n/).map(t=>t.trim()).filter(Boolean);
 if(!titles.length||titles.length>100)throw Error('할 일을 1~100개 입력하세요.');
 if(startDate&&due&&startDate>due)throw Error('마감은 작업 시작일 이후로 설정하세요.');
 const draft=structuredClone(data),items=titles.map(title=>{
  const item=createItem(draft,'task',title,{date:null,projectId,workId});
  return updateItem(draft,'task',item.id,{startDate,due,todaySelected,workPeriod:startDate||due?{start:startDate||due,end:due||startDate}:null});
 });
 validate(draft);data.tasks.push(...items);return items;
}
