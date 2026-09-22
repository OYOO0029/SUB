const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/ryzen/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..');
const source='C:/Users/ryzen/Desktop/html/가계부/가계부_v8_24_버그수정_목적간편설정_고정헤더.html';
const backup=path.resolve(root,'..','spending-v824-source-backup.json');
const sdk=fs.readFileSync(path.join(__dirname,'schedule-sync-browser.cjs'),'utf8').match(/const sdk=`([\s\S]*?)`;/)[1];
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 try{
 const extract=await browser.newContext();await extract.route('**/*',r=>r.request().url()==='https://source.local/'?r.fulfill({contentType:'text/html',body:fs.readFileSync(source,'utf8')}):r.abort());
 const original=await extract.newPage();await original.goto('https://source.local/');const data=await original.evaluate(()=>window.SpendingDashboardSync.getState());
 assert.equal(data.tx.length,41);fs.writeFileSync(backup,JSON.stringify({app:'spending-dashboard',version:'8.24',state:data},null,2));await extract.close();
 const context=await browser.newContext({viewport:{width:1280,height:900}});
 await context.route('**/*',r=>{const url=r.request().url();if(url.startsWith('https://cdn.jsdelivr.net/npm/@supabase/supabase-js'))return r.fulfill({contentType:'text/javascript',body:sdk});if(url.startsWith('https://test.local/')){const name=new URL(url).pathname.slice(1)||'index.html';return r.fulfill({contentType:name.endsWith('.html')?'text/html':'text/javascript',body:fs.readFileSync(path.join(root,name),'utf8')})}return r.abort()});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 await page.goto('https://test.local/');await page.locator('#syncStatus[role=button]').waitFor();assert.equal(await page.evaluate(()=>state.tx.length),0);
 await page.locator('#syncStatus').click();await page.locator('#spendingEmail').fill('test@example.test');await page.locator('#spendingPassword').fill('test-password');await page.locator('#spendingLogin').click();await page.waitForFunction(()=>document.querySelector('#spendingAccount').textContent.includes('test@example.test'));assert.equal(await page.evaluate(()=>window.mockWrites||0),0);
 await page.locator('#spendingSyncDialog .close').click();await page.evaluate(()=>openData());await page.locator('#restoreFile').setInputFiles(backup);await page.locator('#restoreConfirm').click();await page.waitForFunction(()=>state.tx.length===41);await page.evaluate(()=>closeModal('dataModal'));
 assert.equal(await page.evaluate(()=>window.mockWrites||0),0);
 await page.locator('#syncStatus').click();await page.locator('#spendingPush').click();await page.waitForFunction(()=>window.mockRow?.state.tx.length===41);assert.deepEqual(await page.evaluate(()=>window.mockRow.state),await page.evaluate(()=>window.spendingSyncBridge.read()));
 await page.locator('#spendingSyncDialog .close').click();await page.evaluate(()=>{state.tx[0].amount+=100;changed();});await page.waitForFunction(()=>window.mockRow.state.tx[0].amount===1600);
 await page.evaluate(()=>{state.prepaid['안산 지역화폐'].charges[0].amount+=100;state.budgets['2026-09']['식비']+=100;changed();});await page.waitForFunction(()=>window.mockRow.state.budgets['2026-09']['식비']===300100);
 await page.evaluate(()=>openTransaction());await page.locator('#iItem').fill('미저장 입력');await page.evaluate(()=>{window.mockRow={state:{...window.mockRow.state,tx:[]},updated_at:'external'};window.mockRealtime()});await page.waitForTimeout(100);assert.equal(await page.locator('#iItem').inputValue(),'미저장 입력');assert.equal(await page.evaluate(()=>state.tx.length),41);
 // A valid remote snapshot can only replace the screen after the editor closes.
 await page.evaluate(()=>{window.mockRow.state.settlements=[];closeModal('txModal')});await page.waitForFunction(()=>state.tx.length===0);
 // JSON import after connection follows the same server save pipeline.
 await page.evaluate(()=>openData());await page.locator('#restoreFile').setInputFiles(backup);await page.locator('#restoreConfirm').click();await page.waitForFunction(()=>window.mockRow.state.tx.length===41);await page.evaluate(()=>closeModal('dataModal'));
 for(const width of [1280,390,320]){await page.setViewportSize({width,height:850});await page.locator('#syncStatus').click();assert(await page.locator('#spendingSyncDialog').isVisible());assert.equal(await page.evaluate(()=>document.querySelector('#spendingSyncDialog').getBoundingClientRect().right<=innerWidth),true);await page.screenshot({path:path.resolve(root,'..',`spending-sync-${width}.png`)});await page.locator('#spendingSyncDialog .close').click();}
 assert.deepEqual(errors,[]);console.log('PASS: 41 original records backed up outside repo; empty public defaults; explicit initial connection; import; transaction/budget/prepaid saves; remote edit deferral; responsive UI; no runtime errors.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
