import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {activeProject,filterProjectOptions,projectStateToggle} from '../work/project-options.js';
test('project choices default to active and include archived states only on request without changing records',()=>{
 const projects=[{id:'a'},{id:'b',lifecycle:'done'},{id:'c',stage:'보류'},{id:'d',lifecycle:'cancelled'},{id:'e',deletedAt:'x'}],before=JSON.stringify(projects);
 assert.deepEqual(projects.filter(activeProject).map(p=>p.id),['a']);
 const dom=new JSDOM(`<div>${projectStateToggle}<button data-project-inactive="false">진행 프로젝트</button><button data-project-inactive="true">완료 프로젝트</button></div>`),host=dom.window.document.querySelector('div');
 filterProjectOptions(host);assert.equal(host.querySelectorAll('button:not([hidden])').length,1);
 host.querySelector('input').checked=true;filterProjectOptions(host);assert.equal(host.querySelectorAll('button:not([hidden])').length,2);
 filterProjectOptions(host,'완료');assert.equal(host.querySelector('button:not([hidden])').textContent,'완료 프로젝트');
 assert.equal(JSON.stringify(projects),before);dom.window.close();
});
