import {projectState} from './project-view.js';
export const activeProject=p=>!p.deletedAt&&projectState(p)==='active';
export const projectStateToggle='<label class="project-state-toggle"><input type="checkbox" data-include-inactive> 완료·취소·보류 포함</label>';
export function filterProjectOptions(host,query=''){
 const include=!!host.querySelector('[data-include-inactive]')?.checked;
 host.querySelectorAll('[data-project-inactive]').forEach(e=>e.hidden=(!include&&e.dataset.projectInactive==='true')||!e.textContent.toLowerCase().includes(query.toLowerCase()));
}
