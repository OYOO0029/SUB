export const PROJECT_STATES=[['active','진행중'],['done','완료'],['paused','보류'],['cancelled','취소']];
export function projectState(p){return p.lifecycle||({'완료':'done','종료':'done','취소':'cancelled','탈락':'cancelled','보류':'paused'}[p.stage])||'active';}
export function projectActiveWorks(data,projectId){
 const activeWorkIds=new Set(data.tasks.filter(t=>!t.deletedAt&&t.status==='todo'&&t.workId).map(t=>t.workId));
 return data.works.filter(w=>!w.deletedAt&&w.projectId===projectId&&activeWorkIds.has(w.id));
}
export function projectList(projects,states=['active'],sort='added',direction='asc'){
 const factor=direction==='desc'?-1:1;
 return projects.map((p,i)=>({p,i})).filter(({p})=>!p.deletedAt&&states.includes(projectState(p))).sort((a,b)=>{
  if(sort==='added')return (a.i-b.i)*factor;
  const av=a.p[sort==='name'?'title':sort],bv=b.p[sort==='name'?'title':sort];
  if(!av||!bv)return av?-1:bv?1:a.i-b.i;
  return String(av).localeCompare(String(bv),'ko',{numeric:true})*factor||a.i-b.i;
 }).map(({p})=>p);
}

export function projectWorkDue(data,projectId){return projectActiveWorks(data,projectId).map(w=>w.due).filter(Boolean).sort()[0]||null;}
