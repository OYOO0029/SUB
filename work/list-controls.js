import {choiceSelect} from './ui-components.js?v=20261104-work-history-1';
import {taskContext} from './ownership.js';
import {taskPeriod} from './schedule-rules.js?v=20261104-work-history-1';
export const sortOptions=[['manual','직접 정렬'],['due','작업일자 빠른순'],['recent','최근 추가순'],['project','프로젝트순']];
export function listControls(showDone,sort,prefix,options={}){return `<div class="task-list-controls" aria-label="목록 표시 설정">${options.hideCompletion?'':choiceSelect(showDone?'all':'active',[['active','미완료'],['all','완료 포함']],`data-${prefix}-show-done`,'완료 표시')}${choiceSelect(sort,sortOptions,`data-${prefix}-sort`,'정렬')}</div>`;}
export function sortTasks(data,tasks,sort){const xs=[...tasks];if(sort==='due')xs.sort((a,b)=>(taskPeriod(a).end||'9999').localeCompare(taskPeriod(b).end||'9999'));if(sort==='recent'){const order=new Map(data.tasks.map((t,i)=>[t.id,i]));xs.sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||''))||order.get(b.id)-order.get(a.id));}if(sort==='project')xs.sort((a,b)=>(taskContext(data,a).project?.title||'\uffff').localeCompare(taskContext(data,b).project?.title||'\uffff','ko'));return xs;}
