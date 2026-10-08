// Local, synthetic browser fixture. Never connects to Supabase or production data.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const state=title=>({version:5,workConfig:{weekdays:[],label:'회사',start:'09:00',end:'18:00'},workExceptions:{},workOverrides:{},categories:[{id:'personal',name:'개인',color:'#84d7dc'}],trackerDefs:[],trackerLogs:{},sleepLogs:{},events:[{id:'fixture',title,startDate:'2026-10-08',startTime:'10:00',endTime:'11:00',category:'personal',notes:'',active:true,recurrence:{type:'none'},exdates:[]}]});
let revision=1;
const rows=new Map(['A','B'].map(id=>[id,{state:{mySpendingV1:{schema:1,revision:'ledger',data:{fixture:'preserve ledger'}},myWeekV1:{schema:1,revision:'schedule',data:state(id+' 테스트 일정')}},updated_at:String(revision)}]));
const sdk=`export function createClient(url,key,options){
 let session=JSON.parse(options.auth.storage.getItem('fixture-session')||'null'),listener;
 return {auth:{onAuthStateChange(fn){listener=fn;return{data:{subscription:{unsubscribe(){}}}}},async getSession(){return{data:{session}}},async getUser(){return{data:{user:session?.user}}},async signInWithPassword({email}){session={user:{id:email.startsWith('a')?'A':'B',email}};options.auth.storage.setItem('fixture-session',JSON.stringify(session));listener('SIGNED_IN',session);return{data:{user:session.user,session}}},async signOut(){session=null;options.auth.storage.removeItem('fixture-session');listener('SIGNED_OUT',null);return{}},stopAutoRefresh(){}},channel(){return{on(){return this},subscribe(){return this}}},async removeChannel(){},from(){let op='read',payload,filters={};const q={select(){return q},eq(k,v){filters[k]=v;return q},insert(v){op='insert';payload=v;return q},update(v){op='update';payload=v;return q},async maybeSingle(){return fetch('/fixture-api',{method:'POST',body:JSON.stringify({op,payload,filters,user:session?.user.id})}).then(r=>r.json())}};return q}}
}`;
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/fixture-api'){
   let body='';for await(const chunk of req)body+=chunk;const {op,payload,filters,user}=JSON.parse(body),id=filters.user_id??payload?.user_id;
   let reply;if(!user||user!==id)reply={error:{code:'42501'}};
   else if(op==='read')reply={data:rows.get(id)||null};
   else if(op==='update'&&rows.get(id)?.updated_at!==filters.updated_at)reply={data:null};
   else if(op==='insert'&&rows.has(id))reply={error:{code:'23505'}};
   else {const row={state:payload.state,updated_at:String(++revision)};rows.set(id,row);reply={data:row}};
   res.setHeader('content-type','application/json');res.end(JSON.stringify(reply));return;
  }
  if(url.pathname==='/fixture-status'){res.setHeader('content-type','application/json');res.end(JSON.stringify([...rows]));return}
  if(url.pathname==='/vendor/supabase.js'||url.pathname==='/blocked/vendor/supabase.js'){res.setHeader('content-type','text/javascript');res.end(sdk);return}
  let name=decodeURIComponent(url.pathname).replace(/^\/blocked\//,'/').slice(1)||'schedule.html';
  const target=path.resolve(root,name);if(!target.startsWith(root+path.sep)||name.includes('..')||name.startsWith('.')){res.writeHead(404);res.end();return}
  let body=await fs.readFile(target);
  if(name==='schedule.html'&&url.pathname.startsWith('/blocked/'))body=Buffer.from(body.toString().replace('<head>',`<head><script>Object.defineProperty(window,'localStorage',{get(){throw new Error('Fixture: storage denied')}})</script>`));
  res.setHeader('content-type',name.endsWith('.html')?'text/html; charset=utf-8':name.endsWith('.css')?'text/css':name.endsWith('.js')||name.endsWith('.mjs')?'text/javascript':'application/octet-stream');
  res.setHeader('cache-control','no-store');res.setHeader('Content-Security-Policy',"connect-src 'self';");res.end(body);
 }catch(e){res.writeHead(404);res.end('Not found')}
});server.listen(4175,'127.0.0.1',()=>console.log('Synthetic preview http://127.0.0.1:4175/schedule.html'));
http.createServer((req,res)=>{res.setHeader('content-type','text/html; charset=utf-8');res.end('<!doctype html><html lang="ko"><title>일정 임베드 테스트</title><body style="margin:0;background:#111;color:white"><p>저장소 차단 · 외부 iframe 테스트 (가상 데이터)</p><iframe title="일정 앱" src="http://127.0.0.1:4175/blocked/schedule.html" sandbox="allow-scripts allow-same-origin allow-forms allow-downloads" style="border:0;width:100%;height:850px"></iframe></body></html>')}).listen(4176,'127.0.0.1',()=>console.log('Cross-origin sandbox http://localhost:4176'));
