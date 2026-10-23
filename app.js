'use strict';
const POLL=7000,COLORS=['#00f0ff','#ff2bd6','#8b5cff','#00ff9c','#ffb800','#4d9fff'];
const $=s=>document.querySelector(s);
let period='daily',projects={},order=[],charts={},lastOk=0,prev={},tickerKey='';
const today=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const keyLen={daily:10,monthly:7,yearly:4};
const money=(v,c='USD',signed=true)=>{if(v==null||!isFinite(v))return'—';const a=Math.abs(v).toLocaleString('en-US',{style:'currency',currency:c||'USD'});return (v<0?'-':signed&&v>0?'+':'')+a};
const pct=v=>v==null||!isFinite(v)?'—':(v>0?'+':'')+v.toFixed(2)+'%';
const cls=v=>v>0?'pos':v<0?'neg':'zero';
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function setCls(el,v){el.classList.remove('pos','neg','zero');el.classList.add(cls(v))}
function ago(ts){if(!ts)return'—';const s=(Date.now()-new Date(ts))/1e3;if(!isFinite(s))return'—';return s<60?Math.max(0,Math.round(s))+'s ago':s<3600?Math.round(s/60)+'m ago':s<86400?Math.round(s/3600)+'h ago':Math.round(s/86400)+'d ago'}

/* ---------- data ---------- */
function norm(p){
  const m={};(Array.isArray(p.daily)?p.daily:[]).forEach(r=>{if(!r||!r.date)return;const d=String(r.date).slice(0,10);
    m[d]={date:d,pnl:+r.pnl||0,balance:r.balance==null||!isFinite(+r.balance)?null:+r.balance,trades:+r.trades||0}});
  const rows=Object.values(m).sort((a,b)=>a.date<b.date?-1:1);
  const sb=p.start_balance==null||!isFinite(+p.start_balance)?null:+p.start_balance;
  const tot=rows.reduce((a,r)=>a+r.pnl,0),trades=rows.reduce((a,r)=>a+r.trades,0);
  const lastBal=[...rows].reverse().find(r=>r.balance!=null);
  const equity=lastBal?lastBal.balance:(sb!=null?sb+tot:null);
  return {...p,rows,sb,tot,trades,equity,roi:sb?tot/sb*100:null,cur:p.currency||'USD'};
}
function agg(rows,per){const n=keyLen[per],g={};
  rows.forEach(r=>{const k=r.date.slice(0,n);g[k]=g[k]||{key:k,pnl:0,trades:0,balance:null};g[k].pnl+=r.pnl;g[k].trades+=r.trades;if(r.balance!=null)g[k].balance=r.balance});
  return Object.values(g).sort((a,b)=>a.key<b.key?-1:1)}
function status(p){if(/halt|paus/i.test((p.status||'')+' '+(p.note||'')))return['paused','Paused'];
  const last=[...p.rows].reverse().find(r=>r.trades>0);if(!last)return['wait','Warming up'];
  return (Date.now()-new Date(last.date+'T23:59:59'))/864e5<2?['active','Active']:['idle','Idle']}

/* ---------- odometer ---------- */
function odo(el,str){
  const chars=[...str],mask=chars.map(c=>/\d/.test(c)?'#':c).join('');
  if(el._mask!==mask){
    el.innerHTML=chars.map((c,i)=>/\d/.test(c)
      ?`<span class="col"><span class="strip">${'0123456789'.split('').map(d=>`<span>${d}</span>`).join('')}</span></span>`
      :`<span class="ch${c==='$'?' sym':''}">${esc(c)}</span>`).join('');
    el._mask=mask;el.offsetHeight;
  }
  const strips=el.querySelectorAll('.strip');let j=0;
  requestAnimationFrame(()=>chars.forEach(c=>{if(/\d/.test(c)){strips[j].style.transform=`translateY(${-(+c)*10}%)`;j++}}));
}
/* ---------- count-up for small numbers ---------- */
function tween(el,to,f,key){
  const from=prev[key];prev[key]=to;
  if(from!=null&&from!==to){const p=el.closest('.card')||el;p.classList.remove('pulse-up','pulse-down');void p.offsetWidth;p.classList.add(to>from?'pulse-up':'pulse-down');setTimeout(()=>p.classList.remove('pulse-up','pulse-down'),1400)}
  const a=from??0,t0=performance.now(),D=900;
  if(a===to){el.textContent=f(to);return}
  (function s(t){const k=Math.min(1,(t-t0)/D),e=1-Math.pow(1-k,3);el.textContent=f(a+(to-a)*e);if(k<1)requestAnimationFrame(s)})(t0);
}

/* ---------- charts ---------- */
const glow={id:'glow',beforeDatasetDraw(c,a){const ds=c.data.datasets[a.index];if(ds.type==='bar')return;c.ctx.save();c.ctx.shadowColor=ds.borderColor;c.ctx.shadowBlur=ds._glow||12},afterDatasetDraw(c){c.ctx.restore()}};
if(window.Chart){Chart.register(glow);Chart.defaults.font.family="'JetBrains Mono',monospace";Chart.defaults.color='#7d86a8'}
function grad(color){return ctx=>{const {chart}=ctx,a=chart.chartArea;if(!a)return color+'22';const g=chart.ctx.createLinearGradient(0,a.top,0,a.bottom);g.addColorStop(0,color+'55');g.addColorStop(1,color+'00');return g}}
function yRange(vals){const mn=Math.min(0,...vals),mx=Math.max(0,...vals);if(mx-mn<1e-9)return{min:-1,max:1,grace:0};return{min:undefined,max:undefined,grace:'12%'}}
function upsert(id,labels,datasets,opts){
  const c=charts[id];
  if(c){c.data.labels=labels;datasets.forEach((d,i)=>{if(c.data.datasets[i])Object.assign(c.data.datasets[i],d);else c.data.datasets.push(d)});c.data.datasets.length=datasets.length;
    Object.assign(c.options.scales.y,opts.y);c.update();return}
  const el=document.getElementById(id);if(!el||!window.Chart)return;
  charts[id]=new Chart(el,{type:'line',data:{labels,datasets},options:{
    responsive:true,maintainAspectRatio:false,animation:{duration:900,easing:'easeOutQuart'},
    transitions:{active:{animation:{duration:200}}},interaction:{mode:'index',intersect:false},
    plugins:{legend:{display:!!opts.legend,position:'bottom',labels:{boxWidth:8,boxHeight:8,usePointStyle:true,color:'#9aa3c7',padding:14}},
      tooltip:{backgroundColor:'rgba(8,10,26,.92)',borderColor:'rgba(0,240,255,.4)',borderWidth:1,padding:10,titleColor:'#00f0ff',
        callbacks:{label:t=>' '+t.dataset.label+': '+money(t.parsed.y,opts.cur)}}},
    scales:{x:{display:!opts.spark,grid:{color:'rgba(120,140,255,.07)'},ticks:{maxRotation:0,autoSkipPadding:16}},
      y:{display:!opts.spark,grid:{color:ctx=>ctx.tick.value===0?'rgba(0,240,255,.35)':'rgba(120,140,255,.07)'},ticks:{callback:v=>money(v,opts.cur,false),maxTicksLimit:5},...opts.y}},
    elements:{line:{tension:.35,cubicInterpolationMode:'monotone',borderWidth:2.2,borderCapStyle:'round'},point:{radius:opts.spark?0:2.5,hoverRadius:5,hitRadius:12}}}});
}
function series(p){const g=agg(p.rows,period);let c=0;
  const labels=['Start',...g.map(r=>r.key)],data=[0,...g.map(r=>+(c+=r.pnl).toFixed(2))];return{labels,data,g}}

/* ---------- cards ---------- */
function makeCard(slug,i){
  const el=document.createElement('section');el.className='card glass reveal';el.style.setProperty('--d',5+i);el.id='c-'+slug;
  el.innerHTML=`<div class="glow"></div><div class="c-top"><div><h3></h3><div class="bot"></div></div><div class="badges"></div></div>
  <div class="c-mid"><div class="c-pnl">$0.00</div><div class="c-roi">0.00%</div></div>
  <div class="spark"><canvas id="sp-${slug}"></canvas><div class="empty"><span>Awaiting first settled trade</span></div></div>
  <div class="kv"><div><small>Equity</small><b class="eq">—</b></div><div><small>Start</small><b class="sb">—</b></div><div><small class="pl">Today</small><b class="pp">—</b></div><div><small>Trades</small><b class="tr">0</b></div></div>
  <div class="rows"></div>
  <div class="c-foot"><span>updated <span class="upd"></span></span><button type="button">history ▾</button></div><div class="note"></div>`;
  el.querySelector('button').onclick=()=>{el.classList.toggle('open');el.querySelector('button').textContent=el.classList.contains('open')?'history ▴':'history ▾'};
  if(matchMedia('(pointer:fine)').matches){
    el.addEventListener('mousemove',e=>{const r=el.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;
      el.style.transform=`rotateX(${(.5-y)*7}deg) rotateY(${(x-.5)*9}deg) translateY(-3px)`;el.style.setProperty('--mx',x*100+'%');el.style.setProperty('--my',y*100+'%')});
    el.addEventListener('mouseleave',()=>el.style.transform='');
  }
  el.addEventListener('animationend',()=>{el.classList.remove('reveal');el.style.opacity=1},{once:true});
  $('#cards').appendChild(el);return el;
}
const perName=()=>({daily:'Today',monthly:'This month',yearly:'This year'}[period]);
function renderCard(slug,p,i){
  const el=document.getElementById('c-'+slug)||makeCard(slug,i),c=p.cur,[sk,sl]=status(p),col=COLORS[i%COLORS.length];
  el.classList.toggle('live-card',p.mode==='live');
  el.querySelector('h3').textContent=p.project||slug;el.querySelector('.bot').textContent=p.bot||'';
  el.querySelector('.badges').innerHTML=`<span class="badge ${p.mode==='live'?'b-live':'b-paper'}">${p.mode==='live'?'LIVE':'PAPER'}</span><span class="badge b-st ${sk}">${sl}</span>`;
  const pe=el.querySelector('.c-pnl');tween(pe,p.tot,v=>money(v,c),slug+'tot');setCls(pe,p.tot);
  const re=el.querySelector('.c-roi');re.textContent=pct(p.roi);setCls(re,p.roi||0);
  el.querySelector('.eq').textContent=money(p.equity,c,false);el.querySelector('.sb').textContent=money(p.sb,c,false);
  const k=today().slice(0,keyLen[period]),cur=agg(p.rows,period).find(r=>r.key===k),pp=el.querySelector('.pp');
  el.querySelector('.pl').textContent=perName();pp.textContent=money(cur?cur.pnl:0,c);setCls(pp,cur?cur.pnl:0);
  tween(el.querySelector('.tr'),p.trades,v=>Math.round(v),slug+'tr');
  const upd=el.querySelector('.upd');upd.dataset.ts=p.updated_at||'';upd.textContent=ago(p.updated_at);
  el.querySelector('.note').textContent=p.note||'';
  const {labels,data,g}=series(p),flat=data.every(v=>v===0)&&p.trades===0;
  el.querySelector('.spark .empty').classList.toggle('show',flat);
  el.querySelector('.rows').innerHTML=g.slice().reverse().slice(0,10).map(r=>`<div><span>${r.key}</span><span>${r.trades} tr</span><span class="${cls(r.pnl)}">${money(r.pnl,c)}</span></div>`).join('')||'<div><span>no rows yet</span></div>';
  const lc=p.tot<0?'#ff3b6b':p.tot>0?'#00ff9c':col;
  upsert('sp-'+slug,labels,[{label:p.project||slug,data,borderColor:lc,backgroundColor:grad(lc),fill:'origin',_glow:14,borderDash:flat?[6,6]:[]}],{spark:true,cur:c,y:yRange(data)});
}

/* ---------- page ---------- */
function render(){
  const slugs=order;let tot=0,cap=0,eq=0,capOk=false,per=0,tr=0,win=0,act=0,live=0;
  const k=today().slice(0,keyLen[period]);
  slugs.forEach((s,i)=>{const p=projects[s];renderCard(s,p,i);tot+=p.tot;tr+=p.trades;if(p.mode==='live')live++;
    if(p.sb!=null){cap+=p.sb;capOk=true}if(p.equity!=null)eq+=p.equity;
    const r=agg(p.rows,period).find(r=>r.key===k);if(r)per+=r.pnl;
    p.rows.forEach(r=>{if(r.trades>0){act++;if(r.pnl>0)win++}})});
  document.querySelectorAll('#cards>.card').forEach(e=>{const s=e.id.slice(2);if(!projects[s]){charts['sp-'+s]?.destroy();delete charts['sp-'+s];e.remove()}});
  const h=$('#heroPnl');odo(h,money(tot));setCls(h,tot);
  const roi=capOk&&cap?tot/cap*100:null,re=$('#heroRoi');re.textContent='ROI '+pct(roi);setCls(re,roi||0);
  $('#heroCap').textContent=capOk?money(cap,'USD',false):'—';$('#heroEq').textContent=money(eq,'USD',false);
  const awaiting=tr===0;$('#heroAwait').classList.toggle('show',awaiting);
  $('#perLbl').textContent=perName().toUpperCase();const pe=$('#perPnl');tween(pe,per,v=>money(v),'per'+period);setCls(pe,per);
  tween($('#nProj'),slugs.length,v=>Math.round(v),'np');$('#modeMix').textContent=`${live} live · ${slugs.length-live} paper`;
  tween($('#nTr'),tr,v=>Math.round(v),'ntr');$('#winD').textContent=act?`${win}/${act}`:'—';
  // main chart
  const keys=[...new Set(slugs.flatMap(s=>agg(projects[s].rows,period).map(r=>r.key)))].sort(),labels=['Start',...keys];
  const ds=slugs.map((s,i)=>{const m=Object.fromEntries(agg(projects[s].rows,period).map(r=>[r.key,r.pnl]));let c=0;const col=COLORS[i%COLORS.length];
    return{label:projects[s].project||s,data:[0,...keys.map(k=>+(c+=m[k]||0).toFixed(2))],borderColor:col,backgroundColor:grad(col),fill:slugs.length===1,pointBackgroundColor:col}});
  const all=ds.flatMap(d=>d.data);upsert('all',labels,ds,{legend:true,y:yRange(all)});
  $('#allEmpty').classList.toggle('show',awaiting);
  $('#chartHint').textContent={daily:'per day',monthly:'per month',yearly:'per year'}[period]+' · from fresh start';
  // ticker
  const items=[`<span class="tk"><span class="n">Σ TOTAL</span><span class="${cls(tot)}">${money(tot)}</span><span class="${cls(roi||0)}">${pct(roi)}</span></span>`,
    ...slugs.map(s=>{const p=projects[s];return`<span class="tk"><span class="m badge ${p.mode==='live'?'b-live':'b-paper'}">${p.mode==='live'?'LIVE':'PAPER'}</span><span class="n">${esc(p.project||s)}</span><span class="${cls(p.tot)}">${money(p.tot,p.cur)}</span><span class="${cls(p.roi||0)}">${pct(p.roi)}</span><span style="color:#7d86a8">eq ${money(p.equity,p.cur,false)} · ${p.trades} tr</span></span>`})];
  let line=items.join('');while(items.length&&line.length<2500&&slugs.length<4)line+=items.join('');
  const key=line;if(key!==tickerKey){tickerKey=key;$('#ticker').innerHTML=line+line}
}
async function poll(){
  try{const b='?t='+Date.now(),idx=await (await fetch('data/index.json'+b,{cache:'no-store'})).json(),next={};
    await Promise.all((idx.files||[]).map(async f=>{try{next[f.replace(/\.json$/,'')]=norm(await (await fetch('data/'+f+b,{cache:'no-store'})).json())}catch(e){}}));
    projects=next;order=Object.keys(next).sort((a,b)=>(next[a].mode==='live'?0:1)-(next[b].mode==='live'?0:1)||a.localeCompare(b));
    lastOk=Date.now();render()}catch(e){console.warn('poll failed',e)}
}
/* segmented toggle */
$('#seg').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;period=b.dataset.p;const bs=[...document.querySelectorAll('#seg button')],i=bs.indexOf(b);
  bs.forEach(x=>x.classList.toggle('on',x===b));$('#seg .slider').style.transform=`translateX(${i*100}%)`;render()});
/* clocks */
setInterval(()=>{const s=lastOk?Math.round((Date.now()-lastOk)/1e3):null;$('#ago').textContent=s==null?'syncing…':`· ${s}s ago`;$('#live').classList.toggle('stale',s!=null&&s>30);
  document.querySelectorAll('.upd').forEach(e=>e.textContent=ago(e.dataset.ts))},1000);
/* particles */
(function(){const cv=$('#fx'),ctx=cv.getContext('2d');let W,H,P=[],dpr=Math.min(devicePixelRatio||1,2);
  function size(){W=cv.width=innerWidth*dpr;H=cv.height=innerHeight*dpr;const n=innerWidth<700?34:70;
    P=Array.from({length:n},()=>({x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-.5)*.25*dpr,vy:(Math.random()-.5)*.25*dpr,r:(Math.random()*1.6+.4)*dpr,c:Math.random()<.5?'0,240,255':'255,43,214'}))}
  size();addEventListener('resize',size);const L=130*dpr;
  function f(){if(!document.hidden){ctx.clearRect(0,0,W,H);
    for(let i=0;i<P.length;i++){const a=P[i];a.x+=a.vx;a.y+=a.vy;if(a.x<0||a.x>W)a.vx*=-1;if(a.y<0||a.y>H)a.vy*=-1;
      ctx.fillStyle=`rgba(${a.c},.8)`;ctx.beginPath();ctx.arc(a.x,a.y,a.r,0,7);ctx.fill();
      for(let j=i+1;j<P.length;j++){const b=P[j],dx=a.x-b.x,dy=a.y-b.y,d=dx*dx+dy*dy;if(d<L*L){ctx.strokeStyle=`rgba(${a.c},${(1-Math.sqrt(d)/L)*.18})`;ctx.lineWidth=dpr*.6;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke()}}}}
    requestAnimationFrame(f)}
  if(!matchMedia('(prefers-reduced-motion:reduce)').matches)f()})();
poll();setInterval(poll,POLL);
