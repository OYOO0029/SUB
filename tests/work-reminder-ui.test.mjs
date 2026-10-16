import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createReminderCenter} from '../work/reminders.js';
import {planToday} from '../work/model.js';

test('bell supports auto once, manual reopening, safe closing, scoped actions and empty state',()=>{
 const dom=new JSDOM('<button data-reminder-bell><span data-reminder-count hidden></span></button><input id="draft"><div id="outside">outside</div>',{pretendToBeVisual:true,url:'https://test.invalid'});
 const originals={window:Object.getOwnPropertyDescriptor(globalThis,'window'),document:Object.getOwnPropertyDescriptor(globalThis,'document')};for(const [key,value] of Object.entries({window:dom.window,document:dom.window.document}))Object.defineProperty(globalThis,key,{value,writable:true,configurable:true});
 try{
  let date='2030-10-14',scope='a',ready=false,opened;
  const task={id:'task',title:'긴 제목 <script>실행 안 됨</script>',status:'todo',due:'2030-10-16',remindFrom:'2030-10-14',plans:[],blocks:[],checks:[]};
  const data={projects:[],works:[],tasks:[task]};
  const ui=createReminderCenter({getData:()=>data,getScope:()=>scope,isReady:()=>ready,getDate:()=>date,storage:dom.window.localStorage,esc:value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;'),icon:()=>'',onOpen:id=>opened=id,onAcknowledge:(t,d)=>t.reminderAcknowledgedOn=d,onPlan:(t,d)=>planToday(t,d)});
  const panel=document.querySelector('#reminder-popover'),bell=document.querySelector('[data-reminder-bell]');
  ui.refresh();assert.equal(panel.hidden,true);
  document.querySelector('#draft').focus();ready=true;ui.refresh();assert.equal(panel.hidden,true);
  document.querySelector('#draft').blur();ui.refresh();assert.equal(panel.hidden,false);assert.equal(panel.querySelector('script'),null);
  assert.equal(bell.getAttribute('aria-label'),'리마인드 1개');
  panel.querySelector('[data-reminder-action="close"]').click();ui.refresh();assert.equal(panel.hidden,true);assert.equal(task.reminderAcknowledgedOn,undefined);
  bell.click();assert.equal(panel.hidden,false);
  document.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(panel.hidden,true);
  bell.click();document.querySelector('#outside').dispatchEvent(new dom.window.Event('pointerdown',{bubbles:true}));assert.equal(panel.hidden,true);assert.equal(task.reminderAcknowledgedOn,undefined);
  bell.click();panel.querySelector('[data-reminder-action="open"]').click();assert.equal(opened,'task');assert.equal(panel.hidden,true);
  bell.click();panel.querySelector('[data-reminder-action="acknowledge"]').click();assert.equal(task.reminderAcknowledgedOn,date);assert.equal(task.status,'todo');assert.equal(task.due,'2030-10-16');assert.match(panel.textContent,/오늘 확인할 리마인드가 없어요/);assert.equal(document.querySelector('[data-reminder-count]').hidden,true);
  ui.close();date='2030-10-15';ui.refresh();assert.equal(panel.hidden,false);assert.equal(bell.getAttribute('aria-label'),'리마인드 1개');
  panel.querySelector('[data-reminder-action="plan"]').click();assert.equal(task.plans[0].start,date);assert.equal(task.due,'2030-10-16');assert.equal(data.tasks.length,1);
  scope=null;ready=false;ui.refresh();assert.equal(panel.hidden,true);bell.click();assert.match(panel.textContent,/로그인하면/);
 }finally{dom.window.close();for(const [key,value] of Object.entries(originals)){if(value===undefined)delete globalThis[key];else Object.defineProperty(globalThis,key,value);}}
});
