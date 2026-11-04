import {activeProject} from './project-options.js';
import {projectState} from './project-view.js';
import {escapeHTML as esc,icon} from './ui-components.js';
const key=owner=>'work-recent-projects-v1:'+owner;
export function recentProjects(owner){try{const xs=JSON.parse(window.localStorage.getItem(key(owner))||'[]');return Array.isArray(xs)?xs.filter(x=>typeof x==='string').slice(0,20):[];}catch{return [];}}
export function rememberProject(owner,id){if(!owner||!id)return;try{window.localStorage.setItem(key(owner),JSON.stringify([id,...recentProjects(owner).filter(x=>x!==id)].slice(0,20)));}catch{}}
export function projectCandidates(projects,{owner,query='',include=false,all=false}={}){
 const ids=recentProjects(owner),q=query.trim().toLocaleLowerCase();
 const xs=projects.filter(p=>!p.deletedAt&&(include||activeProject(p))&&(!q||p.title.toLocaleLowerCase().includes(q)));
 if(q||all)return xs.sort((a,b)=>a.title.localeCompare(b.title,'ko'));
 return ids.map(id=>xs.find(p=>p.id===id)).filter(Boolean).slice(0,5);
}
export function createProjectPicker({getData,getScope,onPick}){
 let dialog,anchor,owner,current='',query='',include=false,all=false;
 const close=()=>{dialog?.close();if(anchor?.isConnected)anchor.focus();};
 function content(preserveSearch=false){
  let xs=projectCandidates(getData().projects,{owner,query,include,all});
  const fallback=!query&&!all&&!xs.length;
  if(fallback)xs=projectCandidates(getData().projects,{owner,all:true}).slice(0,5);
  const labels={done:'완료',paused:'보류',cancelled:'취소',active:'진행 중'};
  const markup=`<header><strong>프로젝트 선택</strong><button type="button" data-picker-close aria-label="닫기">${icon('close')}</button></header><input type="search" class="cell-project-search" aria-label="프로젝트 검색" placeholder="프로젝트 검색" value="${esc(query)}"><p class="project-picker-caption">${query?'검색 결과':all?'프로젝트':fallback?'진행 프로젝트':'최근 선택'}</p><div class="cell-project-options">${xs.map(p=>`<button type="button" data-pick="${esc(p.id)}" aria-pressed="${p.id===current}">${icon('folder')}<span>${esc(p.title)}</span><small>${!activeProject(p)?labels[projectState(p)]||'종료':p.id===current?'✓':''}</small></button>`).join('')||'<p class="project-picker-caption">'+(query?'검색 결과 없음':'선택할 프로젝트 없음')+'</p>'}</div>${!query&&!all?'<button type="button" class="project-picker-more" data-picker-all><span>프로젝트 더 보기</span>'+icon('chevron')+'</button>':''}<label class="project-state-toggle project-picker-settings"><input type="checkbox" data-picker-inactive ${include?'checked':''}> 완료·보류·취소 포함</label>${current?'<button type="button" class="project-picker-unlink" data-pick="">프로젝트 연결 해제</button>':''}<p role="alert" class="cell-project-error"></p>`;
  if(preserveSearch){
   const fragment=document.createElement('template');fragment.innerHTML=markup;
   const search=dialog.querySelector('input[type=search]');
   for(const child of [...dialog.children])if(child!==search)child.remove();
   dialog.prepend(fragment.content.querySelector('header'));
   fragment.content.querySelector('input[type=search]').remove();
   dialog.append(fragment.content);
  }else dialog.innerHTML=markup;
  const r=anchor.getBoundingClientRect();dialog.style.left=Math.max(12,Math.min(r.left,innerWidth-292))+'px';dialog.style.top=Math.max(12,Math.min(r.bottom+6,innerHeight-dialog.scrollHeight-12))+'px';
 }
 function ensure(){if(dialog)return;dialog=document.createElement('dialog');dialog.className='cell-project-picker surface-menu';dialog.setAttribute('aria-label','프로젝트 선택');document.body.append(dialog);
  dialog.addEventListener('input',e=>{if(e.target.type!=='search')return;query=e.target.value;content(true);});
  dialog.addEventListener('change',e=>{if(!e.target.matches('[data-picker-inactive]'))return;include=e.target.checked;all=true;content();dialog.querySelector('[data-picker-inactive]').focus();});
  dialog.addEventListener('click',e=>{if(e.target.closest('[data-picker-close]'))close();if(e.target.closest('[data-picker-all]')){all=true;content();dialog.querySelector('[data-pick]')?.focus();}const b=e.target.closest('[data-pick]');if(!b||getScope()!==owner)return;try{if(onPick(b.dataset.pick||null)===false)throw Error('저장하지 못했습니다. 다시 선택해 주세요.');rememberProject(owner,b.dataset.pick);close();}catch(err){dialog.querySelector('[role=alert]').textContent=err.message;}});
  dialog.addEventListener('keydown',e=>{if(e.isComposing||e.keyCode===229)return;if(e.target.type==='search'&&['Home','End','ArrowLeft','ArrowRight'].includes(e.key))return;if(e.key==='Escape'){e.preventDefault();close();}if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){const xs=[...dialog.querySelectorAll('[data-pick]')],i=xs.indexOf(document.activeElement);if(!xs.length)return;e.preventDefault();xs[e.key==='Home'?0:e.key==='End'?xs.length-1:(i+(e.key==='ArrowUp'?-1:1)+xs.length)%xs.length].focus();}});
  document.addEventListener('pointerdown',e=>{if(dialog.open&&!dialog.contains(e.target)&&!anchor?.contains(e.target))close();});
 }
 return {open(button,id=''){ensure();anchor=button;owner=getScope();current=id||'';query='';include=false;all=false;content();dialog.show();content();dialog.querySelector('input[type=search]').focus();}};
}
