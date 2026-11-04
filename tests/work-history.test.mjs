import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyWorkState} from '../work/work-account.mjs';
import {createItem,createTaskBatch,updateItem,trashItem,restoreItem} from '../work/editing.js';
import {selectDay,selectedOn,completeTask,doneOn,recordedOn,historicalTask,recordRows,addWorkLog,deadline,historicalBlocks} from '../work/task-history.js';
import {executionBuckets,taskPeriod} from '../work/schedule-rules.js';
import {setTime,removeTime} from '../work/model.js';
import {validate} from '../work/repository.js';
test('day selection is independent, does not carry automatically, and retains historical title and project',()=>{
 const d=emptyWorkState(),p=createItem(d,'project','Original'),q=createItem(d,'project','New'),[t]=createTaskBatch(d,'Original title',{projectId:p.id});
 updateItem(d,'task',t.id,{workPeriod:{start:'2026-11-01',end:'2026-11-08'},deadline:'2026-11-10'});
 const dates=JSON.stringify([t.workPeriod,t.due,t.blocks,t.plans]);selectDay(t,'2026-11-04',true,d);assert(selectedOn(t,'2026-11-04'));assert(!selectedOn(t,'2026-11-05'));
 updateItem(d,'task',t.id,{title:'Changed title',projectId:q.id});selectDay(t,'2026-11-05',true,d);selectDay(t,'2026-11-04',false,d);
 assert.equal(JSON.stringify([t.workPeriod,t.due,t.blocks,t.plans]),dates);assert(recordedOn(t,'2026-11-04',taskPeriod(t)));
 const past=historicalTask(t,'2026-11-04');assert.equal(past.title,'Original title');assert.equal(past._projectTitle,'Original');
 assert(recordRows(d,{projectId:p.id,from:'2026-11-04',to:'2026-11-04'}).some(e=>e.kind==='plan'));validate(JSON.parse(JSON.stringify(d)));
});
test('actual completion and reopen never retroactively complete prior plans, legacy completion survives reopen',()=>{
 const d=emptyWorkState(),t=createItem(d,'task','Task');selectDay(t,'2026-11-03',true,d);completeTask(t,d,new Date('2026-11-04T01:02:03Z'));
 assert.equal(t.completedAt,'2026-11-04T01:02:03.000Z');assert.equal(doneOn(t,'2026-11-03'),false);assert.equal(doneOn(t,'2026-11-04'),true);
 completeTask(t,d,new Date('2026-11-05T01:00Z'));assert.equal(doneOn(t,'2026-11-04'),true);assert.equal(doneOn(t,'2026-11-05'),false);
 const old=createItem(d,'task','Legacy');old.status='done';old.completedAt='2026-11-01T01:00:00Z';completeTask(old,d,new Date('2026-11-04T01:00Z'));assert(doneOn(old,'2026-11-02'));assert(!doneOn(old,'2026-11-04'));validate(d);
});
test('work period alone is not a deadline; overdue occurs once and blank dates never expire',()=>{
 const d=emptyWorkState(),[a,b]=createTaskBatch(d,'Period only\nBlank');updateItem(d,'task',a.id,{workPeriod:{start:'2026-10-01',end:'2026-10-02'}});
 assert.equal(deadline(a),null);assert.equal(executionBuckets(d,'2026-11-04').overdue.length,0);
 updateItem(d,'task',a.id,{deadline:'2026-11-01'});selectDay(a,'2026-11-04',true,d);const buckets=executionBuckets(d,'2026-11-04');assert.deepEqual(buckets.overdue.map(t=>t.id),[a.id]);assert(!buckets.today.includes(a));assert(buckets.remaining.includes(b));
});
test('work log and planned time stay distinct; failed time retry is idempotent; trash and JSON preserve records',()=>{
 const d=emptyWorkState(),p=createItem(d,'project','P'),w=createItem(d,'work','W',{projectId:p.id}),t=createItem(d,'task','Task',{workId:w.id});
 setTime(t,'2026-11-03','09:00','10:00',d);const count=t.history.length;setTime(t,'2026-11-03','09:00','10:00',d);assert.equal(t.history.length,count);
 addWorkLog(d,t,'2026-11-03','자료 검토');assert.equal(recordRows(d,{projectId:p.id,query:'자료 검토'}).length,1);assert(!('actualMinutes' in t));
 removeTime(t,'2026-11-03',d);assert.deepEqual(historicalBlocks(t,'2026-11-03'),[]);assert(t.history.some(e=>e.kind==='time'&&e.start==='09:00'));
 const history=structuredClone(t.history);trashItem(d,'work',w.id);assert.deepEqual(t.history,history);restoreItem(d,'work',w.id);trashItem(d,'task',t.id);restoreItem(d,'task',t.id);assert.deepEqual(t.history,history);validate(JSON.parse(JSON.stringify(d)));
 assert.throws(()=>addWorkLog(d,t,'2026-02-30','bad'));assert.throws(()=>addWorkLog(d,t,'2026-11-04','   '));
});
test('legacy observed day survives adding a later day and legacy work dates remain in snapshots',()=>{
 const d=emptyWorkState(),t=createItem(d,'task','Legacy');t.todaySelected=true;t.selectionDate='2026-11-03';
 selectDay(t,'2026-11-04',true,d);assert(selectedOn(t,'2026-11-03'));assert(selectedOn(t,'2026-11-04'));
 t.startDate='2026-10-01';t.due='2026-10-04';updateItem(d,'task',t.id,{workPeriod:{start:'2026-11-10',end:'2026-11-11'}});
 assert.deepEqual(historicalTask(t,'2026-10-02').workPeriod,{start:'2026-10-01',end:'2026-10-04'});
});
