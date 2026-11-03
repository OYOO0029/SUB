import {choiceSelect} from './ui-components.js';
import {taskContext} from './ownership.js';
import {taskPeriod} from './schedule-rules.js';
export const sortOptions=[['manual','직접 정렬'],['due','작업일자 빠른순'],['recent','최근 추가순'],['project','프로젝트순']];
export function listControls(showDone,sort,prefix){return `<div class="task-list-controls" aria-label="목록 표시 설정"><label><input type="checkbox" data-${prefix}-show-done ${showDone?'checked':''}> 완료 보기</label>${choiceSelect(sort,sortOptions,`data-${prefix}-sort`,'정렬')}</div>`;}
export function sortTasks(data,tasks,sort){const xs=[...tasks];if(sort==='due')xs.sort((a,b)=>(taskPeriod(a).end||'9999').localeCompare(taskPeriod(b).end||'9999'));if(sort==='recent'){const order=new Map(data.tasks.map((t,i)=>[t.id,i]));xs.sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||''))||order.get(b.id)-order.get(a.id));}if(sort==='project')xs.sort((a,b)=>(taskContext(data,a).project?.title||'\uffff').localeCompare(taskContext(data,b).project?.title||'\uffff','ko'));return xs;}
