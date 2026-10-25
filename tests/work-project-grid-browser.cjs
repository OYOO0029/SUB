// Synthetic local accounts only; the browser never reaches production services.
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),{spawn}=require('node:child_process');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..'),port=4197,origin=`http://127.0.0.1:${port}`;
(async()=>{
 const server=spawn(process.execPath,['tests/schedule-preview.mjs'],{cwd:root,env:{...process.env,FOCUS_QA:'1',PROJECT_QA:'1',PREVIEW_PORT:String(port)},stdio:['ignore','pipe','pipe'],windowsHide:true});
 let browser;
 try{
  await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('Fixture did not start')),15000);server.stdout.on('data',chunk=>{if(String(chunk).includes('Synthetic preview')){clearTimeout(timeout);resolve()}});server.once('exit',code=>{clearTimeout(timeout);reject(Error('Fixture exited '+code))});server.stderr.on('data',chunk=>process.stderr.write(chunk));});
  browser=await chromium.launch({...(process.env.BROWSER_EXE?{executablePath:process.env.BROWSER_EXE}:{}),headless:true});
  const context=await browser.newContext({viewport:{width:1280,height:900}});
  await context.route('**/*',route=>route.request().url().startsWith(origin)?route.continue():route.abort());
  await context.addInitScript(()=>localStorage.setItem('fixture-session',JSON.stringify({user:{id:'A',email:'a@fixture.test'}})));
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/work/index.html?embedded=1');await page.locator('.focus-task').first().waitFor();
  const output=process.env.FOCUS_SCREENSHOTS;if(output)fs.mkdirSync(output,{recursive:true});
  const screenshot=async name=>{if(output)await page.screenshot({path:path.join(output,name+'.png'),fullPage:true})};
  const navigate=async label=>page.getByRole('button',{name:label,exact:true}).click();
  const geometry=()=>page.locator('.workspace-content').evaluate(el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return {left:r.left+parseFloat(s.paddingLeft),right:r.right-parseFloat(s.paddingRight),width:document.querySelector('.main').getBoundingClientRect().width}});
  const baseline=await geometry();assert.equal(baseline.width,768);
  await navigate('프로젝트');assert.deepEqual(await geometry(),baseline);assert.equal(await page.locator('.project-overview-card').count(),4);
  const first=page.locator('.project-overview-card').first();assert.equal(await first.locator('.project-current-work').count(),2);assert.equal(await first.locator('.project-more-works').textContent(),'외 1개');
  assert.equal(await first.locator('.project-next,.project-count,.project-card-meta').count(),0);
  assert.equal(await page.getByText('대기 업무는 카드에서 제외',{exact:true}).count(),0);assert.equal(await page.getByText('완료 업무는 카드에서 제외',{exact:true}).count(),0);
  const rects=await page.locator('.project-overview-card').evaluateAll(els=>els.map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}}));
  assert.equal(rects[0].y,rects[1].y);assert.equal(rects[0].width,rects[1].width);assert(rects[2].y>rects[0].y);await screenshot('project-grid-desktop');
  await page.locator('.project-overview-card[data-id="site"]').click();await page.locator('.flow-project-page').waitFor();assert.deepEqual(await geometry(),baseline);
  await page.locator('[data-complete="task-site-check"]').check();await page.getByRole('button',{name:'‹ 프로젝트 목록',exact:true}).click();
  assert.equal(await page.locator('.project-overview-card[data-id="site"] .project-current-work').count(),0);assert.equal(await page.locator('.project-overview-card[data-id="site"] .project-no-work').count(),1);
  await page.locator('.project-overview-card[data-id="site"]').click();await page.locator('[data-fold="group-site-check"]>summary').click();await page.locator('[data-fold="done-site-check"]>summary').click();await page.locator('[data-complete="task-site-check"]').uncheck();await page.getByRole('button',{name:'‹ 프로젝트 목록',exact:true}).click();
  assert.equal(await page.locator('.project-overview-card[data-id="site"] .project-current-work').count(),1);
  await page.getByRole('button',{name:'프로젝트 상태 필터',exact:true}).click();await page.locator('[data-action="project-filter"][data-value="all"]').click();assert.equal(await page.locator('.project-overview-card').count(),6);await page.keyboard.press('Escape');
  for(const width of [1280,390]){
   await page.setViewportSize({width,height:560});
   const grid=page.locator('.project-overview .project-grid'),toolbar=page.locator('.project-list-toolbar'),before=await toolbar.boundingBox();
   assert(await grid.evaluate(el=>el.scrollHeight>el.clientHeight),'list should overflow inside content');
   await grid.hover();await page.mouse.wheel(0,600);await page.waitForFunction(()=>document.querySelector('.project-grid').scrollTop>0);
   assert.equal((await toolbar.boundingBox()).y,before.y,'toolbar moves with cards');
   assert(await page.evaluate(()=>window.scrollY===0&&document.documentElement.scrollHeight<=innerHeight+1),'outer page scrolls');
   await page.locator('.project-overview-card').last().focus();
   const scrollTop=await grid.evaluate(el=>el.scrollTop);
   await page.keyboard.press('Enter');await page.locator('.flow-project-page').waitFor();await page.getByRole('button',{name:'‹ 프로젝트 목록',exact:true}).click();
   assert(Math.abs(await grid.evaluate(el=>el.scrollTop)-scrollTop)<1,'returning from detail resets list scroll');
   await screenshot('project-scroll-'+(width===1280?'desktop':'mobile'));
  }
  for(const width of [1280,768,390,320]){
   await page.setViewportSize({width,height:900});await navigate('오늘 할 일');const expected=await geometry();
   await navigate('프로젝트');assert.deepEqual(await geometry(),expected);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   const columns=await page.locator('.project-grid').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length);assert.equal(columns,width<=720?1:2);
   if(width===390)await screenshot('project-grid-mobile');
   await navigate('캘린더');assert.deepEqual(await geometry(),expected);await navigate('월간');
   assert.deepEqual(await geometry(),expected);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await page.waitForTimeout(100);assert(await page.locator('.calendar-week').count()>=5);
   assert(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+1),'monthly view overflow at '+width);
  }
  assert.deepEqual(errors,[]);console.log('PASS: shared content geometry, two-column cards, current work groups, completion refresh, internal scroll/fixed toolbar/return position, project detail/filter, 320–1280px, and monthly fit.');
 }finally{await browser?.close();server.kill();}
})().catch(error=>{console.error(error);process.exitCode=1});
