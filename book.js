'use strict';
/* Shared loader: polls the tiny positions/index.json every 38s and only downloads + decodes a
   book's compact columnar file (<slug>.c.json, ALL positions) when its updated_at changed. */
(function(){
const POLL=38000,st={u:{},books:{}};
function decode(d){const n=d.n,B=d.base,ps=new Array(n),S=d.S,A=d.A,ST=d.ST;
  for(let i=0;i<n;i++){const oo=d.o[i],o=oo>=0?(B+oo)*1e3:NaN,c=d.c[i]>=0&&oo>=0?o+d.c[i]*1e3:NaN,s=S[d.s[i]],sd=d.sd[i];
    ps[i]={id:d.id[i]===0?`SH-${s}-${B+oo}`:d.id[i],opened_at:o,closed_at:c,status:ST[d.st[i]],strategy:s,asset:A[d.a[i]],
      side:sd===1?'sell':sd===0?'buy':null,lots:d.l[i],rr:d.r[i],pnl:d.p[i],mode:d.m[i]?'shadow':'live'}}
  return{project:d.project,updated_at:d.u,positions:ps}}
async function tick(cb){try{const t='?t='+Date.now(),idx=await(await fetch('data/positions/index.json'+t,{cache:'no-store'})).json();
  let changed=false;const keep={};
  await Promise.all((idx.files||[]).map(async f=>{const slug=f.replace(/\.json$/,''),u=(idx.u||{})[slug];keep[slug]=1;
    if(st.books[slug]&&u&&st.u[slug]===u)return;   // unchanged: skip download, parse and re-render
    try{const d=await(await fetch('data/positions/'+slug+'.c.json'+t,{cache:'no-store'})).json();
      if(st.books[slug]&&st.u[slug]===d.u)return;st.books[slug]=decode(d);st.u[slug]=d.u;changed=true}catch(e){console.warn(e)}}));
  for(const k in st.books)if(!keep[k]){delete st.books[k];changed=true}
  PNL.lastOk=Date.now();if(changed)cb(st.books)}catch(e){console.warn(e)}}
const PNL=window.PNL={POLL,lastOk:0,decode,watch(cb){tick(cb);setInterval(()=>tick(cb),POLL)},
  liveBadge(){setInterval(()=>{const s=PNL.lastOk?Math.round((Date.now()-PNL.lastOk)/1e3):null;const a=document.getElementById('ago'),l=document.getElementById('live');if(!a)return;
    a.textContent=s==null?'Connecting':s<45?'Live':`Live · ${s}s`;l&&l.classList.toggle('stale',s!=null&&s>95)},1000)}};
})();
