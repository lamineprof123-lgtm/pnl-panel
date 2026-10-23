'use strict';
const POLL=7000;
const $=s=>document.querySelector(s);
let period='daily',projects={},order=[],charts={},lastOk=0,prev={};
const today=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const keyLen={daily:10,monthly:7,yearly:4};
const money=(v,c='USD',signed=true)=>{if(v==null||!isFinite(v))return'—';const a=Math.abs(v).toLocaleString('en-US',{style:'currency',currency:c||'USD'});return(v<0?'\u2212':signed&&v>0?'+':'')+a};
const pct=v=>v==null||!isFinite(v)?'—':(v>0?'+':'')+v.toFixed(2)+'%';
const cls=v=>v>0?'pos':v<0?'neg':'zero';
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function setCls(el,v){el.classList.remove('pos','neg','zero');el.classList.add(cls(v))}
const NAMES={'polymarket-weather-v2':['Polymarket Weather','Grok Bot'],'tennis-late-edge':['Stake Tennis','Stake'],
  'walletplay-copytrade-sim':['Solana Copytrade','WalletPlay'],'robinhood-etf-momentum':['Robinhood ETFs','Robinhood'],
  'robinhood-spacex-agent':['Robinhood SpaceX','Robinhood'],'fomo-copytrade':['Fomo Copytrade','FOMO'],'mt5-atlas':['MT5 Atlas','MT5']};
const dname=(s,p)=>(NAMES[s]||[])[0]||p.project||s, dbot=(s,p)=>(NAMES[s]||[])[1]||p.bot||'';
const perName=()=>({daily:'Today',monthly:'This month',yearly:'This year'}[period]);

/* data */
function norm(p){
  const m={};(Array.isArray(p.daily)?p.daily:[]).forEach(r=>{if(!r||!r.date)return;const d=String(r.date).slice(0,10);
    m[d]={date:d,pnl:+r.pnl||0,balance:r.balance==null||!isFinite(+r.balance)?null:+r.balance,trades:+r.trades||0}});
  const rows=Object.values(m).sort((a,b)=>a.date<b.date?-1:1);
  const sb=p.start_balance==null||!isFinite(+p.start_balance)?null:+p.start_balance;
  const tot=rows.reduce((a,r)=>a+r.pnl,0),trades=rows.reduce((a,r)=>a+r.trades,0);
  const lastBal=[...rows].reverse().find(r=>r.balance!=null);
  const equity=lastBal?lastBal.balance:(sb!=null?sb+tot:null);
  const inv=p.invested!=null&&isFinite(+p.invested)&&+p.invested>0?+p.invested:null,base=inv??sb;
  return{...p,rows,sb,inv,base,tot,trades,equity,roi:base?tot/base*100:null,cur:p.currency||'USD'};
}
function agg(rows,per){const n=keyLen[per],g={};
  rows.forEach(r=>{const k=r.date.slice(0,n);g[k]=g[k]||{key:k,pnl:0,trades:0};g[k].pnl+=r.pnl;g[k].trades+=r.trades});
  return Object.values(g).sort((a,b)=>a.key<b.key?-1:1)}

/* odometer */
function odo(el,str){
  const chars=[...str],mask=chars.map(c=>/\d/.test(c)?'#':c).join('');
  if(el._mask!==mask){
    el.innerHTML=chars.map(c=>/\d/.test(c)?`<span class="col"><span class="strip">${[...'0123456789'].map(d=>`<span>${d}</span>`).join('')}</span></span>`:`<span class="ch">${esc(c)}</span>`).join('');
    el._mask=mask;el.offsetHeight;
  }
  const strips=el.querySelectorAll('.strip');let j=0;
  requestAnimationFrame(()=>chars.forEach(c=>{if(/\d/.test(c)){strips[j].style.transform=`translateY(${-(+c)*10}%)`;j++}}));
}
function tween(el,to,f,key){
  const from=prev[key];prev[key]=to;
  if(from!=null&&from!==to){const c=el.closest('.card');if(c){c.classList.remove('flash-up','flash-down');void c.offsetWidth;c.classList.add(to>from?'flash-up':'flash-down')}}
  const a=from??to,t0=performance.now(),D=900;
  if(a===to){el.textContent=f(to);return}
  (function s(t){const k=Math.min(1,(t-t0)/D),e=1-Math.pow(1-k,3);el.textContent=f(a+(to-a)*e);if(k<1)requestAnimationFrame(s)})(t0);
}

/* charts */
function grad(ctx,col){const {chart}=ctx,{ctx:c,chartArea:a}=chart;if(!a)return'transparent';const g=c.createLinearGradient(0,a.top,0,a.bottom);g.addColorStop(0,col+'33');g.addColorStop(1,col+'00');return g}
function spark(id,labels,data,col,flat,cur){
  const el=document.getElementById(id);if(!el||!window.Chart)return;
  const lo=Math.min(0,...data),hi=Math.max(0,...data),pad=(hi-lo)*.15||1;
  const ds={data,borderColor:flat?'rgba(255,255,255,.18)':col,backgroundColor:c=>flat?'transparent':grad(c,col),fill:'origin',borderDash:flat?[4,5]:[],borderWidth:2,pointRadius:0,pointHoverRadius:4,tension:.35,cubicInterpolationMode:'monotone'};
  let ch=charts[id];
  if(ch){ch.data.labels=labels;Object.assign(ch.data.datasets[0],ds);ch.options.scales.y.min=lo-pad;ch.options.scales.y.max=hi+pad;ch.update();return}
  charts[id]=new Chart(el,{type:'line',data:{labels,datasets:[ds]},options:{responsive:true,maintainAspectRatio:false,
    animation:{duration:1000,easing:'easeOutQuart'},interaction:{mode:'index',intersect:false},layout:{padding:{top:4,bottom:2}},
    plugins:{legend:{display:false},tooltip:{displayColors:false,backgroundColor:'rgba(15,17,26,.95)',borderColor:'rgba(255,255,255,.1)',borderWidth:1,padding:8,
      callbacks:{label:t=>money(t.parsed.y,cur)}}},
    scales:{x:{display:false},y:{display:false,min:lo-pad,max:hi+pad}}}});
}

/* cards */
function makeCard(slug,i){
  const el=document.createElement('section');el.className='card rise';el.style.setProperty('--d',3+i);el.id='c-'+slug;
  el.innerHTML=`<div class="c-top"><div class="c-name"><h3></h3><div class="c-bot"></div></div><span class="badge"></span></div>
  <div class="c-mid"><div class="c-pnl">$0.00</div><div class="c-roi">0.00%</div></div>
  <div class="c-bal">Balance <b class="eq">—</b><span class="stk"></span></div>
  <div class="spark"><canvas id="sp-${slug}"></canvas><span class="empty">No trades yet</span></div>`;
  $('#cards').appendChild(el);return el;
}
function renderCard(slug,p,i){
  const el=document.getElementById('c-'+slug)||makeCard(slug,i),c=p.cur,live=p.mode==='live';
  const h=el.querySelector('h3');h.textContent=dname(slug,p);h.title=p.project||'';el.querySelector('.c-bot').textContent=dbot(slug,p);
  const b=el.querySelector('.badge');b.className='badge '+(live?'b-live':'b-paper');b.textContent=live?'LIVE':'PAPER';
  const pe=el.querySelector('.c-pnl');tween(pe,p.tot,v=>money(v,c),slug+'tot');setCls(pe,p.tot);
  const re=el.querySelector('.c-roi');re.textContent=pct(p.roi);re.classList.remove('pos','neg');if(p.roi)re.classList.add(cls(p.roi));
  tween(el.querySelector('.eq'),p.equity??0,v=>money(v,c,false),slug+'eq');
  el.querySelector('.stk').textContent=p.inv?' · At stake '+money(p.inv,c,false):'';
  const g=agg(p.rows,period);let cum=0;const labels=['Start',...g.map(r=>r.key)],data=[0,...g.map(r=>+(cum+=r.pnl).toFixed(2))];
  const flat=p.trades===0&&data.every(v=>v===0);
  el.querySelector('.empty').classList.toggle('show',flat);
  spark('sp-'+slug,labels,data,p.tot<0?'#fb7185':'#34d399',flat,c);
}
function render(){
  let tot=0,cap=0,per=0;const k=today().slice(0,keyLen[period]);
  order.forEach((s,i)=>{const p=projects[s];renderCard(s,p,i);tot+=p.tot;if(p.base)cap+=p.base;const r=agg(p.rows,period).find(r=>r.key===k);if(r)per+=r.pnl});
  document.querySelectorAll('#cards>.card').forEach(e=>{const s=e.id.slice(2);if(!projects[s]){charts['sp-'+s]?.destroy();delete charts['sp-'+s];e.remove()}});
  const h=$('#heroPnl');odo(h,money(tot));setCls(h,tot);
  const roi=cap?tot/cap*100:null,re=$('#heroRoi');re.textContent=pct(roi);re.classList.remove('pos','neg');if(roi)re.classList.add(cls(roi));
  $('#perLbl').textContent=perName();const pe=$('#perPnl');tween(pe,per,v=>money(v),'per'+period);pe.classList.remove('pos','neg');if(per)pe.classList.add(cls(per));
}
async function poll(){
  try{const b='?t='+Date.now(),idx=await(await fetch('data/index.json'+b,{cache:'no-store'})).json(),next={};
    await Promise.all((idx.files||[]).map(async f=>{try{next[f.replace(/\.json$/,'')]=norm(await(await fetch('data/'+f+b,{cache:'no-store'})).json())}catch(e){}}));
    projects=next;const rk=s=>s==='mt5-atlas'?0:next[s].mode==='live'?1:2;order=Object.keys(next).sort((a,b)=>rk(a)-rk(b)||a.localeCompare(b));
    lastOk=Date.now();render()}catch(e){console.warn('poll failed',e)}
}
$('#seg').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;period=b.dataset.p;const bs=[...document.querySelectorAll('#seg button')],i=bs.indexOf(b);
  bs.forEach(x=>x.classList.toggle('on',x===b));$('#seg .slider').style.transform=`translateX(${i*100}%)`;render()});
setInterval(()=>{const s=lastOk?Math.round((Date.now()-lastOk)/1e3):null;$('#ago').textContent=s==null?'Connecting':s<10?'Live':`Live · ${s}s`;$('#live').classList.toggle('stale',s!=null&&s>30)},1000);
poll();setInterval(poll,POLL);
