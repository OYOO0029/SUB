export const BASE_STATUSES=[['waiting','대기'],['todo','진행중'],['done','완료'],['cancelled','취소']];
export const BASE_STAGES=BASE_STATUSES.map(([,label])=>label);
export const LEGACY_STATUS=['paused','보류'];

export function statusOptions(data){
  return [...BASE_STATUSES,...(data.tasks.some(t=>t.status==='paused')?[LEGACY_STATUS]:[]),...(data.taskStatuses||[]).map(s=>[s.id,s.label])];
}
export function stageOptions(data,type,item){
  const project=type==='project'?item:data.projects.find(p=>p.id===item.projectId&&!p.deletedAt);
  return [...new Set([...BASE_STAGES,...(project?.stages||data.workStages||[]),...(item.stage?[item.stage]:[])])].map(s=>[s,s]);
}
// Old backups store people as free text. Keep spaces within a person's name.
export function peopleValues(value){
  const values=Array.isArray(value)?value:typeof value==='string'?value.split(/[,，\n]/):[];
  return [...new Set(values.map(v=>v.trim()).filter(Boolean))];
}
