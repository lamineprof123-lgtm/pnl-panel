'use strict';
const $=s=>document.querySelector(s),POLL=7000;
const NAMES={'mt5-atlas':'MT5 Atlas'};
let books={},sel=null,lastOk=0,seen=new Set(),first=true;
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const money=v=>v==null||!isFinite(v)?'—':(v<0?'\u2212':v>0?'+':'')+Math.abs(v).toLocaleString('en-US',{style:'currency',currency:'USD'});
const num=(v,d)=>v==null||v===''||!isFinite(+v)?null:(+v).toFixed(d).replace(/\.?0+$/,'');
function when(s){if(!s)return'—';const d=new Date(s);if(isNaN(d))return esc(s);
  return d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',timeZone:'Asia/Dubai'})+' <span class="t">'+d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Dubai'})+'</span>'}
function render(){
  const slugs=Object.keys(books);if(!sel||!books[sel])sel=slugs.includes('mt5-atlas')?'mt5-atlas':slugs[0];
  $('#tabs').innerHTML=slugs.length>1?slugs.map(s=>`<button data-s="${esc(s)}" class="${s===sel?'on':''}">${esc(NAMES[s]||books[s].project||s)}</button>`).join(''):'';
  const ps=(books[sel]?.positions||[]).slice().sort((a,b)=>String(b.opened_at||'').localeCompare(String(a.opened_at||'')));
  if(!ps.length){$('#rows').innerHTML='<tr class="none"><td colspan="5">No positions yet</td></tr>';return}
  $('#rows').innerHTML=ps.map(p=>{const id=sel+':'+(p.id??p.opened_at+p.asset),isNew=!first&&!seen.has(id);seen.add(id);
    const open=p.status==='open',v=+p.pnl,rr=num(p.rr,2),lots=num(p.lots,2),side=p.side?`<span class="sd ${p.side==='sell'?'neg':'pos'}">${p.side==='sell'?'S':'B'}</span>`:'';
    return `<tr class="${isNew?'new':''}"><td>${when(p.opened_at)}</td><td>${esc(p.strategy)}</td><td>${side}${esc(p.asset)}</td>
    <td class="r mut">${rr!=null?rr+'R':'—'} · ${lots??'—'}</td>
    <td class="r ${v>0?'pos':v<0?'neg':''}">${open?'<i class="dot"></i>':''}${money(v)}</td></tr>`}).join('');
  first=false;
}
async function poll(){try{const b='?t='+Date.now(),idx=await(await fetch('data/positions/index.json'+b,{cache:'no-store'})).json(),n={};
  await Promise.all((idx.files||[]).map(async f=>{try{n[f.replace(/\.json$/,'')]=await(await fetch('data/positions/'+f+b,{cache:'no-store'})).json()}catch(e){}}));
  books=n;lastOk=Date.now();render()}catch(e){console.warn(e)}}
$('#tabs').addEventListener('click',e=>{const b=e.target.closest('button');if(b){sel=b.dataset.s;render()}});
setInterval(()=>{const s=lastOk?Math.round((Date.now()-lastOk)/1e3):null;$('#ago').textContent=s==null?'Connecting':s<10?'Live':`Live · ${s}s`;$('#live').classList.toggle('stale',s!=null&&s>30)},1000);
poll();setInterval(poll,POLL);
