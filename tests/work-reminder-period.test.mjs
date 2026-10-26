import test from 'node:test';
import assert from 'node:assert/strict';
import {reminderTasks} from '../work/model.js';
import {createItem,updateItem} from '../work/editing.js';
import {emptyWorkState} from '../work/work-account.mjs';
import {validate} from '../work/repository.js';
test('reminder interval includes both boundaries and preserves legacy open-ended reminders',()=>{
 const data=emptyWorkState(),t=createItem(data,'task','Period');
 updateItem(data,'task',t.id,{remindFrom:'2026-10-26',remindUntil:'2026-10-28'});
 for(const [day,n] of [['2026-10-25',0],['2026-10-26',1],['2026-10-28',1],['2026-10-29',0]])assert.equal(reminderTasks(data,day).length,n);
 const before=structuredClone(t);assert.throws(()=>updateItem(data,'task',t.id,{remindUntil:'2026-10-25'}));assert.deepEqual(t,before);
 delete t.remindUntil;validate(data);assert.equal(reminderTasks(data,'2027-01-01').length,1);
 t.status='done';assert.equal(reminderTasks(data,'2026-10-27').length,0);
});
