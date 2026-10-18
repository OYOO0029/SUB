import test from 'node:test';
import assert from 'node:assert/strict';
import {projectState,projectList} from '../work/project-view.js';
test('project lifecycle is independent of detailed stage and supports legacy records',()=>{assert.equal(projectState({stage:'제출 완료'}),'active');assert.equal(projectState({stage:'완료'}),'done');assert.equal(projectState({stage:'완료',lifecycle:'paused'}),'paused');assert.equal(projectState({}),'active');});
test('status OR filtering, empty selection, deleted exclusion and stable ordering',()=>{const ps=[{title:'나',stage:'진행'},{title:'가',lifecycle:'paused'},{title:'다',lifecycle:'done'},{title:'라',deletedAt:'x'}];assert.deepEqual(projectList(ps,['active','paused'],'name').map(p=>p.title),['가','나']);assert.equal(projectList(ps,[]).length,0);assert.equal(projectList(ps).length,1);assert.equal(ps[0].title,'나');});
test('missing dates remain last in both sort directions',()=>{const ps=[{title:'없음'},{title:'먼저',start:'2026-01-01'},{title:'나중',start:'2026-02-01'}];assert.deepEqual(projectList(ps,['active'],'start','desc').map(p=>p.title),['나중','먼저','없음']);assert.deepEqual(projectList(ps,['active'],'start').map(p=>p.title),['먼저','나중','없음']);});
