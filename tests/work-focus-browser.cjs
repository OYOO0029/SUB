// Runs only against a new synthetic local server and a disposable browser profile.
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),{spawn}=require('node:child_process');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..'),port=4195,origin=`http://127.0.0.1:${port}`;
(async()=>{
 const server=spawn(process.execPath,['tests/schedule-preview.mjs'],{cwd:root,env:{...process.env,FOCUS_QA:'1',PREVIEW_PORT:String(port)},stdio:['ignore','pipe','pipe'],windowsHide:true});
 let browser;
 try{
  await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('Fixture server did not start')),15000);server.stdout.on('data',chunk=>{if(String(chunk).includes('Synthetic preview')){clearTimeout(timeout);resolve()}});server.once('exit',code=>{clearTimeout(timeout);reject(Error('Fixture exited '+code))});server.stderr.on('data',chunk=>process.stderr.write(chunk));});
  browser=await chromium.launch({...(process.env.BROWSER_EXE?{executablePath:process.env.BROWSER_EXE}:{}),headless:true});
  const context=await browser.newContext({viewport:{width:1280,height:900}});
  await context.route('**/*',route=>route.request().url().startsWith(origin)?route.continue():route.abort());
  await context.addInitScript(()=>{if(!localStorage.getItem('fixture-session'))localStorage.setItem('fixture-session',JSON.stringify({user:{id:'A',email:'a@fixture.test'}}))});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')console.error('Browser console:',m.text())});
  page.on('response',r=>{if(r.status()>=400)console.error('HTTP',r.status(),r.url())});
  await page.goto(origin+'/work/index.html?embedded=1');
  try{await page.locator('.focus-task').first().waitFor({timeout:15000});}catch(error){console.error('Page diagnostic',await page.locator('body').innerText(),errors);throw error;}
  assert.equal(await page.locator('.focus-task').count(),6);
  const output=process.env.FOCUS_SCREENSHOTS;
  if(output){fs.mkdirSync(output,{recursive:true});await page.screenshot({path:path.join(output,'focus-list-desktop.png'),fullPage:true})}
  await page.locator('.focus-task').first().hover();await page.locator('.focus-task').first().getByRole('button',{name:/더보기/}).click();
  await page.getByRole('menuitem',{name:'타이머에 연결',exact:true}).click();
  await page.getByRole('button',{name:'타이머 시간 설정',exact:true}).click();await page.getByRole('spinbutton',{name:'타이머 시간, 분'}).fill('37');await page.locator('[data-focus-timer-form]').getByRole('button',{name:'설정',exact:true}).click();
  assert.equal(await page.locator('.focus-progress').getAttribute('stroke-dasharray'),'100 100');
  await page.getByRole('button',{name:'타이머 시작',exact:true}).click();
  const until=await page.evaluate(()=>JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k=>k.startsWith('my-work-focus-timer-v1:')))).until);
  await page.getByRole('button',{name:'타임라인',exact:true}).click();assert.equal(await page.locator('[data-tick]').count(),67);assert.equal(await page.locator('.focus-history').getAttribute('open'),null);
  assert.equal(await page.locator('.focus-event.is-now').count(),1);await page.locator('.focus-history>summary').click();assert(await page.locator('.focus-event.is-past').isVisible());await page.locator('.focus-history>summary').click();
  if(output)await page.screenshot({path:path.join(output,'focus-timeline-desktop.png'),fullPage:true});
  await page.locator('.focus-gap.is-future').first().click();await page.locator('[data-focus-task-select]').selectOption('files');
  await page.locator('[data-minute="880"]').click();await page.locator('[data-minute="910"]').click();
  assert.match(await page.locator('.focus-range').textContent(),/14:40–15:20 · 40분/);
  if(output)await page.screenshot({path:path.join(output,'focus-picker-desktop.png'),fullPage:true});
  await page.getByRole('button',{name:'저장',exact:true}).click();
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k=>k.startsWith('my-work-focus-timer-v1:')))).until),until);
  await page.waitForFunction(async()=>{const rows=await fetch('/fixture-status').then(r=>r.json());return rows[0][1].state.myWorkV1.data.tasks.find(t=>t.id==='files').blocks.length===1});
  await page.reload();await page.locator('.focus-task').first().waitFor();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k=>k.startsWith('my-work-focus-timer-v1:')))).until),until);
  await page.getByRole('button',{name:'타임라인',exact:true}).click();
  for(const width of [1024,768,390,320]){
   await page.setViewportSize({width,height:850});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'horizontal overflow at '+width);
   if(output)await page.screenshot({path:path.join(output,'focus-timeline-'+width+'.png'),fullPage:true});
  }
  await page.getByRole('button',{name:'리스트',exact:true}).click();await page.getByRole('button',{name:'오늘 할 일 추가',exact:true}).click();await page.getByRole('textbox',{name:'새로운 할 일',exact:true}).fill('브라우저 검수 추가 업무');await page.getByRole('button',{name:'추가',exact:true}).click();assert.equal(await page.locator('.focus-task').count(),7);
  await page.getByRole('button',{name:'프로젝트',exact:true}).click();await page.getByRole('button',{name:'캘린더',exact:true}).click();await page.getByRole('button',{name:'오늘 할 일',exact:true}).click();assert.equal(await page.locator('.focus-task').count(),7);
  assert.deepEqual(errors,[]);console.log('PASS: real page, task linkage, custom timer, collapse, 10-minute scheduling, sync, reload, 320–1280px, quick add, project/calendar navigation; no runtime errors.');
 }finally{await browser?.close();server.kill();}
})().catch(error=>{console.error(error);process.exitCode=1});
