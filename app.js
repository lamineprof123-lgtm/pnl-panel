const POLL=7000,COLORS=['#5eead4','#a78bfa','#fbbf24','#60a5fa','#f472b6','#34d399'];
let period='daily',projects={},charts={},allChart,lastOk=0,prevVals={};
const fmt=(v,c='USD')=>v==null||isNaN(v)?'—':(v<0?'-':v>0?'+':'')+Math.abs(v).toLocaleString('en-US',{style:'currency',currency:c||'USD'});
const plain=(v,c)=>v==null?'—':Math.abs(v).toLocaleString('en-US',{style:'currency',currency:c||'USD'}).replace(/^/,v<0?'-':'');
function animNum(el,to,f,key){const from=prevVals[key]??0;prevVals[key]=to;
 if(from!==to&&el.dataset.init){el.classList.remove('flash-up','flash-down');void el.offsetWidth;el.classList.add(to>from?'flash-up':'flash-down')}
 el.dataset.init=1;const t0=performance.now(),d=900;
 (function s(t){const k=Math.min(1,(t-t0)/d),e=1-Math.pow(1-k,3),v=from+(to-from)*e;el.textContent=f(v);if(k<1)requestAnimationFrame(s)})(t0)}
function sign(el,v){el.classList.toggle('pos',v>0);el.classList.toggle('neg',v<0)}
function norm(p){const rows=(Array.isArray(p.daily)?p.daily:[]).filter(r=>r&&r.date).map(r=>({date:String(r.date).slice(0,10),pnl:+r.pnl||0,balance:r.balance==null||isNaN(+r.balance)?null:+r.balance,trades:+r.trades||0})).sort((a,b)=>a.date<b.date?-1:1);
 const m={};rows.forEach(r=>m[r.date]=r);return {...p,rows:Object.values(m)}}
function agg(rows,per){const n=per==='daily'?10:per==='monthly'?7:4,g={};
 rows.forEach(r=>{const k=r.date.slice(0,n);g[k]=g[k]||{key:k,pnl:0,trades:0,balance:null};g[k].pnl+=r.pnl;g[k].trades+=r.trades;if(r.balance!=null)g[k].balance=r.balance});
 return Object.values(g)}
function status(p){if(/halt|paus/i.test(p.note||'')||/paus/i.test(p.status||''))return['paused','Paused'];
 const last=p.rows.filter(r=>r.trades>0).pop();if(!last)return['idle','No trades'];
 const days=(Date.now()-new Date(last.date))/864e5;return days<2?['active','Active']:['idle','Idle']}
function ago(ts){if(!ts)return'—';const s=(Date.now()-new Date(ts))/1e3;return s<60?Math.round(s)+'s ago':s<3600?Math.round(s/60)+'m ago':s<86400?Math.round(s/3600)+'h ago':Math.round(s/86400)+'d ago'}
const chartOpts=()=>({responsive:true,maintainAspectRatio:false,animation:{duration:800,easing:'easeOutCubic'},interaction:{mode:'index',intersect:false},
 plugins:{legend:{labels:{color:'#8a97ad',boxWidth:10}}},scales:{x:{ticks:{color:'#5b6780'},grid:{color:'#141e33'}},y:{ticks:{color:'#5b6780'},grid:{color:'#141e33'}}}});
function upsertChart(id,labels,datasets){const c=charts[id];
 if(c){c.data.labels=labels;datasets.forEach((d,i)=>{if(c.data.datasets[i])Object.assign(c.data.datasets[i],d);else c.data.datasets.push(d)});c.data.datasets.length=datasets.length;c.update();return}
 const ctx=document.getElementById(id);if(!ctx)return;charts[id]=new Chart(ctx,{data:{labels,datasets},options:chartOpts()})}
function card(slug,p,i){let el=document.getElementById('c-'+slug);
 if(!el){el=document.createElement('section');el.className='card';el.id='c-'+slug;el.innerHTML=`<h2></h2><div class="meta"></div>
 <div class="stats"><div><small>Total PnL</small><b class="t"></b></div><div><small class="pl">Today</small><b class="d"></b></div><div><small>Balance</small><b class="b"></b></div><div><small>Trades</small><b class="n"></b></div></div>
 <div class="ch"><canvas id="ch-${slug}"></canvas></div><table><thead><tr><th>Period</th><th>PnL</th><th>Trades</th><th>Balance</th></tr></thead><tbody></tbody></table><div class="note"></div>`;document.getElementById('cards').appendChild(el)}
 const c=p.currency||'USD',[sk,sl]=status(p),tot=p.rows.reduce((a,r)=>a+r.pnl,0),trades=p.rows.reduce((a,r)=>a+r.trades,0);
 const g=agg(p.rows,period),cur=g[g.length-1],bal=[...p.rows].reverse().find(r=>r.balance!=null);
 el.querySelector('h2').textContent=p.project||slug;
 el.querySelector('.meta').innerHTML=`<span class="badge ${p.mode==='live'?'livem':'paper'}">${(p.mode||'paper').toUpperCase()}</span><span class="badge st-${sk}">${sl}</span><span>${p.bot||''}</span><span>· updated <span class="upd" data-ts="${p.updated_at||''}">${ago(p.updated_at)}</span></span>`;
 const t=el.querySelector('.t');animNum(t,tot,v=>fmt(v,c),slug+'t');sign(t,tot);
 el.querySelector('.pl').textContent={daily:'Latest day',monthly:'This month',yearly:'This year'}[period];
 const d=el.querySelector('.d'),dv=cur?cur.pnl:0;animNum(d,dv,v=>fmt(v,c),slug+'d'+period);sign(d,dv);
 const b=el.querySelector('.b');bal?animNum(b,bal.balance,v=>plain(v,c),slug+'b'):b.textContent='—';
 animNum(el.querySelector('.n'),trades,v=>Math.round(v),slug+'n');
 el.querySelector('tbody').innerHTML=g.slice().reverse().slice(0,8).map(r=>`<tr><td>${r.key}</td><td class="${r.pnl>0?'pos':r.pnl<0?'neg':''}">${fmt(r.pnl,c)}</td><td>${r.trades}</td><td>${r.balance==null?'—':plain(r.balance,c)}</td></tr>`).join('');
 el.querySelector('.note').textContent=(p.start_balance!=null?`Start balance ${plain(p.start_balance,c)} on ${p.start_date}. `:`Started ${p.start_date||'?'}. `)+(p.note||'');
 let cum=0;const col=COLORS[i%COLORS.length];const pts=g.map(r=>(cum+=r.pnl,+cum.toFixed(2)));
 const ds=[{type:'line',label:'Cumulative PnL',data:pts,borderColor:col,backgroundColor:col+'22',fill:true,tension:.35,pointRadius:3},
  {type:'bar',label:'Period PnL',data:g.map(r=>+r.pnl.toFixed(2)),backgroundColor:g.map(r=>r.pnl>=0?'#34d39988':'#f8717188'),borderRadius:4}];
 upsertChart('ch-'+slug,g.map(r=>r.key),ds);return{tot,cur:dv,trades}}
function render(){const slugs=Object.keys(projects).sort();let T=0,D=0,N=0;
 slugs.forEach((s,i)=>{const r=card(s,projects[s],i);T+=r.tot;D+=r.cur;N+=r.trades});
 document.querySelectorAll('#cards>.card').forEach(e=>{if(!projects[e.id.slice(2)]){charts['ch-'+e.id.slice(2)]?.destroy();delete charts['ch-'+e.id.slice(2)];e.remove()}});
 const tE=document.getElementById('tot');animNum(tE,T,v=>fmt(v),'T');sign(tE,T);
 const dE=document.getElementById('today');animNum(dE,D,v=>fmt(v),'D'+period);sign(dE,D);
 document.querySelector('.overview .kpi:nth-child(2) label').textContent={daily:'Latest day',monthly:'This month',yearly:'This year'}[period];
 animNum(document.getElementById('np'),slugs.length,v=>Math.round(v),'NP');animNum(document.getElementById('ntr'),N,v=>Math.round(v),'NT');
 const keys=[...new Set(slugs.flatMap(s=>agg(projects[s].rows,period).map(r=>r.key)))].sort();
 upsertChart('all',keys,slugs.map((s,i)=>{const m=Object.fromEntries(agg(projects[s].rows,period).map(r=>[r.key,r.pnl]));let c=0;
  return{type:'line',label:projects[s].project||s,data:keys.map(k=>+(c+=m[k]||0).toFixed(2)),borderColor:COLORS[i%COLORS.length],tension:.35,pointRadius:2}}))}
async function poll(){try{const bust='?t='+Date.now(),idx=await (await fetch('data/index.json'+bust,{cache:'no-store'})).json();
 const next={};await Promise.all((idx.files||[]).map(async f=>{try{const j=await (await fetch('data/'+f+bust,{cache:'no-store'})).json();next[f.replace(/\.json$/,'')]=norm(j)}catch(e){}}));
 projects=next;lastOk=Date.now();render()}catch(e){console.warn(e)}}
document.getElementById('tabs').onclick=e=>{const b=e.target.closest('button');if(!b)return;period=b.dataset.p;document.querySelectorAll('.tabs button').forEach(x=>x.classList.toggle('on',x===b));render()};
setInterval(()=>{document.getElementById('ago').textContent=lastOk?'· last update '+Math.round((Date.now()-lastOk)/1e3)+'s ago':'connecting…';
 document.querySelectorAll('.upd').forEach(e=>e.textContent=ago(e.dataset.ts))},1000);
poll();setInterval(poll,POLL);
