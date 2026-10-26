import {focusFixture} from './focus-fixture.mjs';
export function projectGridFixture(){
 const data=focusFixture(),baseProject=data.projects[0],baseWork=data.works[0],baseTask=data.tasks[0];
 baseProject.title='웹사이트 개편';baseWork.title='화면 디자인';
 const addProject=(id,title,lifecycle='active')=>data.projects.push({...structuredClone(baseProject),id,title,lifecycle});
 const addWork=(id,projectId,title,status='todo')=>{data.works.push({...structuredClone(baseWork),id,projectId,title});data.tasks.push({...structuredClone(baseTask),id:'task-'+id,workId:id,title:'검수용 할 일 '+id,status,checks:[],blocks:[]});};
 addWork('web-feedback','fixture-project','개발 피드백');addWork('web-docs','fixture-project','운영 자료 정리');
 addProject('site','현장 업무 관리');addWork('site-check','site','현장 확인 및 협력업체에 전달할 점검 자료 정리');addWork('site-wait','site','대기 업무는 카드에서 제외','waiting');addWork('site-done','site','완료 업무는 카드에서 제외','done');
 addProject('long','다음 분기 공동 운영을 위한 파트너 협업 프로젝트');addWork('partner','long','협업 일정 조율');
 addProject('empty','다음 분기 준비');addWork('preparing','empty','준비 중인 업무','waiting');
 addProject('paused','보류 프로젝트','paused');addProject('done','완료 프로젝트','done');
 baseProject.start='2026-10-01';baseProject.end='2027-03-31';baseWork.due='2026-11-05';data.works.find(w=>w.id==='web-feedback').due='2026-11-12';
 return data;
}
