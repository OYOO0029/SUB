import {defaultPlannerMode} from './planner-calendar.mjs';

const views = document.getElementById('planner-views');
const loading = document.getElementById('planner-loading');
const controls = [...document.querySelectorAll('.planner-mode')];
const frames = new Map();
let mode;
let homePending=false;

function showMode(next) {
  if (!['personal','work'].includes(next)) return;
  mode = next;
  for (const button of controls) {
    button.classList.toggle('active', button.dataset.value === mode);
    button.setAttribute('aria-pressed', String(button.dataset.value === mode));
  }
  if (!frames.has(mode)) {
    const frame = document.createElement('iframe');
    frame.className = 'planner-view';
    frame.title = mode === 'personal' ? '개인 일정' : '업무 일정';
    const url = new URL(mode === 'personal' ? './personal.html' : './work/index.html', location.href);
    url.searchParams.set('embedded','1');
    url.searchParams.set('v','20261018-work-width');
    frame.src = url.href;
    const frameMode = mode;
    frame.addEventListener('load', () => {
      frame.dataset.loaded = 'true';
      frame.contentWindow.postMessage({type:'planner-active',active:mode === frameMode}, location.origin);
      if(mode === frameMode){loading.hidden = true;if(homePending){frame.contentWindow.postMessage({type:"planner-home"},location.origin);homePending=false;}}
    });
    frames.set(mode,frame);
    views.append(frame);
  }
  for(const [key,frame] of frames) {
    frame.hidden = key !== mode;
    frame.inert = key !== mode;
    frame.contentWindow.postMessage({type:'planner-active',active:key === mode},location.origin);
  }
  loading.hidden = frames.get(mode).dataset.loaded === 'true';
  document.querySelector('.shell-header').hidden=frames.get(mode).dataset.modal==='true';
  document.title = `WHAT TO DO · ${mode === 'personal' ? '개인' : '업무'}`;
}

document.getElementById('planner-home').addEventListener('click',()=>{
 homePending=true;showMode(defaultPlannerMode());const frame=frames.get(mode);
 if(frame.dataset.loaded==='true'){frame.contentWindow.postMessage({type:'planner-home'},location.origin);homePending=false;}
});
controls.forEach(button => button.addEventListener('click', () => showMode(button.dataset.value)));
document.querySelector('.planner-switch').addEventListener('keydown', event => {
  if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
  event.preventDefault();
  const next = ['ArrowLeft','Home'].includes(event.key) ? 'personal' : 'work';
  showMode(next);
  controls.find(button => button.dataset.value === next).focus();
});
window.addEventListener('message', event => {
  if(event.origin !== location.origin || ![...frames.values()].some(frame => frame.contentWindow === event.source)) return;
  if(event.data?.type==='planner-modal'){
    const frame=[...frames.values()].find(frame=>frame.contentWindow===event.source);frame.dataset.modal=String(!!event.data.open);
    if(frame===frames.get(mode))document.querySelector('.shell-header').hidden=!!event.data.open;
  }
  if(event.data?.type === 'planner-mode') showMode(event.data.mode);
});
const requested = new URLSearchParams(location.search).get('mode');
showMode(['personal','work'].includes(requested) ? requested : defaultPlannerMode());
