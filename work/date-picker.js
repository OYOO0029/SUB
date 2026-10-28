import {today,addDays,addMonths} from './model.js?v=20261028-domain-rules-1';

export function parseDateInput(value){
  const match=value.trim().match(/^(\d{4})[.\-/]\s*(\d{1,2})[.\-/]\s*(\d{1,2})\.?$/);
  if(!match)throw new Error('날짜를 YYYY. MM. DD. 형식으로 입력해 주세요.');
  const date=`${match[1]}-${match[2].padStart(2,'0')}-${match[3].padStart(2,'0')}`;
  if(!Number.isFinite(Date.parse(date+'T12:00:00Z'))||new Date(date+'T12:00:00Z').toISOString().slice(0,10)!==date)throw new Error('올바른 날짜를 입력해 주세요.');
  return date;
}
export const dateInputLabel=value=>value?value.replaceAll('-','. ')+'.':'';
export function calendarDays(month){
  const first=month.slice(0,7)+'-01',weekday=new Date(first+'T12:00:00Z').getUTCDay();
  return Array.from({length:42},(_,i)=>addDays(first,i-weekday));
}
export function dateLabel(value,format='absolute',base=today()){
  if(!value)return '';
  if(format==='relative'){
    const diff=Math.round((Date.parse(value+'T12:00:00Z')-Date.parse(base+'T12:00:00Z'))/86400000);
    if(Math.abs(diff)<=7)return diff===0?'오늘':diff===1?'내일':diff===-1?'어제':diff>0?`${diff}일 후`:`${-diff}일 전`;
  }
  return dateInputLabel(value);
}

export function deadlineLabel(value,format='absolute',base=today()){
 if(!value)return '';
 const diff=Math.round((Date.parse(value+'T12:00:00Z')-Date.parse(base+'T12:00:00Z'))/86400000);
 if(format==='relative')return diff===0?'오늘':diff>0?`D-${diff}`:`D+${-diff}`;
 return `${value.slice(0,4)!==base.slice(0,4)?value.slice(0,4)+'/':''}${Number(value.slice(5,7))}/${Number(value.slice(8))}(${['일','월','화','수','목','금','토'][new Date(value+'T12:00:00Z').getUTCDay()]})`;
}

// Shared calendar for task periods, deadlines, reminders and project periods.
// Values commit through the existing validated editing functions, never directly to storage.
export function createDatePicker({dialog,esc,icon,onCommit,onFormat}){
  let draft=null;
  function position(){
    if(!draft||!dialog.open||!dialog.classList.contains('notion-date-picker'))return;
    const r=draft.anchor,w=dialog.offsetWidth,h=dialog.offsetHeight;
    const left=Math.max(12,Math.min(r.left,innerWidth-w-12));
    const below=r.bottom+6,top=below+h<=innerHeight-12?below:Math.max(12,Math.min(r.top-h-6,innerHeight-h-12));
    dialog.style.left=left+'px';dialog.style.top=top+'px';
  }
  function commit(){
    try{
      onCommit({...draft,end:draft.range?draft.end:draft.start});draft.error='';draft.saved=true;return true;
    }catch(error){draft.error=error.message;draft.saved=false;return false;}
  }
  function render(focusDay){
    const d=draft,days=calendarDays(d.month),month=d.month.slice(0,7),base=today();
    const field=(key,label)=>`<input class="calendar-date-input ${d.active===key?'active':''}" data-calendar-input="${key}" aria-label="${label}" value="${esc(dateInputLabel(d[key]))}" placeholder="YYYY. MM. DD." inputmode="numeric" autocomplete="off">`;
    const toggle=(action,label,on)=>`<button type="button" class="calendar-setting" data-calendar-action="${action}" role="switch" aria-checked="${on}" aria-label="${label}"><span>${label}</span><i class="calendar-switch ${on?'on':''}"></i></button>`;
    dialog.innerHTML=`<h3 id="${dialog.id}-title" class="sr-only">${esc(d.title)} 선택</h3>
      <div class="calendar-date-fields">${field('start',d.allowRange?'시작일':'날짜')}${d.range?field('end','종료일'):''}</div>
      <div class="calendar-heading"><strong>${Number(month.slice(0,4))}년 ${Number(month.slice(5))}월</strong><button type="button" data-calendar-action="today">오늘</button><button type="button" data-calendar-action="prev" aria-label="이전 달">${icon('left')}</button><button type="button" data-calendar-action="next" aria-label="다음 달">${icon('chevron')}</button></div>
      <div class="calendar-weekdays" aria-hidden="true">${['일','월','화','수','목','금','토'].map(v=>`<span>${v}</span>`).join('')}</div>
      <div class="date-calendar-grid" role="group" aria-label="날짜 선택">${days.map(day=>{const edge=day===d.start||d.range&&day===d.end,between=d.range&&d.start&&d.end&&day>d.start&&day<d.end;return `<button type="button" data-calendar-day="${day}" aria-label="${day}" aria-pressed="${!!edge}" ${day===base?'aria-current="date"':''} class="calendar-day-button ${day.slice(0,7)!==month?'outside':''} ${edge?'selected':''} ${between?'between':''}">${Number(day.slice(8))}</button>`;}).join('')}</div>
      <div class="calendar-settings">${d.allowRange?toggle('range','종료일',d.range):''}
      <label class="calendar-setting"><span>날짜 형식</span><select aria-label="날짜 형식" data-calendar-format><option value="absolute" ${d.format==='absolute'?'selected':''}>${d.deadlineFormat?'월/일(요일)':'년/월/일'}</option><option value="relative" ${d.format==='relative'?'selected':''}>${d.deadlineFormat?'오늘 · D-day':'상대'}</option></select></label>
      ${d.allowTime?toggle('time','시간 포함',d.includeTime)+(d.includeTime?`<label class="calendar-time-row"><span>마감 시각</span><input type="time" data-calendar-time aria-label="마감 시각" value="${esc(d.time)}"></label>`:''):''}
      ${d.allowReminder?`<label class="calendar-setting"><span>리마인드</span><select data-calendar-reminder aria-label="마감 리마인드"><option value="" ${d.reminder===null?'selected':''}>없음</option>${[['0','당일'],['1','1일 전'],['2','2일 전'],['7','1주 전']].map(([v,t])=>`<option value="${v}" ${d.reminder!==null&&d.reminder===addDays(d.start||base,-Number(v))?'selected':''}>${t}</option>`).join('')}${d.reminder&&!['0','1','2','7'].some(v=>d.reminder===addDays(d.start||base,-Number(v)))?`<option value="custom" selected>${esc(d.reminder)}</option>`:''}</select></label>`:''}</div>
      <p class="calendar-feedback ${d.error?'error':''}" role="status">${esc(d.error||(d.waiting?'종료일을 선택하세요.':d.saved?'저장됨':''))}</p>
      <div class="calendar-footer"><button type="button" data-calendar-action="clear">삭제</button><button type="button" data-calendar-action="close">닫기</button></div>`;
    position();if(focusDay)dialog.querySelector(`[data-calendar-day="${focusDay}"]`)?.focus({preventScroll:true});
  }
  function open(options){
    const start=options.start||'',end=options.end||start;
    draft={...options,start,end,range:!!(options.allowRange&&(options.range||end&&end!==start)),active:'start',month:(start||today()).slice(0,7)+'-01',includeTime:!!options.time,time:options.time||'',reminder:options.reminder||null,reminderChanged:false,format:options.format||'absolute',error:'',saved:false,waiting:false};
    dialog.setAttribute('aria-labelledby',dialog.id+'-title');dialog.className='notion-date-picker';dialog.classList.toggle('calendar-navigation',!!options.simple);render();if(!dialog.open)dialog.showModal();position();
    dialog.querySelector(`[data-calendar-day="${start||today()}"]`)?.focus({preventScroll:true});
  }
  dialog.addEventListener('click',event=>{
    if(!dialog.classList.contains('notion-date-picker'))return;
    const el=event.target.closest('[data-calendar-action],[data-calendar-day]');if(!el)return;event.preventDefault();
    const d=draft,a=el.dataset.calendarAction;
    if(el.dataset.calendarDay){
      const day=el.dataset.calendarDay;
      if(d.range&&d.active==='start'){d.start=day;d.end=day;d.active='end';d.waiting=true;d.saved=false;d.error='';}
      else if(d.range){d.end=day;if(d.end<d.start)[d.start,d.end]=[d.end,d.start];d.waiting=false;d.active='start';commit();}
      else{d.start=day;d.end=day;commit();}
      d.month=day.slice(0,7)+'-01';if(d.simple&&d.saved){dialog.close();return;}render(day);return;
    }
    if(a==='prev'||a==='next'){d.month=addMonths(d.month,a==='prev'?-1:1);render();dialog.querySelector(`[data-calendar-action="${a}"]`).focus();}
    else if(a==='today'){if(d.simple){d.start=today();d.end=d.start;if(commit()){dialog.close();return;}}d.month=today().slice(0,7)+'-01';render(today());}
    else if(a==='range'){d.range=!d.range;d.end=d.start;d.active=d.range&&d.start?'end':'start';d.waiting=!!(d.range&&d.start);d.error='';if(!d.range&&d.start)commit();render();}
    else if(a==='time'){d.includeTime=!d.includeTime;if(!d.includeTime){d.time='';if(d.start)commit();}render();if(d.includeTime)dialog.querySelector('[data-calendar-time]').focus();}
    else if(a==='clear'){const previous={...d};d.start='';d.end='';d.time='';d.waiting=false;if(commit())dialog.close();else{const error=d.error;draft={...previous,error};render();}}
    else if(a==='close')dialog.close();
  });
  dialog.addEventListener('focusin',event=>{if(!dialog.classList.contains('notion-date-picker'))return;const key=event.target.dataset.calendarInput;if(key){draft.active=key;dialog.querySelectorAll('[data-calendar-input]').forEach(el=>el.classList.toggle('active',el.dataset.calendarInput===key));}});
  function saveControl(el,refresh=true){
    if(!dialog.classList.contains('notion-date-picker'))return;const d=draft;
    try{
      if(el.dataset.calendarInput){const key=el.dataset.calendarInput;d[key]=parseDateInput(el.value);d.month=d[key].slice(0,7)+'-01';if(!d.range)d.end=d.start;if(d.range&&d.end<d.start)throw new Error('종료일은 시작일 이후로 선택해 주세요.');d.waiting=false;commit();}
      else if(el.matches('[data-calendar-time]')){d.time=el.value;if(!d.start)d.start=today();commit();}
      else if(el.matches('[data-calendar-format]')){d.format=el.value;onFormat(d.format);}
      else if(el.matches('[data-calendar-reminder]')){if(el.value==='custom')return;if(!d.start)d.start=today();d.reminder=el.value===''?null:addDays(d.start,-Number(el.value));d.reminderChanged=true;commit();}
      else return;
    }catch(error){d.error=error.message;d.saved=false;}
    if(refresh)render();
    else{
      const feedback=dialog.querySelector('.calendar-feedback');feedback.textContent=d.error||(d.saved?'저장됨':'');feedback.classList.toggle('error',!!d.error);
      dialog.querySelectorAll('[data-calendar-day]').forEach(button=>{const day=button.dataset.calendarDay,selected=day===d.start||d.range&&day===d.end;button.classList.toggle('selected',!!selected);button.classList.toggle('between',!!(d.range&&day>d.start&&day<d.end));button.setAttribute('aria-pressed',String(!!selected));});
    }
  }
  dialog.addEventListener('change',event=>saveControl(event.target,!event.target.matches('[data-calendar-input],[data-calendar-time]')));
  dialog.addEventListener('focusout',event=>{
    const el=event.target;if(!draft||!dialog.classList.contains('notion-date-picker'))return;
    if(el.dataset.calendarInput&&el.value!==dateInputLabel(draft[el.dataset.calendarInput])||el.matches('[data-calendar-time]')&&el.value!==draft.time)saveControl(el,false);
  });
  dialog.addEventListener('keydown',event=>{
    if(!dialog.classList.contains('notion-date-picker'))return;
    if(event.target.matches('[data-calendar-input]')&&event.key==='Enter'){event.preventDefault();saveControl(event.target);return;}
    const day=event.target.dataset.calendarDay,offset={ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7}[event.key];
    if(day&&offset){event.preventDefault();const next=addDays(day,offset);if(!calendarDays(draft.month).includes(next))draft.month=next.slice(0,7)+'-01';render(next);}
  });
  dialog.addEventListener('pointerdown',event=>{if(!dialog.classList.contains('notion-date-picker')||event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();});
  dialog.addEventListener('close',()=>{dialog.style.removeProperty('left');dialog.style.removeProperty('top');if(dialog.classList.contains('notion-date-picker')&&draft)document.querySelector(`#detail [data-action="field-date"][data-field="${draft.field}"]`)?.focus();});
  window.addEventListener('resize',position);
  return {open};
}
