import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {defaultPlannerMode} from '../planner-calendar.mjs';

test('initial mode uses Korean weekdays, weekends, lunar and substitute holidays',()=>{
  for(const date of ['2026-10-16T03:00:00Z','2026-10-19T03:00:00Z']) assert.equal(defaultPlannerMode(new Date(date)),'work');
  for(const date of ['2026-10-17T03:00:00Z','2026-10-18T03:00:00Z','2026-10-09T03:00:00Z','2026-09-25T03:00:00Z','2026-08-17T03:00:00Z']) assert.equal(defaultPlannerMode(new Date(date)),'personal',date);
  assert.equal(defaultPlannerMode(new Date('2026-10-16T14:59:00Z')),'work');
  assert.equal(defaultPlannerMode(new Date('2026-10-16T15:00:00Z')),'personal');
});

test('switching preserves existing views and the header, isolates hidden frames and supports keyboard',async()=>{
  const html=await readFile(new URL('../schedule.html',import.meta.url),'utf8');
  const source=await readFile(new URL('../planner-shell.mjs',import.meta.url),'utf8');
  const dom=new JSDOM(html,{url:'https://example.test/SUB/schedule.html?mode=personal',runScripts:'outside-only'});
  const {window:w}=dom;
  w.eval(source.replace("import {defaultPlannerMode} from './planner-calendar.mjs';",'const defaultPlannerMode=()=>"work";'));
  const nav=w.document.querySelector('nav');
  const personal=w.document.querySelector('iframe');
  const buttons=[...nav.querySelectorAll('button')];
  buttons[1].click();
  const work=w.document.querySelectorAll('iframe')[1];
  assert.equal(personal.hidden,true);
  assert.equal(personal.inert,true);
  assert.equal(work.hidden,false);
  for(let i=0;i<5;i++){buttons[0].click();buttons[1].click();}
  buttons[0].click();
  assert.equal(w.document.querySelector('nav'),nav);
  assert.equal(w.document.querySelector('iframe'),personal);
  assert.equal(w.document.querySelectorAll('iframe').length,2);
  assert.equal(personal.hidden,false);
  assert.equal(work.inert,true);
  assert.equal(w.location.href,'https://example.test/SUB/schedule.html?mode=personal');
  buttons[0].dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));
  assert.equal(buttons[1].getAttribute('aria-pressed'),'true');
  assert.equal(w.document.activeElement,buttons[1]);
  w.dispatchEvent(new w.MessageEvent('message',{origin:'https://evil.test',data:{type:'planner-mode',mode:'personal'},source:personal.contentWindow}));
  assert.equal(buttons[1].getAttribute('aria-pressed'),'true');
  buttons[0].click();
  w.document.getElementById("planner-home").click();
  assert.equal(buttons[1].getAttribute("aria-pressed"),"true");
  assert.equal(w.document.querySelectorAll("iframe").length,2);
  assert.equal(w.document.querySelectorAll("iframe")[1],work);
  dom.window.close();
});
