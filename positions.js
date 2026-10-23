'use strict';
const $=s=>document.querySelector(s),POLL=7000;
const NAMES={'mt5-atlas':'ATLAS-MT5-GK-1'};
const ASSETS=[[/XAU|GOLD/,'Gold'],[/XAG|SILVER/,'Silver'],[/NAS|NDX|US100|USTEC|NQ/,'Nasdaq'],[/SPX|SP500|US500|ES\b/,'S&P 500'],[/AUDUSD/,'AUD/USD'],[/BTC/,'Bitcoin'],[/ETH/,'Ethereum'],[/BNB/,'BNB'],[/LINK/,'Chainlink'],[/SOL/,'Solana'],[/XRP/,'XRP'],[/EURUSD/,'EUR/USD'],[/GBPUSD/,'GBP/USD'],[/USDJPY/,'USD/JPY'],[/WTI|USOIL|CL\b/,'Oil'],[/US30|DJI|DOW/,'Dow']];
const asset=a=>{const u=String(a??'').toUpperCase();for(const[r,n]of ASSETS)if(r.test(u))return n;return a};
const F=Object.assign({sort:'new',asset:'',strat:'',status:'',mode:''},JSON.parse(localStorage.getItem('posF')||'{}'));
let books={},sel=null,lastOk=0,seen=new Set(),first=true;
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const money=v=>v==null||!isFinite(v)?'—':(v<0?'\u2212':v>0?'+':'')+Math.abs(v).toLocaleString('en-US',{style:'currency',currency:'USD'});
const num=(v,d)=>v==null||v===''||!isFinite(+v)?null:(+v).toFixed(d).replace(/\.?0+$/,'');
function when(s){if(!s)return'—';const d=new Date(s);if(isNaN(d))return esc(s);
  return d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',timeZone:'Asia/Dubai'})+' <span class="t">'+d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Dubai'})+'</span>'}
function opts(q,lbl,vals,cur){const el=$(q),k=vals.join('|');if(el._k!==k){el.innerHTML=`<option value="">${lbl}</option>`+vals.map(v=>`<option>${esc(v)}</option>`).join('');el._k=k}el.value=vals.includes(cur)?cur:''}
function render(){
  const slugs=Object.keys(books);if(!sel||!books[sel])sel=slugs.includes('mt5-atlas')?'mt5-atlas':slugs[0];
  $('#tabs').innerHTML=slugs.length>1?slugs.map(s=>`<button data-s="${esc(s)}" class="${s===sel?'on':''}">${esc(NAMES[s]||books[s].project||s)}</button>`).join(''):'';
  const all=books[sel]?.positions||[];
  opts('#fAsset','All assets',[...new Set(all.map(p=>asset(p.asset)))].sort(),F.asset);
  opts('#fStrat','All strategies',[...new Set(all.map(p=>p.strategy).filter(Boolean))].sort(),F.strat);
  ['#fSort','#fStatus','#fMode'].forEach((q,i)=>$(q).value=F[['sort','status','mode'][i]]);
  const by={new:(a,b)=>String(b.opened_at||'').localeCompare(String(a.opened_at||'')),old:(a,b)=>String(a.opened_at||'').localeCompare(String(b.opened_at||'')),hi:(a,b)=>(+b.pnl||0)-(+a.pnl||0),lo:(a,b)=>(+a.pnl||0)-(+b.pnl||0)}[F.sort]||((a,b)=>0);
  const ps=all.filter(p=>(!F.asset||asset(p.asset)===F.asset)&&(!F.strat||p.strategy===F.strat)&&(!F.status||p.status===F.status)&&(!F.mode||(p.mode||'live')===F.mode)).sort(by);
  const tot=ps.reduce((a,p)=>a+(+p.pnl||0),0),sm=$('#sum');sm.innerHTML=`${ps.length} positions · <b class="${tot>0?'pos':tot<0?'neg':''}">${money(tot)}</b>`;
  if(!ps.length){$('#rows').innerHTML=`<tr class="none"><td colspan="5">${all.length?'No matches':'No positions yet'}</td></tr>`;return}
  $('#rows').innerHTML=ps.map(p=>{const id=sel+':'+(p.id??p.opened_at+p.asset),isNew=!first&&!seen.has(id);seen.add(id);
    const open=p.status==='open',v=+p.pnl,rr=num(p.rr,2),lots=num(p.lots,2),side=p.side?`<span class="sd ${p.side==='sell'?'neg':'pos'}">${p.side==='sell'?'S':'B'}</span>`:'';
    return `<tr class="${isNew?'new':''}${p.mode==='shadow'?' sh':''}"><td class="cd">${when(p.opened_at)}</td><td class="cs">${esc(p.strategy)}</td><td class="ca">${side}${esc(asset(p.asset))}</td>
    <td class="r mut cr">${rr!=null?rr+'R':'—'} · ${lots&&+lots?lots:'—'}</td>
    <td class="r cp ${v>0?'pos':v<0?'neg':''}">${open?'<i class="dot"></i>':''}${money(v)}</td></tr>`}).join('');
  first=false;
}
async function poll(){try{const b='?t='+Date.now(),idx=await(await fetch('data/positions/index.json'+b,{cache:'no-store'})).json(),n={};
  await Promise.all((idx.files||[]).map(async f=>{try{n[f.replace(/\.json$/,'')]=await(await fetch('data/positions/'+f+b,{cache:'no-store'})).json()}catch(e){}}));
  books=n;lastOk=Date.now();render()}catch(e){console.warn(e)}}
$('#tabs').addEventListener('click',e=>{const b=e.target.closest('button');if(b){sel=b.dataset.s;render()}});
document.querySelectorAll('.ctl select').forEach(el=>el.addEventListener('change',()=>{F[el.dataset.k]=el.value;localStorage.setItem('posF',JSON.stringify(F));seen=new Set();first=true;render()}));
setInterval(()=>{const s=lastOk?Math.round((Date.now()-lastOk)/1e3):null;$('#ago').textContent=s==null?'Connecting':s<10?'Live':`Live · ${s}s`;$('#live').classList.toggle('stale',s!=null&&s>30)},1000);
poll();setInterval(poll,POLL);
