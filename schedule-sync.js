import {startCloud} from './schedule-cloud-ui.mjs?v=20261027-journal-1';
function start(){
 const button=document.createElement('button');button.id='syncCloudBtn';button.type='button';button.className='sync-cloud-btn';button.dataset.action='cloud-open';button.setAttribute('aria-label','계정 · 동기화');button.innerHTML='<span data-cloud-label>계정 · 동기화</span><small data-cloud-status></small>';document.querySelector('.header-actions').append(button);
 startCloud(window.myWeekSyncBridge);
}
if(window.myWeekSyncBridge)start();else window.addEventListener('my-week-ready',start,{once:true});
