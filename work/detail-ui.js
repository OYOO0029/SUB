import {statusFilter} from './status-filter.js?v=20261026-controls-1';
import {projectTasks,unfinished,removeFromDay} from './workflow.js?v=20261027-task-flow-3';
import {PROJECT_STATES,projectState} from './project-view.js';
import {uid,today,taskStart,planFor,isPlanned,setTime,removeTime,taskContext} from './model.js?v=20261027-task-flow-3';
import {getItem,createItem,updateItem,updateMemo,changeCheck,selectDetailOption,updatePlan,trashItem,restoreItem,activeChecks,slotRange,timeGridState,minutes,conflicts} from './editing.js?v=20261027-task-flow-3';
import {statusOptions,stageOptions,peopleValues} from './detail-fields.js?v=20261026-controls-1';
import {deadlineConflict} from './work-view.js?v=20261026-controls-1';
import {createDatePicker,dateLabel,deadlineLabel} from './date-picker.js?v=20261027-task-flow-3';

export function createDetailUI({getData,ui,esc,icon,button,property,taskCard,workCard,save,notify}){
  const $=s=>document.querySelector(s),labels={task:'할 일',work:'업무',project:'프로젝트'};
  let history=[],timeDraft=null,pendingLifecycle=null;
  let dateFormat='absolute';try{dateFormat=localStorage.getItem('what-to-do:detail-date-format')||'absolute';}catch{}
  const showDate=value=>deadlineLabel(value,dateFormat);
  const item=()=>getItem(getData(),ui.detail.type,ui.detail.id);
  const blank='<span class="empty-value">비어 있음</span>';
  const valueButton=(value,action,attrs='')=>button(value?esc(value):blank,action,attrs,`inline-value ${value?'':'is-empty'}`);
  function textField(field,value,label,multiline=false){const attrs=`data-inline-field="${field}" aria-label="${label}" placeholder="${multiline?'메모 입력':'비어 있음'}" maxlength="${multiline?5000:160}"`;return multiline?`<textarea class="inline-input inline-memo" ${attrs} rows="3">${esc(value||'')}</textarea>`:`<input class="inline-input" ${attrs} value="${esc(value||'')}">`;}
  function relation(field,value,type){const related=getItem(getData(),type,value);return `<div class="relation-value">${valueButton(related&&!related.deletedAt?related.title:'','field-relation',`data-field="${field}" data-related="${type}" aria-expanded="false"`)}</div>`;}
  const chipValues=(e,field)=>field==='people'?peopleValues(e.people):e.tags;
  const chipLabel=field=>field==='people'?'인원':'태그';
  function chipsField(e,field='tags'){const label=chipLabel(field);return `<div class="inline-tags">${chipValues(e,field).map((t,i)=>`<span class="tag">${esc(t)}${button(icon('close'),'remove-chip',`data-field="${field}" data-index="${i}" aria-label="${esc(t)} ${label} 삭제"`,'tag-remove')}</span>`).join('')}${button('+ '+label,'chip-picker',`data-field="${field}" aria-label="${label} 선택 또는 추가"`,'quiet-link')}</div>`;}
  function chipPicker(field){
    const label=chipLabel(field),values=[...new Set(['tasks','works','projects'].flatMap(k=>getData()[k].filter(e=>!e.deletedAt).flatMap(e=>chipValues(e,field))))].filter(t=>!chipValues(item(),field).includes(t)).sort((a,b)=>a.localeCompare(b,'ko'));
    popover(label+' 선택',`<form data-chip-picker="${field}"><input id="chip-search" name="value" class="relation-search" placeholder="${field==='people'?'이름 검색 또는 새 이름 입력':'기존 태그 검색 또는 새 태그 입력'}" aria-label="${label} 검색 또는 추가" maxlength="${field==='people'?160:40}" autocomplete="off"><div class="relation-options">${values.map(t=>button(esc(t),'choose-chip',`type="button" data-field="${field}" data-value="${esc(t)}"`,'relation-option chip-option')).join('')}</div><button type="submit" class="relation-create" id="chip-create" hidden>추가</button><p class="property-error" role="alert"></p></form>`);$('#chip-search').focus();
  }
  function choiceField(field,value,options,label){return `<div class="choice-field"><fieldset class="inline-choices"><legend class="sr-only">${label}</legend>${options.map(([v,t])=>`<label class="choice-option"><input type="radio" name="detail-${field}" data-choice-field="${field}" value="${esc(v)}" ${value===v?'checked':''}><span>${esc(t)}</span></label>`).join('')}${button(icon('plus'),'add-choice',`type="button" aria-label="${label} 항목 추가" aria-expanded="false"`,'icon-button choice-add')}</fieldset><form data-choice-form hidden><input name="label" aria-label="새 ${field==='status'?'상태':'진행 단계'} 이름" placeholder="항목 이름" maxlength="40" required autocomplete="off"><button type="submit" class="quiet-link">저장</button>${button('취소','cancel-choice','type="button"','quiet-link')}<p class="property-error" role="alert"></p></form></div>`;}
  function dateProperty(label,field,text){return property(label,'calendar',valueButton(text.replace(/\d{4}-\d{2}-\d{2}/g,showDate),'field-date',`data-field="${field}" aria-label="${label} 편집"`));}
  const workQuery={search:'',sort:'added',status:'all'};
  function workTasks(e){
    const all=getData().tasks.filter(t=>t.workId===e.id&&!t.deletedAt),xs=all.filter(t=>(!workQuery.search||t.title.toLowerCase().includes(workQuery.search.toLowerCase()))&&(workQuery.status==='all'&&t.status!=='cancelled'||(workQuery.status==='active'?unfinished(t):t.status===workQuery.status)));
    if(workQuery.sort!=='added')xs.sort((a,b)=>workQuery.sort==='due'?(a.due||'9999').localeCompare(b.due||'9999'):a.title.localeCompare(b.title,'ko'));
    const menu=(id,label,content)=>`<div class="wd-menu" data-dropdown>${button(`<span>${label}</span>${icon('down')}`,'menu',`data-menu-toggle aria-haspopup="menu" aria-expanded="false" aria-controls="${id}"`,'pl-column')}<div id="${id}" class="surface-menu" data-menu-panel hidden>${content}</div></div>`;
    return `<section class="wd-tasks"><div class="section-heading"><h3>할 일 <span class="count">${all.filter(t=>t.status==='done').length}/${all.filter(t=>t.status!=='cancelled').length}</span></h3><div class="ux-tools">${statusFilter(workQuery.status,'data-work-task-status','업무 할 일 상태',{cancelled:true})}${button(icon('plus'),'add',`data-work-id="${esc(e.id)}" aria-label="할 일 추가"`,'icon-button')}</div></div><div class="pl-table-wrap"><table class="pl-table wd-table" aria-label="업무의 할 일"><colgroup><col style="width:36px"><col><col style="width:94px"><col style="width:42px"><col style="width:42px"></colgroup><thead><tr><th aria-label="완료"></th><th>${menu('wd-name','할 일',`<form data-work-search><input name="query" aria-label="할 일 검색" value="${esc(workQuery.search)}" placeholder="검색 후 Enter"></form>`+button('등록순','work-sort','data-value="added"','menu-option')+button('이름순','work-sort','data-value="title"','menu-option'))}</th><th>${menu('wd-due','마감',button('마감 빠른순','work-sort','data-value="due"','menu-option'))}</th><th>집중</th><th aria-label="관리">${icon('more')}</th></tr></thead><tbody>${xs.map(t=>`<tr class="${t.status==='done'?'is-done':''}"><td><input type="checkbox" data-complete="${esc(t.id)}" aria-label="${esc(t.title)} 완료" ${t.status==='done'?'checked':''}></td><td class="pl-text"><input class="list-title-edit" spellcheck="false" data-list-title="${esc(t.id)}" aria-label="${esc(t.title)} 제목" value="${esc(t.title)}" maxlength="160">${button(icon('note'),'detail',`data-type="task" data-id="${esc(t.id)}" aria-label="${esc(t.title)} 상세 보기" title="상세 보기"`,'icon-button row-detail')}</td><td><button class="cell-edit" data-tt="edit-due" data-id="${esc(t.id)}" aria-label="${esc(t.title)} 마감 변경">${t.due?esc(deadlineLabel(t.due)):'<span class="ux-empty">-</span>'}</button></td><td>${unfinished(t)?`<button class="tt-focus" data-tt="focus" data-work-focus data-id="${esc(t.id)}" aria-label="${esc(t.title)} 집중">${icon('play')}</button>`:''}</td><td>${button(icon('trash'),'delete-task',`data-id="${esc(t.id)}" aria-label="${esc(t.title)} 삭제" title="삭제"`,'icon-button row-delete')}</td></tr>`).join('')||'<tr><td colspan="5" class="pl-empty">표시할 할 일이 없습니다.</td></tr>'}</tbody></table></div>${workQuery.search||workQuery.status!=='all'?button('필터 해제','work-clear','','quiet-link'):''}</section>`;
  }
  function header(e,type){return `<header class="detail-header"><div class="detail-nav">${history.length?button(icon('left'),'detail-back','aria-label="이전 상세로 돌아가기"','icon-button'):''}<span class="detail-eyebrow">${labels[type]}</span><span class="inline-save-state" data-save-state role="status">${ui.saveWarning?'저장 실패 · 입력 유지':ui.cloudStatus==='error'?'동기화 실패':ui.cloudStatus==='offline'?'오프라인 · 기기에 저장':'자동 저장'}</span>${button(icon('close'),'close-detail','aria-label="상세 닫기"','icon-button')}</div><h2 id="detail-title" class="${type==='task'?'task-detail-title':''}">${type==='task'?`<input class="task-check detail-complete" type="checkbox" data-complete="${esc(e.id)}" aria-label="${esc(e.title)} 완료" ${e.status==='done'?'checked':''}>`:''}<textarea rows="1" class="detail-title-input" data-inline-field="title" aria-label="${labels[type]} 이름" maxlength="160">${esc(e.title)}</textarea></h2><p id="inline-error" role="alert"></p></header>`;}
  function checks(t){const xs=activeChecks(t);return `<div class="property-row check-section"><dt>${icon('check')}하위 할 일</dt><dd><div class="detail-check-heading">${xs.length?`<span class="count">${xs.filter(c=>c.done).length}/${xs.length}</span>`:''}${checkAddButton(t.id)}</div><div class="detail-checks">${xs.map(c=>`<div class="editable-check ${c.done?'checked':''}"><input type="checkbox" data-check="${c.id}" data-task-id="${t.id}" aria-label="${esc(c.title)} 확인" ${c.done?'checked':''}><input class="inline-input" data-check-title="${c.id}" data-task-id="${t.id}" aria-label="확인사항 내용" value="${esc(c.title)}" maxlength="160">${button(icon('close'),'delete-check',`data-task-id="${t.id}" data-check-id="${c.id}" aria-label="${esc(c.title)} 확인사항 삭제"`,'icon-button check-delete')}</div>`).join('')}</div>${checkForm(t.id)}</dd></div>`;}
  function checkAddButton(id){return button(icon('plus'),'open-check-add',`data-task-id="${esc(id)}" type="button" aria-label="확인사항 추가" title="확인사항 추가" aria-expanded="false"`,'icon-button check-add-trigger');}
  function checkForm(id){return `<form class="inline-check-add" data-check-form="${esc(id)}" hidden><input name="title" placeholder="확인사항 입력" aria-label="새 확인사항 내용" maxlength="160" required autocomplete="off"><button type="submit" class="quiet-link" aria-label="확인사항 저장">저장</button>${button('취소','cancel-check-add','type="button" aria-label="확인사항 취소"','quiet-link')}</form>`;}
  function closeCheckForm(form){form.hidden=true;form.reset();const scope=form.closest('.task-card,.check-section'),trigger=scope.querySelector('.check-add-trigger');trigger.setAttribute('aria-expanded','false');trigger.focus();}
  function projectInfo(e){
    const state=projectState(e),status=`<select data-project-lifecycle data-state="${state}" aria-label="프로젝트 현황">${PROJECT_STATES.map(([v,l])=>`<option value="${v}" ${state===v?'selected':''}>${l}</option>`).join('')}</select>`;
    const props=property('사업비','note',textField('budget',e.budget,'사업비'))+property('관련 인원','users',chipsField(e,'people'))+property('태그','tag',chipsField(e))+property('메모','note',textField('notes',e.notes,'메모',true));
    return `<section class="pl-project-properties" data-project-context="${esc(e.id)}"><div class="pl-page-heading"><input class="detail-title-input" data-inline-field="title" aria-label="프로젝트 이름" value="${esc(e.title)}" maxlength="160">${status}${button(icon('trash'),'delete-project',`data-id="${esc(e.id)}" aria-label="프로젝트 삭제" title="삭제"`,'icon-button')}</div><p id="project-inline-error" role="alert"></p><dl class="pl-project-period">${dateProperty('사업 기간','period',e.start?`${e.start}${e.end&&e.end!==e.start?' – '+e.end:''}`:'')}</dl><details class="pl-project-extra" data-fold="project-info-${esc(e.id)}"><summary>프로젝트 정보</summary><dl class="properties">${props}</dl></details></section>`;
  }
  for(const event of ['pointerdown','focusin'])document.addEventListener(event,e=>{const host=e.target.closest('[data-project-context]');if(host)ui.detail={type:'project',id:host.dataset.projectContext};},true);
  function changeProjectState(id,value){
    if(!PROJECT_STATES.some(([v])=>v===value))return;
    const remaining=projectTasks(getData(),id).filter(unfinished);
    if(value!=='active'&&remaining.length){pendingLifecycle={id,value};const label=PROJECT_STATES.find(([v])=>v===value)[1];popover('프로젝트 '+label,`<p>미완료 할 일이 ${remaining.length}개 있습니다. 할 일의 완료 상태와 마감일은 유지됩니다.</p><div class="lifecycle-actions">${button('프로젝트 상태만 변경','apply-project-state','data-remove="no"','small-button')}${remaining.some(t=>isPlanned(t,today()))?button('오늘 배치도 해제','apply-project-state','data-remove="yes"','small-button'):''}${button('취소','cancel-project-state','','quiet-link')}</div>`);}
    else{updateItem(getData(),'project',id,{lifecycle:value});persist();}
  }
  function render(){
    if(!ui.detail)return;if(ui.detail.type==='project'&&ui.projectPage===ui.detail.id&&!$('#detail').open)return;const {type,id}=ui.detail,e=item(),data=getData();if(!e||e.deletedAt){$('#detail').close();return;}
    $('#detail').classList.toggle('minimal-task',type==='task');
    $('#detail').classList.toggle('minimal-work',type==='work');
    let props='',body='',extra='';
    if(type==='task'){
      const {work,project}=taskContext(data,e),p=planFor(e,ui.date)||e.plans.find(p=>p.state==='active');
      const planned=p?`${p.start}${p.end!==p.start?' – '+p.end:''}`:'';
      const reminder=property('리마인드','calendar',`<div class="task-reminder"><input type="checkbox" data-task-reminder aria-label="리마인드 사용" ${e.remindFrom?'checked':''}>${e.remindFrom?valueButton(showDate(e.remindFrom)+' – '+(e.remindUntil?showDate(e.remindUntil):'종료일 없음'),'field-date','data-field="remindFrom" aria-label="리마인드 기간 변경"'):'<span class="empty-value">사용 안 함</span>'}</div>`);
      props=property('프로젝트','folder',relation('projectId',project&&!project.deletedAt?project.id:null,'project'))+property('업무','briefcase',relation('workId',e.workId,'work'))+dateProperty('작업 시작','startDate',taskStart(e)||'')+dateProperty('마감','due',e.due?`${e.due}${e.dueTime?' '+e.dueTime:''}`:'')+reminder+checks(e)+property('메모','note',textField('notes',e.notes,'메모',true));
      extra=property('시간 배치','clock',valueButton(e.blocks.filter(b=>b.date===ui.date).map(b=>`${b.start} – ${b.end}`).join(' / '),'time',`data-id="${id}"`));

    }else if(type==='work'){
      props=dateProperty('마감','due',e.due||'');
      body=workTasks(e);

    }else{
      const works=data.works.filter(w=>w.projectId===id&&!w.deletedAt);
      props=property('프로젝트 상태','folder',`<fieldset class="inline-choices"><legend class="sr-only">프로젝트 상태</legend>${PROJECT_STATES.map(([v,l])=>`<label class="choice-option"><input type="radio" name="project-lifecycle" data-project-lifecycle value="${v}" ${projectState(e)===v?'checked':''}><span>${l}</span></label>`).join('')}</fieldset>`)+property('진행 단계','briefcase',choiceField('stage',e.stage,stageOptions(data,type,e),'프로젝트 진행 단계'))+dateProperty('사업 기간','period',e.start?`${e.start} – ${e.end}`:'')+property('사업비','note',textField('budget',e.budget,'사업비'));
      body=`<section class="detail-section"><div class="section-heading"><h3>업무 묶음 <span class="count">${works.length}</span></h3>${button(icon('plus')+'추가','add-work',`data-project-id="${id}"`,'quiet-link')}</div><div class="task-list">${works.map(workCard).join('')}</div></section>`;
    }
    const shared=property('관련 인원','users',chipsField(e,'people'))+property('태그','tag',chipsField(e));
    if(type==='work'){
      $('#detail').innerHTML=`<header class="detail-header wd-simple-header"><h2 id="detail-title"><input class="detail-title-input" data-inline-field="title" aria-label="업무 이름" value="${esc(e.title)}" maxlength="160"></h2>${button(icon('close'),'close-detail','aria-label="상세 닫기"','icon-button')}<p id="inline-error" role="alert"></p></header><div class="detail-body">${body}</div>`;return;
    }
    $('#detail').innerHTML=header(e,type)+`<div class="detail-body"><dl class="properties">${props}${type==='task'?'':shared+property('메모','note',textField('notes',e.notes,'메모',true))}</dl>${type==='task'?`<details class="detail-extra"><summary>기타 정보</summary><dl class="properties">${extra}${shared}</dl></details>`:''}${body}</div><footer class="detail-footer">${button(icon('trash'),'trash-entity',`aria-label="${labels[type]} 휴지통으로 이동"`,'icon-button danger')}<span class="detail-footer-spacer" aria-hidden="true"></span>${type==='task'&&!isPlanned(e,today())&&unfinished(e)?button(icon('calendar'),'do-today',`data-id="${id}" aria-label="오늘 하기" title="오늘 하기"`,'icon-button'):''}</footer>`;

  }
  function open(type,id){
    if(type==='project'){window.dispatchEvent(new CustomEvent('work-open-project',{detail:id}));return;}
    if($('#detail').open&&ui.detail&&(ui.detail.type!==type||ui.detail.id!==id))history.push({...ui.detail,scroll:$('#detail').scrollTop});else if(!$('#detail').open)history=[];
    if(type==='work'&&ui.detail?.id!==id)Object.assign(workQuery,{search:'',sort:'added',status:'all'});
    ui.detail={type,id};ui.inlineSaved='';$('#detail').classList.add('flow-drawer');render();if(!$('#detail').open)$('#detail').showModal();$('#detail').scrollTop=0;
  }
  function persist(refresh=true,refreshList=true){save(refreshList);if(refresh)render();else if(ui.saveWarning)error(new Error(ui.saveWarning));const hint=$('[data-save-state]');if(hint)hint.textContent=ui.saveWarning?'저장 실패 · 입력 유지':'기기에 저장됨';}
  function error(err){const out=$('#detail').open?$('#detail #inline-error'):$('#project-inline-error')||$('#inline-error');if(out)out.textContent=err.message;else notify(err.message);}
  function popover(title,body,cls=''){closeRelation();const el=$('#property-editor');el.className=cls;el.innerHTML=`<header><h3 id="property-editor-title">${title}</h3>${button(icon('close'),'close-property','aria-label="속성 닫기" type="button"','icon-button')}</header>${body}`;if(!el.open)el.showModal();}
  function focusRelation(field){$(`#detail [data-action="field-relation"][data-field="${field}"]`)?.focus();}
  function closeRelation(restoreFocus=false){
    const panel=$('.relation-dropdown');if(!panel)return;
    const trigger=panel.parentElement.querySelector('[data-action="field-relation"]');
    panel.remove();trigger.setAttribute('aria-expanded','false');trigger.removeAttribute('aria-controls');
    if(restoreFocus)trigger.focus();
  }
  function sizeRelation(){
    const panel=$('.relation-dropdown');if(!panel)return;
    const bottom=Math.min(window.innerHeight,$('#detail').getBoundingClientRect().bottom);
    panel.style.maxHeight=Math.max(140,bottom-panel.getBoundingClientRect().top-12)+'px';
  }
  window.addEventListener('resize',sizeRelation);
  $('#detail').addEventListener('scroll',sizeRelation);
  function relationEditor(field,type,anchor){
    const wasOpen=anchor.getAttribute('aria-expanded')==='true';closeRelation();if(wasOpen)return;
    const project=ui.detail.type==='task'?taskContext(getData(),item()).project:null;
    const xs=getData()[type==='work'?'works':'projects'].filter(x=>!x.deletedAt&&(type!=='work'||ui.detail.type!=='task'||(x.projectId||null)===(project?.id||null)));
    const current=field==='projectId'&&ui.detail.type==='task'?project?.id:item()[field];
    anchor.parentElement.insertAdjacentHTML('beforeend',`<div id="relation-dropdown" class="relation-dropdown" role="region" aria-label="${labels[type]} 선택"><input id="relation-search" class="relation-search" placeholder="검색 또는 새로 만들기" aria-label="연결 항목 검색" autocomplete="off"><div class="relation-options">${button('비어 있음','choose-relation',`data-field="${field}" data-value="" aria-pressed="${!current}"`,'relation-option empty-value')}${xs.map(x=>button(esc(x.title),'choose-relation',`data-field="${field}" data-value="${x.id}" aria-pressed="${x.id===current}"`,'relation-option')).join('')}</div><p class="relation-no-results empty-value" hidden>검색 결과 없음</p>${button(icon('plus')+'새 '+labels[type]+' 만들기','create-relation',`data-field="${field}" data-related="${type}"`,'relation-create')}<p class="property-error" role="alert"></p></div>`);
    sizeRelation();
    anchor.setAttribute('aria-expanded','true');anchor.setAttribute('aria-controls','relation-dropdown');$('#relation-search').focus();
  }
  document.addEventListener('pointerdown',event=>{if($('.relation-dropdown')&&!event.target.closest('.relation-value'))closeRelation();},true);
  document.addEventListener('focusin',event=>{if($('.relation-dropdown')&&!event.target.closest('.relation-value'))closeRelation();});
  document.addEventListener('keydown',event=>{
    const panel=$('.relation-dropdown');if(!panel)return;
    if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();closeRelation(true);return;}
    if(!panel.contains(event.target)||!['ArrowDown','ArrowUp'].includes(event.key))return;
    event.preventDefault();const choices=[...panel.querySelectorAll('button:not([hidden])')],index=choices.indexOf(document.activeElement),step=event.key==='ArrowDown'?1:-1;
    choices[(index+step+choices.length)%choices.length]?.focus();
  },true);
  const calendar=createDatePicker({dialog:$('#property-editor'),esc,icon,onFormat:format=>{dateFormat=format;try{localStorage.setItem('what-to-do:detail-date-format',format);}catch{}render();},onCommit:d=>{
    const data=getData();
    if(d.field==='startDate')updateItem(data,'task',ui.detail.id,{startDate:d.start||null});
    else if(d.field==='plan')updatePlan(data,ui.detail.id,d.start,d.end);
    else updateItem(data,ui.detail.type,ui.detail.id,d.field==='remindFrom'?{remindFrom:d.start||null,remindUntil:d.start&&d.range?d.end||null:null}:d.field==='period'?{start:d.start||null,end:d.end||null}:{[d.field]:d.start||null,...(d.allowTime?{dueTime:d.includeTime?d.time:''}:{}),...(d.reminderChanged?{remindFrom:d.reminder}:{})});
    persist();
  }});
  function dateEditor(field,anchor){
    closeRelation();const e=item(),p=e.plans&&(planFor(e,ui.date)||e.plans.find(p=>p.state==='active')),range=['plan','period','remindFrom'].includes(field),dueTask=field==='due'&&ui.detail.type==='task';
    calendar.open({field,title:{startDate:'작업 시작',plan:'작업 기간',period:'사업 기간',due:'마감',remindFrom:'리마인드 기간'}[field],start:field==='startDate'?taskStart(e):field==='plan'?p?.start:field==='period'?e.start:e[field],end:field==='remindFrom'?e.remindUntil:field==='plan'?p?.end:e.end,allowRange:range,range:field==='remindFrom'&&!!e.remindUntil,allowTime:dueTask,time:dueTask?e.dueTime:'',allowReminder:false,reminder:dueTask?e.remindFrom:null,format:dateFormat,anchor:anchor.getBoundingClientRect()});
  }
  function create(type='task',opts={}){
    $('#editor').innerHTML=`<header class="editor-header"><h2 id="editor-title">${labels[type]} 추가</h2>${button(icon('close'),'close-editor','type="button" aria-label="닫기"','icon-button')}</header><form data-create-form="${type}" data-work-id="${opts.workId||''}" data-project-id="${opts.projectId||''}" data-date="${opts.date||(opts.projectId||opts.workId?'':ui.date)}"><div class="editor-body"><input class="create-title" name="title" aria-label="새 ${labels[type]} 이름" placeholder="${labels[type]} 이름" required maxlength="160"><p class="form-error" role="alert"></p></div><footer class="editor-footer"><button type="submit" class="small-button">추가</button></footer></form>`;
    $('#editor').showModal();$('#editor input').focus();
  }
  function timeEditor(id,date=ui.date){const t=getItem(getData(),'task',id),b=t.blocks.find(b=>b.date===date);timeDraft={id,date,first:b?Math.floor(minutes(b.start)/10):null,last:b?Math.ceil(minutes(b.end)/10)-1:null,awaitingEnd:false};renderTime();if(!$('#editor').open)$('#editor').showModal();scrollTime();}
  function scrollTime(){
    const state=timeGridState(timeDraft.date,timeDraft.first),grid=$('.time-grid-scroll'),slot=$(`[data-action="time-slot"][data-index="${state.focusIndex}"]`),row=slot?.closest('.time-grid-row');
    if(grid&&row){slot.focus({preventScroll:true});grid.scrollTop+=row.getBoundingClientRect().top-grid.getBoundingClientRect().top-4;}
  }
  function renderTime(){
    const d=timeDraft,t=getItem(getData(),'task',d.id),hasRange=d.first!==null,range=hasRange?slotRange(d.first,d.last):null,overlaps=range?conflicts(getData(),d.id,d.date,range.start,range.end):[],clockState=timeGridState(d.date,d.first);
    const existing=t.blocks.find(b=>b.date===d.date),legacy=existing&&(minutes(existing.start)%10||minutes(existing.end)%10);
    const rows=Array.from({length:11},(_,offset)=>{const hour=offset+8;return `<div class="time-grid-row" data-hour="${hour}"><span>${String(hour).padStart(2,'0')}:00</span>${Array.from({length:6},(_,n)=>{
      const index=hour*6+n,r=slotRange(index),busy=conflicts(getData(),d.id,d.date,r.start,r.end),selected=hasRange&&index>=Math.min(d.first,d.last)&&index<=Math.max(d.first,d.last),past=index<clockState.pastBefore,current=index===clockState.currentIndex;
      return button(String(n*10).padStart(2,'0'),'time-slot',`data-index="${index}" aria-label="${r.start}부터 ${r.end}까지${current?' · 현재 시간':past?' · 지난 시간':''}${busy.length?' · 다른 일정 있음':''}" aria-pressed="${selected}" ${current?'aria-current="time"':''} title="${r.start}–${r.end}${past?' · 지난 시간':current?' · 현재 시간':''}${busy.length?' · '+esc(busy.map(x=>x.title).join(', ')):''}"`,'time-slot'+(past?' past':'')+(current?' current':'')+(selected?' selected':'')+(busy.length?' occupied':''));
    }).join('')}</div>`;}).join('');
    $('#editor').classList.add('time-editor');$('#editor').innerHTML=`<header class="editor-header"><h2 id="editor-title">${esc(t.title)}</h2>${button(icon('close'),'close-editor','aria-label="닫기"','icon-button')}</header><div class="editor-body"><div class="time-grid-heading"><p class="schedule-label">시간 배치</p><output class="time-range-summary" aria-live="polite">${range?`${range.start} – ${range.end} · ${(Math.abs(d.last-d.first)+1)*10}분`:''}</output></div><div class="time-grid-scroll"><div class="time-grid">${rows}</div></div>${legacy?'<p class="form-help">기존 시간은 10분 경계로 제안됩니다. 저장할 때 적용됩니다.</p>':''}${overlaps.length?`<p class="time-conflict" role="status">시간 겹침: ${esc([...new Set(overlaps.map(x=>x.title))].join(', '))}</p>`:''}${range&&deadlineConflict(t,d.date,range.end)?`<p class="time-conflict" role="status">배치 시간이 실제 마감(${esc(t.due)} ${esc(t.dueTime||'')})을 넘습니다. 마감일은 유지됩니다.</p>`:''}<p class="form-error" role="alert"></p></div><footer class="editor-footer">${existing?button('배치 해제','time-clear','','quiet-link'):''}<button data-action="time-save" class="small-button" ${range?'':'disabled'}>저장</button></footer>`;
  }
  function trash(){
    const data=getData(),entries=['task','work','project'].flatMap(type=>data[type==='task'?'tasks':type==='work'?'works':'projects'].filter(e=>e.deletedAt).map(e=>`<div class="trash-row"><span><small>${labels[type]}</small> ${esc(e.title)}</span>${button('복구','restore-entity',`data-type="${type}" data-id="${e.id}"`,'small-button')}</div>`));
    for(const t of data.tasks)for(const c of t.checks.filter(c=>c.deletedAt))entries.push(`<div class="trash-row"><span><small>확인사항</small> ${esc(c.title)}</span>${button('복구','restore-check',`data-task-id="${t.id}" data-check-id="${c.id}"`,'small-button')}</div>`);
    $('#editor').innerHTML=`<header class="editor-header"><h2 id="editor-title">휴지통</h2>${button(icon('close'),'close-editor','aria-label="닫기"','icon-button')}</header><div class="editor-body">${entries.join('')||'<p class="empty-value">비어 있음</p>'}</div>`;if(!$('#editor').open)$('#editor').showModal();
  }
  document.addEventListener('click',e=>{if(e.target.closest('[data-work-focus]'))$('#detail').close();},true);
  document.addEventListener('change',e=>{if(e.target.matches('[data-work-task-status]')){workQuery.status=e.target.value;render();document.querySelector('[data-work-task-status]')?.focus();}});
  document.addEventListener('submit',e=>{if(!e.target.matches('[data-work-search]'))return;e.preventDefault();workQuery.search=new FormData(e.target).get('query').trim();render();});
  const actions=new Set(['work-sort','work-status','work-clear','chip-picker','choose-chip','remove-chip','add-choice','cancel-choice','detail-back','field-relation','choose-relation','create-relation','field-date','close-property','delete-check','open-check-add','cancel-check-add','trash-entity','restore-entity','restore-check','time-slot','time-save','time-clear','quick-add','quick-cancel','apply-project-state','cancel-project-state']);
  document.addEventListener('click',event=>{
    const el=event.target.closest('[data-action]');if(!el||!actions.has(el.dataset.action))return;event.preventDefault();event.stopImmediatePropagation();const a=el.dataset.action,data=getData();
    try{
      if(a==='work-sort'||a==='work-status'||a==='work-clear'){if(a==='work-clear')Object.assign(workQuery,{search:'',status:'all'});else workQuery[a==='work-sort'?'sort':'status']=el.dataset.value;render();}
      else if(a==='apply-project-state'){const draft=pendingLifecycle;if(!draft)return;updateItem(data,'project',draft.id,{lifecycle:draft.value});if(el.dataset.remove==='yes')projectTasks(data,draft.id).filter(unfinished).forEach(t=>{if(isPlanned(t,today()))removeFromDay(t,today());});pendingLifecycle=null;$('#property-editor').close();persist();}
      else if(a==='cancel-project-state'){pendingLifecycle=null;$('#property-editor').close();render();}
      else if(a==='chip-picker')chipPicker(el.dataset.field);
      else if(a==='choose-chip'){const field=el.dataset.field;updateItem(data,ui.detail.type,ui.detail.id,{[field]:[...new Set([...chipValues(item(),field),el.dataset.value])]});$('#property-editor').close();persist();focusChip(field);}
      else if(a==='add-choice'){const form=el.closest('.choice-field').querySelector('[data-choice-form]');form.hidden=false;el.setAttribute('aria-expanded','true');form.elements.label.focus();}
      else if(a==='cancel-choice')closeChoiceForm(el.closest('[data-choice-form]'));
      else if(a==='detail-back'){const previous=history.pop();if(previous){ui.detail={type:previous.type,id:previous.id};ui.inlineSaved='';render();$('#detail').scrollTop=previous.scroll;}}
      else if(a==='field-relation')relationEditor(el.dataset.field,el.dataset.related,el);
      else if(a==='choose-relation'){updateItem(data,ui.detail.type,ui.detail.id,{[el.dataset.field]:el.dataset.value||null});closeRelation();persist();focusRelation(el.dataset.field);}
      else if(a==='create-relation'){const title=$('#relation-search').value.trim();if(!title)throw new Error('새 항목의 이름을 입력해 주세요.');const related=createItem(data,el.dataset.related,title,el.dataset.related==='work'&&ui.detail.type==='task'?{projectId:taskContext(data,item()).project?.id||null}:{});updateItem(data,ui.detail.type,ui.detail.id,{[el.dataset.field]:related.id});closeRelation();persist();focusRelation(el.dataset.field);}
      else if(a==='field-date')dateEditor(el.dataset.field,el);
      else if(a==='close-property')$('#property-editor').close();
      else if(a==='remove-chip'){const field=el.dataset.field;updateItem(data,ui.detail.type,ui.detail.id,{[field]:chipValues(item(),field).filter((_,i)=>i!==Number(el.dataset.index))});persist();focusChip(field);}
      else if(a==='open-check-add'){const form=el.closest('.task-card,.check-section').querySelector('[data-check-form]');form.hidden=false;el.setAttribute('aria-expanded','true');form.querySelector('input').focus();}
      else if(a==='cancel-check-add')closeCheckForm(el.closest('[data-check-form]'));
      else if(a==='delete-check'){changeCheck(data,el.dataset.taskId,el.dataset.checkId,{deletedAt:new Date().toISOString()});persist();notify('확인사항을 휴지통으로 이동했습니다.');}
      else if(a==='trash-entity'){trashItem(data,ui.detail.type,ui.detail.id);if(ui.detail.type==='project'){ui.projectPage=null;ui.detail=null;}$('#detail').close();persist(false);notify('휴지통으로 이동했습니다. 연결된 항목은 유지됩니다.');}
      else if(a==='restore-entity'){restoreItem(data,el.dataset.type,el.dataset.id);persist(false);trash();}
      else if(a==='restore-check'){changeCheck(data,el.dataset.taskId,el.dataset.checkId,{deletedAt:null});persist(false);trash();}
      else if(a==='time-slot'){const scroll=$('.time-grid-scroll').scrollTop,index=Number(el.dataset.index);if(timeDraft.awaitingEnd){timeDraft.last=index;timeDraft.awaitingEnd=false;}else{timeDraft.first=index;timeDraft.last=index;timeDraft.awaitingEnd=true;}renderTime();$('.time-grid-scroll').scrollTop=scroll;$(`[data-action="time-slot"][data-index="${index}"]`)?.focus({preventScroll:true});}
      else if(a==='time-save'){const r=slotRange(timeDraft.first,timeDraft.last);setTime(getItem(data,'task',timeDraft.id),timeDraft.date,r.start,r.end);ui.date=timeDraft.date;$('#editor').close();persist();}
      else if(a==='time-clear'){removeTime(getItem(data,'task',timeDraft.id),timeDraft.date);$('#editor').close();persist();}
      else if(a==='quick-add'){el.outerHTML=`<form class="quick-task-form" data-quick-task><input name="title" placeholder="할 일 이름" aria-label="빠른 할 일 이름" required maxlength="160" autofocus><button type="submit" class="quiet-link">저장</button>${button('취소','quick-cancel','type="button" aria-label="빠른 추가 취소"','quiet-link')}</form>`;$('[data-quick-task] input').focus();}
      else if(a==='quick-cancel'){save();$('[data-action="quick-add"]')?.focus();}
    }catch(err){const out=$('.relation-dropdown .property-error')||$('#property-editor[open] .property-error')||$('#editor[open] .form-error');if(out)out.textContent=err.message;else error(err);}
  },true);
  document.addEventListener('input',event=>{
    if(event.target.id==='chip-search'){
      const q=event.target.value.trim(),field=event.target.closest('[data-chip-picker]').dataset.chipPicker;
      document.querySelectorAll('.chip-option').forEach(e=>e.hidden=!!q&&!e.textContent.toLowerCase().includes(q.toLowerCase()));
      const create=$('#chip-create');create.hidden=!q||chipValues(item(),field).includes(q);create.textContent=q+' 추가';
    }
    if(event.target.id==='relation-search'){const q=event.target.value.trim().toLowerCase();const options=[...document.querySelectorAll('.relation-dropdown .relation-option')];options.forEach(e=>e.hidden=!!q&&!e.textContent.toLowerCase().includes(q));$('.relation-no-results').hidden=options.some(e=>!e.hidden);}
  });
  function focusChip(field){$(`[data-action="chip-picker"][data-field="${field}"]`)?.focus();}
  function closeChoiceForm(form){form.hidden=true;form.reset();form.querySelector('.property-error').textContent='';const trigger=form.parentElement.querySelector('[data-action="add-choice"]');trigger.setAttribute('aria-expanded','false');trigger.focus();}
  document.addEventListener('change',event=>{
    const el=event.target;if(el.matches('[data-task-reminder]')){event.stopImmediatePropagation();try{const e=item(),p=planFor(e,ui.date)||e.plans.find(p=>p.state==='active');updateItem(getData(),'task',e.id,{remindFrom:el.checked?(taskStart(e)||e.due||today()):null,...(!el.checked?{remindUntil:null}:{})});persist();}catch(err){error(err);}return;}if(el.matches('[data-project-lifecycle]')){event.stopImmediatePropagation();try{const value=el.value;el.value=projectState(item());changeProjectState(ui.detail.id,value);}catch(err){error(err);}return;}if(!el.matches('[data-choice-field]'))return;event.stopImmediatePropagation();if(!el.checked)return;
    try{selectDetailOption(getData(),ui.detail.type,ui.detail.id,el.value);if(el.dataset.choiceField==='status')$('.detail-complete').checked=item().status==='done';persist(false);if(!ui.saveWarning){const out=$('#project-inline-error')||$('#inline-error');if(out)out.textContent='';}}
    catch(err){error(err);document.querySelectorAll('[data-choice-field]').forEach(r=>r.checked=r.value===item()[r.dataset.choiceField]);}
  },true);
  function saveField(event){
    const el=event.target;if(!el.matches('[data-inline-field],[data-check-title],#block-date'))return;event.stopImmediatePropagation();
    try{
      if(el.id==='block-date'){if(el.value)timeEditor(timeDraft.id,el.value);else el.value=timeDraft.date;return;}
      if(el.dataset.checkTitle){if(!el.value.trim())throw new Error('확인사항 내용을 입력해 주세요.');changeCheck(getData(),el.dataset.taskId,el.dataset.checkTitle,{title:el.value.trim()});}
      else{const field=el.dataset.inlineField,value=field==='stages'?[...new Set(el.value.split(',').map(s=>s.trim()).filter(Boolean))]:el.value;if(field==='notes'&&ui.detail.type==='task')updateMemo(getData(),ui.detail.id,[{text:value},...(item().memoParts||[]).filter(p=>p.image||p.asset)]);else updateItem(getData(),ui.detail.type,ui.detail.id,{[field]:value});el.classList.toggle('is-empty',!el.value);}
      if(el.dataset.inlineField==='status'){$('.detail-complete').checked=item().status==='done';}persist(false,false);if(!ui.saveWarning&&$('#inline-error'))$('#inline-error').textContent='';
    }catch(err){error(err);if(el.dataset.inlineField){const saved=item()[el.dataset.inlineField];el.value=Array.isArray(saved)?saved.join(', '):saved||'';}}
  }
  document.addEventListener('change',saveField,true);
  document.addEventListener('focusout',event=>{if(event.target.matches('[data-inline-field],[data-check-title]'))saveField(event);},true);
  document.addEventListener('submit',event=>{
    const form=event.target;if(!form.matches('[data-chip-picker],[data-choice-form],[data-check-form],[data-tag-form],[data-create-form],[data-quick-task]'))return;event.preventDefault();event.stopImmediatePropagation();const f=Object.fromEntries(new FormData(form)),data=getData();
    try{
      if(form.hasAttribute('data-chip-picker')){const value=f.value.trim(),field=form.dataset.chipPicker;if(!value)return;updateItem(data,ui.detail.type,ui.detail.id,{[field]:[...new Set([...chipValues(item(),field),value])]});$('#property-editor').close();persist();focusChip(field);}
      else if(form.hasAttribute('data-choice-form')){selectDetailOption(data,ui.detail.type,ui.detail.id,f.label,{add:true});persist();$('[data-choice-field]:checked')?.focus();}
      else if(form.hasAttribute('data-check-form')){if(!f.title.trim())return;const id=form.dataset.checkForm,inDetail=!!form.closest('#detail');changeCheck(data,id,null,{title:f.title.trim()});persist();const scope=inDetail?$('#detail'):$('#app');scope.querySelector(`[data-action="open-check-add"][data-task-id="${id}"]`)?.focus();}
      else if(form.hasAttribute('data-tag-form')){if(!f.tag.trim())return;updateItem(data,ui.detail.type,ui.detail.id,{tags:[...new Set([...item().tags,...f.tag.split(',').map(s=>s.trim()).filter(Boolean)])]});persist();$('[data-tag-form] input').focus();}
      else{const type=form.dataset.createForm||'task',e=createItem(data,type,f.title,{date:form.hasAttribute('data-create-form')?(form.dataset.date||null):ui.date,workId:form.dataset.workId||null,projectId:form.dataset.projectId||null});if(form.hasAttribute('data-create-form')){$('#editor').close();persist(false);if(type==='project'){window.dispatchEvent(new CustomEvent('work-open-project',{detail:e.id}));}else open(type,e.id);}else{persist(false);notify('추가했습니다.');}}
    }catch(err){const out=form.querySelector('.form-error,.property-error');if(out)out.textContent=err.message;else error(err);}
  },true);
  document.addEventListener('keydown',event=>{const el=event.target;if(el.closest('[data-choice-form]')&&event.key==='Escape'){event.preventDefault();event.stopPropagation();closeChoiceForm(el.closest('[data-choice-form]'));return;}if(el.matches('[data-inline-field],[data-check-title]')&&event.key==='Enter'&&!event.isComposing&&el.tagName!=='TEXTAREA'){event.preventDefault();el.blur();}if(el.closest('[data-check-form]')&&event.key==='Escape'){event.preventDefault();event.stopPropagation();closeCheckForm(el.closest('[data-check-form]'));}if(el.matches('[data-quick-task] input')&&event.key==='Escape'){event.preventDefault();save();}});
  $('#detail').addEventListener('close',()=>{history=[];$('#detail').innerHTML='';ui.inlineSaved='';if($('#detail').dataset.skipCloseSave){delete $('#detail').dataset.skipCloseSave;return;}save();});$('#editor').addEventListener('close',()=>$('#editor').classList.remove('time-editor'));
  return {open,render,timeEditor,create,trash,checkForm,checkAddButton,projectInfo,changeProjectState};
}
