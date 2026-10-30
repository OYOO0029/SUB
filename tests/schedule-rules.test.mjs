import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyWorkState} from '../work/work-account.mjs';
import {createItem,createTaskBatch,updateItem,trashItem,restoreItem} from '../work/editing.js';
import {complete,setTime} from '../work/model.js';
import {validate} from '../work/repository.js';
import {taskContext} from '../work/ownership.js';
import {taskPeriod,selectToday,executionBuckets,reorderToday,todayOrder,outsideWork} from '../work/schedule-rules.js';
test('explicit today selection never changes dates, persists overnight and overdue wins once',()=>{
 const d=emptyWorkState();const [a,b,c]=createTaskBatch(d,'selected\nremaining\nundated');
 updateItem(d,'task',a.id,{workPeriod:{start:'2026-10-25',end:'2026-10-31'}});
 updateItem(d,'task',b.id,{workPeriod:{start:'2026-10-25',end:'2026-10-31'}});
 const before=structuredClone(a);selectToday(a);for(const k of ['workPeriod','startDate','due','plans','blocks','status'])assert.deepEqual(a[k],before[k]);
 for(const day of ['2026-10-30','2026-10-31']){const s=executionBuckets(d,day);assert.deepEqual(s.today.map(t=>t.id),[a.id]);assert.deepEqual(s.remaining.map(t=>t.id),[b.id,c.id]);}
 const s=executionBuckets(d,'2026-11-01');assert.deepEqual(s.overdue.map(t=>t.id),[a.id,b.id]);assert.deepEqual(s.remaining.map(t=>t.id),[c.id]);assert.equal(new Set(Object.values(s).flat().map(t=>t.id)).size,3);
 complete(a,'2026-11-01');assert(!Object.values(executionBuckets(d,'2026-11-01')).flat().includes(a));complete(a,'2026-11-01');assert.equal(a.status,'waiting');
});
test('date read preserves legacy data, explicit period validates atomically, timers never alter status or dates',()=>{
 const d=emptyWorkState(),t=createItem(d,'task','legacy',{date:'2026-10-20'});t.due='2026-11-04';t.notes='preserved';t.checks=[{id:'c',title:'check',done:true}];const before=JSON.stringify(t);
 assert.deepEqual(taskPeriod(t),{start:'2026-10-20',end:'2026-11-04'});executionBuckets(d,'2026-10-30');assert.equal(JSON.stringify(t),before);
 assert.throws(()=>updateItem(d,'task',t.id,{workPeriod:{start:'2026-11-04',end:'2026-11-01'}}));assert.equal(JSON.stringify(t),before);
 updateItem(d,'task',t.id,{workPeriod:{start:'2026-11-01',end:'2026-11-04'}});const dates=structuredClone(t);setTime(t,'2026-11-03','09:00','10:00');for(const k of ['workPeriod','startDate','due','plans','checks','status'])assert.deepEqual(t[k],dates[k]);validate(d);
});
test('today order persists independently from project and historical daily order',()=>{
 const d=emptyWorkState(),xs=createTaskBatch(d,'A\nB\nC',{todaySelected:true});d.dailyOrder={'2026-10-30':xs.map(t=>t.id)};const before=structuredClone(d.dailyOrder);
 reorderToday(d,'2026-10-30',xs[2].id,xs[0].id);const reload=validate(JSON.parse(JSON.stringify(d)));assert.deepEqual(todayOrder(reload,reload.tasks).map(t=>t.title),['C','A','B']);assert.deepEqual(reload.tasks.map(t=>t.title),['A','B','C']);assert.deepEqual(reload.dailyOrder,before);
});
test('group, ungroup, delete and restore work preserve original task identity and dates',()=>{
 const d=emptyWorkState(),p=createItem(d,'project','P'),w=createItem(d,'work','W',{projectId:p.id}),xs=createTaskBatch(d,'A\nB',{projectId:p.id});const ids=xs.map(t=>t.id);
 updateItem(d,'work',w.id,{workPeriod:{start:'2026-11-02',end:'2026-11-03'}});updateItem(d,'task',xs[0].id,{workPeriod:{start:'2026-11-01',end:'2026-11-04'}});
 for(const t of xs)updateItem(d,'task',t.id,{workId:w.id});assert(outsideWork(xs[0],w));assert.equal(d.tasks.length,2);
 updateItem(d,'task',xs[1].id,{workId:null});assert.equal(taskContext(d,xs[1]).project.id,p.id);
 const original=structuredClone(xs[0]);trashItem(d,'work',w.id);assert.equal(d.tasks.length,2);assert.deepEqual(d.tasks.map(t=>t.id),ids);assert.equal(xs[0].workId,null);assert.equal(taskContext(d,xs[0]).project.id,p.id);assert.deepEqual(xs[0].workPeriod,original.workPeriod);
 restoreItem(d,'work',w.id);assert.equal(xs[0].workId,w.id);assert.equal(xs[1].workId,null);validate(d);
});
