'use strict';
const $=s=>document.querySelector(s);
const NAMES={'mt5-atlas':'ATLAS-MT5-GK-1'};
const ASSETS=[[/XAU|GOLD/,'Gold'],[/XAG|SILVER/,'Silver'],[/NAS|NDX|US100|USTEC|NQ/,'Nasdaq'],[/SPX|SP500|US500|ES\b/,'S&P 500'],[/AUDUSD/,'AUD/USD'],[/BTC/,'Bitcoin'],[/ETH/,'Ethereum'],[/BNB/,'BNB'],[/LINK/,'Chainlink'],[/SOL/,'Solana'],[/XRP/,'XRP'],[/EURUSD/,'EUR/USD'],[/GBPUSD/,'GBP/USD'],[/USDJPY/,'USD/JPY'],[/WTI|USOIL|CL\b/,'Oil'],[/US30|DJI|DOW/,'Dow']];
const asset=a=>{const u=String(a??'').toUpperCase();for(const[r,n]of ASSETS)if(r.test(u))return n;return a};
const F=Object.assign({sort:'hi',asset:'',status:'',mode:''},JSON.parse(localStorage.getItem('stF')||'{}'));
let books={},sel=null,prev={};
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const money=v=>v==null||!isFinite(v)?'—':(v<0?'\u2212':v>0?'+':'')+Math.abs(v).toLocaleString('en-US',{style:'currency',currency:'USD'});
const day=s=>{const d=new Date(s);return isNaN(d)?String(s||'').slice(0,10):d.toLocaleDateString('en-CA',{timeZone:'Asia/Dubai'})};
function opts(q,lbl,vals,cur){const el=$(q),k=vals.join('|');if(el._k!==k){el.innerHTML=`<option value="">${lbl}</option>`+vals.map(v=>`<option>${esc(v)}</option>`).join('');el._k=k}el.value=vals.includes(cur)?cur:''}
// Aggregates are precomputed over ALL positions by build_derived.py (data/strategies.json):
// cell = [strategyIdx, assetIdx, mode, status, trades, closed, wins, pnl, [dayIdx...]]
let SJ=null,assetsByBook={};
function render(){
  const slugs=Object.keys(books);if(!sel||!books[sel])sel=slugs.includes('mt5-atlas')?'mt5-atlas':slugs[0];
  const th=slugs.length>1?slugs.map(s=>`<button data-s="${esc(s)}" class="${s===sel?'on':''}">${esc(NAMES[s]||books[s].project||s)}</button>`).join(''):'';if($('#tabs')._h!==th){$('#tabs').innerHTML=th;$('#tabs')._h=th}
  const bk=books[sel],cells=bk?.cells||[],AN=SJ?.A||[],SN=SJ?.S||[];
  if(!assetsByBook[sel])assetsByBook[sel]=[...new Set(cells.map(c=>asset(AN[c[1]])))].sort();
  opts('#fAsset','All assets',assetsByBook[sel],F.asset);
  ['#fSort','#fStatus','#fMode'].forEach((q,i)=>$(q).value=F[['sort','status','mode'][i]]);
  const g={};for(const c of cells){if((F.asset&&asset(AN[c[1]])!==F.asset)||(F.status&&c[3]!==F.status)||(F.mode&&c[2]!==F.mode))continue;
    const k=SN[c[0]],s=g[k]=g[k]||{name:k,days:new Set(),assets:new Set(),n:0,closed:0,wins:0,pnl:0,open:0,shadow:0};
    for(const d of c[8])s.days.add(d);s.assets.add(asset(AN[c[1]]));s.n+=c[4];s.pnl+=c[7];s.closed+=c[5];s.wins+=c[6];
    if(c[2]==='shadow')s.shadow+=c[4];if(c[3]==='open')s.open+=c[4]}
  const rows=Object.values(g).map(s=>({...s,pnl:Math.round(s.pnl*1e6)/1e6,win:s.closed?s.wins/s.closed*100:null}));
  const by={hi:(a,b)=>b.pnl-a.pnl,lo:(a,b)=>a.pnl-b.pnl,days:(a,b)=>b.days.size-a.days.size||b.pnl-a.pnl,n:(a,b)=>b.n-a.n||b.pnl-a.pnl,win:(a,b)=>(b.win??-1)-(a.win??-1)||b.pnl-a.pnl}[F.sort];rows.sort(by);
  const tot=rows.reduce((a,r)=>a+r.pnl,0),best=rows.length?Math.max(...rows.map(r=>r.pnl)):0,worst=rows.length?Math.min(...rows.map(r=>r.pnl)):0;
  $('#sum').innerHTML=`${rows.length} strategies · <b class="${tot>0?'pos':tot<0?'neg':''}">${money(tot)}</b>`;
  if(!rows.length){$('#rows').innerHTML=`<tr class="none"><td colspan="5">${cells.length?'No matches':'No strategies yet'}</td></tr>`;return}
  $('#rows').innerHTML=rows.map((r,i)=>{const v=r.pnl,ch=prev[r.name]!=null&&prev[r.name]!==v;prev[r.name]=v;
    const tag=r.pnl===best&&best>0?'<span class="tag top">Best</span>':r.pnl===worst&&worst<0?'<span class="tag bot">Worst</span>':'';
    return `<tr class="${ch?'new':''}${r.shadow===r.n?' sh':''}"><td class="ca"><span class="rk">${i+1}</span>${esc(r.name)}${tag}</td>
    <td class="cd">${r.days.size} day${r.days.size===1?'':'s'}</td><td class="cs">${esc([...r.assets].join(', '))}</td>
    <td class="r mut cr">${r.n} · ${r.win==null?'—':Math.round(r.win)+'%'}${r.open?` <i class="dot"></i>`:''}</td>
    <td class="r cp ${v>0?'pos':v<0?'neg':''}">${money(v)}</td></tr>`}).join('');
}
// poll the tiny index every 38s; download strategies.json only when a book's updated_at changed
let lastU='';
async function poll(){try{const t='?t='+Date.now(),idx=await(await fetch('data/positions/index.json'+t,{cache:'no-store'})).json(),u=JSON.stringify(idx.u||{});
  if(u!==lastU||!SJ){const j=await(await fetch('data/strategies.json'+t,{cache:'no-store'})).json();
    const bu=JSON.stringify(Object.fromEntries((j.books||[]).map(b=>[b.slug,b.u])));
    SJ=j;books=Object.fromEntries((j.books||[]).map(b=>[b.slug,b]));assetsByBook={};lastU=bu===u?u:'';render()}
  PNL.lastOk=Date.now()}catch(e){console.warn(e)}}
poll();setInterval(poll,PNL.POLL);PNL.liveBadge();
$('#tabs').addEventListener('click',e=>{const b=e.target.closest('button');if(b){sel=b.dataset.s;render()}});
document.querySelectorAll('.ctl select').forEach(el=>el.addEventListener('change',()=>{F[el.dataset.k]=el.value;localStorage.setItem('stF',JSON.stringify(F));prev={};render()}));
