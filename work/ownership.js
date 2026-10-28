// Read legacy dual links without rewriting records. Active work owns the project.
export function taskContext(state,task){
 const work=state.works.find(w=>w.id===task.workId&&!w.deletedAt);
 const project=state.projects.find(p=>p.id===(work?work.projectId:task.projectId)&&!p.deletedAt);
 return {work,project};
}
export function assignTaskOwner(state,task,patch){
 const has=k=>Object.hasOwn(patch,k),previous=taskContext(state,task);
 if(!has('workId')&&!has('projectId'))return;
 if(has('workId')&&patch.workId){
  const work=state.works.find(w=>w.id===patch.workId&&!w.deletedAt);
  if(!work||work.projectId&&!state.projects.some(p=>p.id===work.projectId&&!p.deletedAt))throw Error('연결할 업무를 확인해 주세요.');
  if(has('projectId')&&patch.projectId&&(patch.projectId!==work.projectId))throw Error('업무와 프로젝트의 소속이 다릅니다.');
  task.workId=work.id;task.projectId=null;return;
 }
 const projectId=has('projectId')?patch.projectId||null:previous.project?.id||null;
 if(projectId&&!state.projects.some(p=>p.id===projectId&&!p.deletedAt))throw Error('연결할 프로젝트를 확인해 주세요.');
 const keepWork=!has('workId')&&previous.work&&(previous.work.projectId||null)===projectId;
 task.workId=keepWork?previous.work.id:null;task.projectId=keepWork?null:projectId;
}
