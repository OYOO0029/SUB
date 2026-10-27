import {validMemoPart} from './image-schema.mjs';
import {appStorage} from '../schedule-storage.mjs';
import {createWorkAccount,emptyWorkState} from './work-account.mjs';
import {BASE_STATUSES,LEGACY_STATUS} from './detail-fields.js?v=20261026-controls-1';
export const workAccount=createWorkAccount({storage:appStorage,validate});
export function loadState(){return {state:emptyWorkState(),warning:''};}
export function saveState(state){try{workAccount.write(state);window.dispatchEvent(new Event('my-week-local-save'));return true;}catch{return false;}}
export function validate(data){
  if(data?.schemaVersion!==1||!Array.isArray(data.tasks)||!Array.isArray(data.works)||!Array.isArray(data.projects)||!Array.isArray(data.personal)||typeof data.tracker!=='object'||!data.tracker)throw new Error('지원하는 미리보기 백업 파일이 아닙니다.');
  const date=v=>v===null||v===''||typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'T12:00:00Z'))&&new Date(v+'T12:00:00Z').toISOString().slice(0,10)===v;
  const id=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{1,100}$/.test(v);
  const time=v=>typeof v==='string'&&/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(v);
  const strings=v=>Array.isArray(v)&&v.every(x=>typeof x==='string');
  const unique=(xs)=>xs.every(x=>x&&id(x.id)&&typeof x.title==='string')&&new Set(xs.map(x=>x.id)).size===xs.length;
  const builtins=[...BASE_STATUSES,LEGACY_STATUS],custom=data.taskStatuses||[];
  if(data.taskStatuses!==undefined&&(!Array.isArray(data.taskStatuses)||custom.some(s=>!s||!id(s.id)||typeof s.label!=='string'||!s.label.trim()||s.label.length>40||builtins.some(([id,label])=>id===s.id||label===s.label))||new Set(custom.map(s=>s.id)).size!==custom.length||new Set(custom.map(s=>s.label)).size!==custom.length))throw new Error('상태 목록이 올바르지 않습니다.');
  if(data.workStages!==undefined&&(!strings(data.workStages)||data.workStages.some(s=>!s.trim()||s.length>40)))throw new Error('진행 단계 목록이 올바르지 않습니다.');
  for(const e of [...data.tasks,...data.works,...data.projects])if(e.people!==undefined&&typeof e.people!=='string'&&(!strings(e.people)||e.people.some(p=>!p.trim()||p.length>160)))throw new Error('관련 인원 형식이 올바르지 않습니다.');
  if(data.dailyOrder!==undefined&&(data.dailyOrder===null||Array.isArray(data.dailyOrder)||typeof data.dailyOrder!=='object'||Object.entries(data.dailyOrder).some(([day,ids])=>!day||!date(day)||!Array.isArray(ids)||!ids.every(id)||new Set(ids).size!==ids.length)))throw new Error('일별 정렬 정보가 올바르지 않습니다.');
  if(![data.tasks,data.works,data.projects,data.personal].every(unique))throw new Error('항목 ID 또는 제목을 확인해 주세요.');
  for(const t of data.tasks){if(t.projectId&&(!id(t.projectId)||!data.projects.some(p=>p.id===t.projectId)))throw new Error('할 일 프로젝트 연결을 확인해 주세요.');if(![...builtins.map(([id])=>id),...custom.map(s=>s.id)].includes(t.status)||![t.plans,t.blocks,t.checks,t.tags].every(Array.isArray)||typeof t.notes!=='string'||!date(t.due)||!date(t.remindFrom)||!date(t.remindUntil??null)||t.remindUntil&&(!t.remindFrom||t.remindUntil<t.remindFrom)||t.workId&&!data.works.some(w=>w.id===t.workId))throw new Error('할 일 데이터의 형식이나 연결이 올바르지 않습니다.');
    if(t.startDate!==undefined&&!date(t.startDate))throw new Error('작업 시작일을 확인해 주세요.');
    if(t.memoParts!==undefined&&(!Array.isArray(t.memoParts)||t.memoParts.some(p=>!validMemoPart(p))))throw new Error('업무 메모 형식을 확인해 주세요.');
    if(t.excludedDates!==undefined&&(!Array.isArray(t.excludedDates)||t.excludedDates.some(d=>!d||!date(d))))throw new Error('제외 날짜 형식이 올바르지 않습니다.');
    if(t.reminderAcknowledgedOn!==undefined&&!date(t.reminderAcknowledgedOn))throw new Error('리마인드 확인 날짜가 올바르지 않습니다.');
    if(t.plans.some(p=>!p||!id(p.id)||!date(p.start)||!p.start||!date(p.end)||!p.end||p.end<p.start||!['active','superseded'].includes(p.state)))throw new Error('작업 기간이 올바르지 않습니다.');
    if(t.blocks.some(b=>!b||!id(b.id)||!date(b.date)||!b.date||!time(b.start)||!(time(b.end)||b.end==='24:00')||b.end<=b.start))throw new Error('시간 배치가 올바르지 않습니다.');
    if(!unique(t.checks)||t.checks.some(c=>typeof c.done!=='boolean')||!strings(t.tags))throw new Error('확인사항 또는 태그 형식이 올바르지 않습니다.');
    if(t.dueTime&&!time(t.dueTime)||t.completedAt&&typeof t.completedAt!=='string'||t.workId&&!id(t.workId))throw new Error('할 일 날짜 정보가 올바르지 않습니다.');
  }
  for(const w of data.works)if(w.projectId&&!data.projects.some(p=>p.id===w.projectId)||!strings(w.tags)||typeof w.notes!=='string'||typeof w.stage!=='string'||!date(w.due))throw new Error('업무 연결이 올바르지 않습니다.');
  for(const p of data.projects)if(p.nextTaskId!==undefined&&p.nextTaskId!==null&&!id(p.nextTaskId)||p.lifecycle!==undefined&&!['active','done','paused','cancelled'].includes(p.lifecycle)||!strings(p.stages)||!strings(p.tags)||typeof p.notes!=='string'||typeof p.stage!=='string'||p.stage&&!p.stages.includes(p.stage)||!date(p.start)||!date(p.end)||!!p.start!==!!p.end||p.start&&p.end<p.start)throw new Error('프로젝트 형식이 올바르지 않습니다.');
  for(const e of data.personal)if(!date(e.date)||!e.date||!['am','pm','eve'].includes(e.period)||typeof e.time!=='string')throw new Error('개인 일정 형식이 올바르지 않습니다.');
  for(const [key,value] of Object.entries(data.tracker))if(!/^\d{4}-\d{2}-\d{2}-[012]$/.test(key)||typeof value!=='boolean')throw new Error('트래커 형식이 올바르지 않습니다.');
  return data;
}
