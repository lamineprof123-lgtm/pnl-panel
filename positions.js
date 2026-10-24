'use strict';
const $=s=>document.querySelector(s);
const NAMES={'mt5-atlas':'ATLAS-MT5-GK-1'};
const ASSETS=[[/XAU|GOLD/,'Gold'],[/XAG|SILVER/,'Silver'],[/NAS|NDX|US100|USTEC|NQ/,'Nasdaq'],[/SPX|SP500|US500|ES\b/,'S&P 500'],[/AUDUSD/,'AUD/USD'],[/BTC/,'Bitcoin'],[/ETH/,'Ethereum'],[/BNB/,'BNB'],[/LINK/,'Chainlink'],[/SOL/,'Solana'],[/XRP/,'XRP'],[/EURUSD/,'EUR/USD'],[/GBPUSD/,'GBP/USD'],[/USDJPY/,'USD/JPY'],[/WTI|USOIL|CL\b/,'Oil'],[/US30|DJI|DOW/,'Dow']];
const asset=a=>{const u=String(a??'').toUpperCase();for(const[r,n]of ASSETS)if(r.test(u))return n;return a};
const F=Object.assign({sort:'new',asset:'',strat:'',status:'',mode:''},JSON.parse(localStorage.getItem('posF')||'{}'));
let books={},sel=null,seen=new Set(),first=true;
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const money=v=>v==null||!isFinite(v)?'—':(v<0?'\u2212':v>0?'+':'')+Math.abs(v).toLocaleString('en-US',{style:'currency',currency:'USD'});
const num=(v,d)=>v==null||v===''||!isFinite(+v)?null:(+v).toFixed(d).replace(/\.?0+$/,'');
function when(s){if(!s)return'—';const d=new Date(s);if(isNaN(d))return esc(s);
  return d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',timeZone:'Asia/Dubai'})+' <span class="t">'+d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Dubai'})+'</span>'}
function opts(q,lbl,vals,cur){const el=$(q),k=vals.join('|');if(el._k!==k){el.innerHTML=`<option value="">${lbl}</option>`+vals.map(v=>`<option>${esc(v)}</option>`).join('');el._k=k}el.value=vals.includes(cur)?cur:''}
function held(p){const o=p.opened_at;if(!isFinite(o))return'';const c=p.closed_at;
  if(p.status!=='open'&&isFinite(c))return`<div class="held">${Math.max(0,Math.round((c-o)/1e3)).toLocaleString('en-US')}s</div>`;
  return`<div class="held" data-o="${o}">${Math.max(0,Math.round((Date.now()-o)/1e3)).toLocaleString('en-US')}s</div>`}
// All positions are loaded; filters, sort and totals use all of them. Only the visible slice of rows is in the DOM
// (PAGE rows, more appended as you scroll / tap "Show more").
const PAGE=150;let ps=[],shown=PAGE,facetKey='';
const ob=(a,b)=>(b.opened_at||0)-(a.opened_at||0);
function rowHtml(p){const id=sel+':'+(p.id??p.opened_at+p.asset),isNew=!first&&!seen.has(id);seen.add(id);
  const open=p.status==='open',v=+p.pnl,rr=num(p.rr,2),lots=num(p.lots,2),side=p.side?`<span class="sd ${p.side==='sell'?'neg':'pos'}">${p.side==='sell'?'S':'B'}</span>`:'';
  return `<tr class="${isNew?'new':''}${p.mode==='shadow'?' sh':''}"><td class="cd">${when(p.opened_at)}</td><td class="cs">${esc(p.strategy)}</td><td class="ca">${side}${esc(asset(p.asset))}</td>
    <td class="r mut cr">${rr!=null?rr+'R':'—'} · ${lots&&+lots?lots:'—'}${held(p)}</td>
    <td class="r cp ${v>0?'pos':v<0?'neg':''}">${open?'<i class="dot"></i>':''}${money(v)}</td></tr>`}
function drawRows(){const more=$('#more');
  if(!ps.length){$('#rows').innerHTML=`<tr class="none"><td colspan="5">${(books[sel]?.positions||[]).length?'No matches':'No positions yet'}</td></tr>`;more.hidden=true;return}
  const n=Math.min(shown,ps.length);let h='';for(let i=0;i<n;i++)h+=rowHtml(ps[i]);$('#rows').innerHTML=h;
  more.hidden=n>=ps.length;more.textContent=`Show more · ${(ps.length-n).toLocaleString('en-US')} left`;first=false}
function appendRows(){const n0=$('#rows').children.length,n=Math.min(ps.length,n0+PAGE);if(n<=n0)return;let h='';for(let i=n0;i<n;i++)h+=rowHtml(ps[i]);
  $('#rows').insertAdjacentHTML('beforeend',h);shown=n;const more=$('#more');more.hidden=n>=ps.length;more.textContent=`Show more · ${(ps.length-n).toLocaleString('en-US')} left`}
function render(){
  const slugs=Object.keys(books);if(!sel||!books[sel])sel=slugs.includes('mt5-atlas')?'mt5-atlas':slugs[0];
  const th=slugs.length>1?slugs.map(s=>`<button data-s="${esc(s)}" class="${s===sel?'on':''}">${esc(NAMES[s]||books[s].project||s)}</button>`).join(''):'';if($('#tabs')._h!==th){$('#tabs').innerHTML=th;$('#tabs')._h=th}
  const all=books[sel]?.positions||[],fk=sel+'|'+(books[sel]?.updated_at||'');
  if(fk!==facetKey){facetKey=fk;const as=new Set(),ss=new Set();for(const p of all){as.add(asset(p.asset));if(p.strategy)ss.add(p.strategy)}
    all._as=[...as].sort();all._ss=[...ss].sort()}
  opts('#fAsset','All assets',all._as||[],F.asset);opts('#fStrat','All strategies',all._ss||[],F.strat);
  ['#fSort','#fStatus','#fMode'].forEach((q,i)=>$(q).value=F[['sort','status','mode'][i]]);
  const by={new:ob,old:(a,b)=>(a.opened_at||0)-(b.opened_at||0),hi:(a,b)=>(+b.pnl||0)-(+a.pnl||0),lo:(a,b)=>(+a.pnl||0)-(+b.pnl||0)}[F.sort]||((a,b)=>0);
  ps=all.filter(p=>(!F.asset||asset(p.asset)===F.asset)&&(!F.strat||p.strategy===F.strat)&&(!F.status||p.status===F.status)&&(!F.mode||(p.mode||'live')===F.mode)).sort(by);
  let tot=0,op=0;for(const p of ps){if(p.status==='open')op+=+p.pnl||0;else tot+=+p.pnl||0}
  $('#sum').innerHTML=`${ps.length.toLocaleString('en-US')} positions · Realized <b class="${tot>0?'pos':tot<0?'neg':''}">${money(tot)}</b>${op?` · Open <span class="${op>0?'pos':'neg'}">${money(op)}</span>`:''}`;
  drawRows();
}
PNL.watch(b=>{books=b;render()});PNL.liveBadge();
$('#more').addEventListener('click',appendRows);
new IntersectionObserver(e=>{if(e[0].isIntersecting&&!$('#more').hidden)appendRows()},{rootMargin:'600px'}).observe($('#more'));
$('#tabs').addEventListener('click',e=>{const b=e.target.closest('button');if(b){sel=b.dataset.s;render()}});
document.querySelectorAll('.ctl select').forEach(el=>el.addEventListener('change',()=>{F[el.dataset.k]=el.value;localStorage.setItem('posF',JSON.stringify(F));seen=new Set();first=true;shown=PAGE;render()}));
setInterval(()=>document.querySelectorAll('.held[data-o]').forEach(e=>e.textContent=Math.max(0,Math.round((Date.now()-+e.dataset.o)/1e3)).toLocaleString('en-US')+'s'),1000);
