import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {getHoliday} from '../planner-calendar.mjs';
import {createAccountData} from '../schedule-account.mjs';
import {validateState} from '../schedule-sync-core.mjs';

async function setup(){
 const html=await readFile(new URL('../personal.html',import.meta.url),'utf8');
 const script=html.match(/<script type="module">([\s\S]*?)<\/script>/)[1].replace(/^import .*;\r?$/gm,'');
 const dom=new JSDOM(html.replace(/<script[\s\S]*?<\/script>/g,''),{url:'https://test.local/',runScripts:'outside-only'});
 const w=dom.window;
 Object.assign(w,{getHoliday,createAccountData,validateState,structuredClone,appStorage:{persistent:true,getItem:k=>w.localStorage.getItem(k),setItem:(k,v)=>w.localStorage.setItem(k,v),removeItem:k=>w.localStorage.removeItem(k),keys:()=>Object.keys(w.localStorage)}});
 w.eval(script);w.myWeekSyncBridge.setAccount('test-account');
 return {w,d:w.document,close:()=>w.close()};
}
test('inline sleep accepts exact minutes, rejects invalid time, and Escape preserves the record',async()=>{
 const {w,d,close}=await setup();try{
  d.querySelector('[data-sleep-open=wake]').click();let input=d.querySelector('.inline-sleep-input');
  input.value='2560';input.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter'}));assert.equal(input.getAttribute('aria-invalid'),'true');
  input.value='0517';input.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter'}));
  assert.equal(d.querySelector('[data-sleep-open=wake]').textContent,'05:17');
  d.querySelector('[data-sleep-open=wake]').click();input=d.querySelector('.inline-sleep-input');input.value='0618';input.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape'}));
  assert.equal(d.querySelector('[data-sleep-open=wake]').textContent,'05:17');
  assert.equal(d.querySelector('#sleepModal').classList.contains('open'),false);
  d.querySelector('#mobileBedBtn').click();input=d.querySelector('.inline-sleep-input');input.value='2338';input.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter'}));
  assert.equal(d.querySelector('#mobileBedBtn').textContent,'23:38');assert.equal(d.querySelector('.inline-sleep-input'),null);
 }finally{close()}
});
test('category buttons, minute inputs, context deletion and undo preserve event data',async()=>{
 const {w,d,close}=await setup();try{
  d.querySelector('#quickAddBtn').click();assert.ok(d.querySelector('[data-category]'));
  d.querySelector('[data-category=exercise]').click();d.querySelector('#eventName').value='테스트';
  for(const [id,value] of Object.entries({eventStartHour:'9',eventStartMinute:'17',eventEndHour:'10',eventEndMinute:'23'}))d.getElementById(id).value=value;
  d.querySelector('#saveEventBtn').click();const saved=w.myWeekSyncBridge.read().events[0];
  assert.equal(saved.category,'exercise');assert.equal(saved.startTime,'09:17');assert.equal(saved.endTime,'10:23');
  const card=d.querySelector('.event-card[data-event-id]');card.dispatchEvent(new w.MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:100,clientY:100}));
  assert.equal(d.querySelector('.event-context-menu').hidden,false);d.querySelector('.event-context-menu button').click();assert.equal(w.myWeekSyncBridge.read().events.length,0);
  d.querySelector('#toastAction').click();assert.deepEqual(w.myWeekSyncBridge.read().events[0],saved);
  d.querySelector('[data-personal-view=month]').click();assert.equal(d.querySelector('[data-personal-view=month]').getAttribute('aria-pressed'),'true');
 }finally{close()}
});
test('date detail edits trackers and exact sleep time, adds an hourly event and deletes it',async()=>{
 const {w,d,close}=await setup();try{
  const dateButton=d.querySelector('[data-select-date]'),ds=dateButton.dataset.selectDate;dateButton.click();
  assert.equal(d.querySelector('#dayDetail').classList.contains('open'),true);
  assert.equal(d.querySelector('[data-personal-view=day]'),null);
  assert.equal(d.querySelector('[data-day-clear=wake]').hidden,true);
  assert.equal(d.querySelector('[data-day-clear=bed]').hidden,true);
  const input=d.querySelector('#day-wake');input.value='0732';input.dispatchEvent(new w.Event('change'));
  assert.equal(w.myWeekSyncBridge.read().sleepLogs[ds].wake,'07:32');
  assert.equal(d.querySelector('[data-day-clear=wake]').hidden,false);
  d.querySelector('[data-day-delete=sleep]').click();assert.equal(w.myWeekSyncBridge.read().sleepLogs[ds].wake,undefined);
  assert.equal(d.querySelector('[data-day-clear=wake]').hidden,true);
  const tracker=d.querySelector('[data-day-tracker]');if(tracker){const id=tracker.dataset.dayTracker;tracker.click();assert.equal(w.myWeekSyncBridge.read().trackerLogs[ds][id],true);}
  d.querySelector('[data-day-add="10"]').click();d.querySelector('#eventName').value='상세 일정';d.querySelector('#saveEventBtn').click();
  assert.equal(w.myWeekSyncBridge.read().events[0].startTime,'10:00');
  assert.ok(d.querySelector('[data-day-edit=event]'));d.querySelector('[data-day-delete=event]').click();assert.equal(w.myWeekSyncBridge.read().events.length,0);
  d.querySelector('[data-day-close]').click();assert.equal(d.querySelector('#dayDetail').classList.contains('open'),false);
 }finally{close()}
});

test('default work appears only on weekdays, keeps explicit overrides and stays off the month grid',async()=>{
 const {w,d,close}=await setup();try{
  d.querySelector('[data-select-date]').click();
  const show=date=>{const input=d.querySelector('#dayDetailDate');input.value=date;input.dispatchEvent(new w.Event('change'));return d.querySelectorAll('[data-day-edit=work]').length};
  assert.equal(show('2026-10-19'),2);
  assert.equal(show('2026-10-18'),0);
  assert.equal(show('2026-10-17'),0);
  assert.equal(show('2026-10-05'),0);
  const state=w.myWeekSyncBridge.read();state.workExceptions['2026-10-18']='normal';w.myWeekSyncBridge.apply(state);
  assert.equal(show('2026-10-18'),2);
  state.workConfig.weekdays=[];state.workConfig.weekdaysConfigured=true;w.myWeekSyncBridge.apply(state);
  assert.equal(show('2026-10-19'),0);
  d.querySelector('[data-day-close]').click();d.querySelector('[data-personal-view=month]').click();
  assert.equal(d.querySelectorAll('#monthView .event-card.work').length,0);
 }finally{close()}
});
