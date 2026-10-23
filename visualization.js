import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';

const $=s=>document.querySelector(s),POLL=7000,MAX=1500,TRAIL=10;
const ASSETS=[[/XAU|GOLD/,'Gold'],[/XAG|SILVER/,'Silver'],[/NAS|NDX|US100|USTEC|NQ/,'Nasdaq'],[/SPX|SP500|US500|ES\b/,'S&P 500'],[/AUDUSD/,'AUD/USD'],[/BTC/,'Bitcoin'],[/ETH/,'Ethereum'],[/BNB/,'BNB'],[/LINK/,'Chainlink'],[/SOL/,'Solana'],[/XRP/,'XRP'],[/SUI/,'Sui'],[/EURUSD/,'EUR/USD'],[/GBPUSD/,'GBP/USD'],[/USDJPY/,'USD/JPY'],[/WTI|USOIL|CL\b/,'Oil'],[/US30|DJI|DOW/,'Dow']];
const assetName=a=>{const u=String(a??'').toUpperCase();for(const[r,n]of ASSETS)if(r.test(u))return n;return a||'—'};
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const money=v=>!isFinite(v)?'—':(v<0?'\u2212':v>0?'+':'')+Math.abs(v).toLocaleString('en-US',{style:'currency',currency:'USD'});
const hash=s=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return(h>>>0)/4294967296};
const C={pos:new THREE.Color('#34d399'),neg:new THREE.Color('#fb7185'),zero:new THREE.Color('#c9d3dd')};

/* ---------- renderer / scene ---------- */
const canvas=$('#space'),mobile=matchMedia('(max-width:700px)').matches;
const renderer=new THREE.WebGLRenderer({canvas,antialias:false,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,mobile?1.5:1.75));
renderer.setClearColor(0x000000,1);
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(50,1,.1,400);
const controls=new OrbitControls(camera,canvas);
Object.assign(controls,{enableDamping:true,dampingFactor:.06,enablePan:false,autoRotate:true,autoRotateSpeed:.35,minDistance:4,maxDistance:30,rotateSpeed:.6,zoomSpeed:.8});

const composer=new EffectComposer(renderer);
composer.addPass(new RenderPass(scene,camera));
const bloom=new UnrealBloomPass(new THREE.Vector2(256,256),1.05,.75,.0);
composer.addPass(bloom);composer.addPass(new OutputPass());

function resize(){const w=innerWidth,h=innerHeight;renderer.setSize(w,h,false);composer.setSize(w,h);
  const pr=renderer.getPixelRatio();bloom.resolution.set(w*pr/2,h*pr/2);camera.aspect=w/h;camera.updateProjectionMatrix();U.pr.value=pr*h/900}
const U={time:{value:0},pr:{value:1}};

/* ---------- glow texture for nebula / halo ---------- */
function radial(stops){const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d'),gr=g.createRadialGradient(128,128,0,128,128,128);
  stops.forEach(([o,col])=>gr.addColorStop(o,col));g.fillStyle=gr;g.fillRect(0,0,256,256);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t}
const soft=radial([[0,'rgba(255,255,255,1)'],[.25,'rgba(255,255,255,.45)'],[.6,'rgba(255,255,255,.08)'],[1,'rgba(255,255,255,0)']]);
function sprite(color,scale,op,pos){const m=new THREE.SpriteMaterial({map:soft,color,transparent:true,opacity:op,blending:THREE.AdditiveBlending,depthWrite:false});
  const s=new THREE.Sprite(m);s.scale.setScalar(scale);if(pos)s.position.copy(pos);return s}

/* ---------- starfield ---------- */
const starMat=new THREE.ShaderMaterial({uniforms:U,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
  vertexShader:`attribute float sz;attribute float ph;attribute vec3 col;varying float a;varying vec3 vc;uniform float time;uniform float pr;
  void main(){vec4 mv=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;a=.55+.45*sin(time*(.6+fract(ph*7.)*1.8)+ph*6.283);vc=col;gl_PointSize=sz*pr*(1.+.25*a);}`,
  fragmentShader:`varying float a;varying vec3 vc;void main(){float d=length(gl_PointCoord-.5)*2.;float g=exp(-d*d*5.);if(g<.01)discard;gl_FragColor=vec4(vc*g*a,1.);}`});
const stars=new THREE.Group();scene.add(stars);
[[2600,90,160,1.4],[900,50,90,2.2]].forEach(([n,r0,r1,s])=>{const p=new Float32Array(n*3),sz=new Float32Array(n),ph=new Float32Array(n),col=new Float32Array(n*3);
  const tint=[new THREE.Color('#ffffff'),new THREE.Color('#a5f3fc'),new THREE.Color('#bfdbfe'),new THREE.Color('#99f6e4')];
  for(let i=0;i<n;i++){const v=new THREE.Vector3().randomDirection().multiplyScalar(r0+Math.random()*(r1-r0));p.set([v.x,v.y,v.z],i*3);
    sz[i]=s*(.5+Math.pow(Math.random(),3)*2.2);ph[i]=Math.random();const c=tint[(Math.random()*4)|0].clone().multiplyScalar(.35+Math.random()*.5);col.set([c.r,c.g,c.b],i*3)}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(p,3));g.setAttribute('sz',new THREE.BufferAttribute(sz,1));g.setAttribute('ph',new THREE.BufferAttribute(ph,1));g.setAttribute('col',new THREE.BufferAttribute(col,3));
  stars.add(new THREE.Points(g,starMat))});

/* ---------- nebula ---------- */
const nebula=new THREE.Group();scene.add(nebula);
[['#10b981',70,.10,[-45,18,-70]],['#0891b2',85,.11,[50,-10,-80]],['#2563eb',60,.07,[10,35,-90]],['#14b8a6',75,.08,[-20,-35,-75]],['#0891b2',55,.05,[60,30,40]],['#10b981',60,.05,[-60,-20,50]]]
  .forEach(([c,s,o,p])=>nebula.add(sprite(new THREE.Color(c),s,o,new THREE.Vector3(...p))));

/* ---------- AI core ---------- */
const NOISE=`vec3 m289(vec3 x){return x-floor(x*(1./289.))*289.;}vec4 m289(vec4 x){return x-floor(x*(1./289.))*289.;}vec4 perm(vec4 x){return m289(((x*34.)+1.)*x);}
vec4 tis(vec4 r){return 1.79284291400159-.85373472095314*r;}
float snoise(vec3 v){const vec2 C=vec2(1./6.,1./3.);const vec4 D=vec4(0.,.5,1.,2.);vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;i=m289(i);vec4 p=perm(perm(perm(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
float n_=.142857142857;vec3 ns=n_*D.wyz-D.xzx;vec4 j=p-49.*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.*x_);vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.-abs(x)-abs(y);
vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);vec4 s0=floor(b0)*2.+1.;vec4 s1=floor(b1)*2.+1.;vec4 sh=-step(h,vec4(0.));vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);vec4 norm=tis(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);m=m*m;return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));}`;
const core=new THREE.Group();scene.add(core);
const orbMat=new THREE.ShaderMaterial({uniforms:U,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
  vertexShader:`varying vec3 vP;varying vec3 vN;varying vec3 vV;void main(){vP=position;vN=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(position,1.);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}`,
  fragmentShader:NOISE+`uniform float time;varying vec3 vP;varying vec3 vN;varying vec3 vV;
  void main(){vec3 p=vP*1.6;float t=time*.18;
   float n=snoise(p+vec3(t,t*.7,-t))*.55+snoise(p*2.3-vec3(t*1.4))*.3+snoise(p*5.1+vec3(0.,t*2.,0.))*.15;
   float veins=1.-abs(snoise(p*2.6+vec3(t*.6,-t,t*.4)));veins=pow(veins,7.);
   float fr=pow(1.-max(dot(vN,vV),0.),2.2);float pulse=.85+.15*sin(time*1.6);
   vec3 c1=vec3(.024,.57,.70),c2=vec3(.063,.73,.506),c3=vec3(.145,.388,.92),acc=vec3(.37,.92,.83);
   vec3 col=mix(c3,c1,smoothstep(-.6,.2,n));col=mix(col,c2,smoothstep(.1,.7,n));
   col=col*(.35+.5*smoothstep(-.3,.8,n))+acc*veins*1.4+acc*fr*1.1;
   gl_FragColor=vec4(col*pulse,1.);}`});
core.add(new THREE.Mesh(new THREE.SphereGeometry(1,96,96),orbMat));
const heart=sprite(new THREE.Color('#d9fff6'),1.6,.9);core.add(heart);
const halo1=sprite(new THREE.Color('#14b8a6'),6.5,.38);const halo2=sprite(new THREE.Color('#0891b2'),13,.18);const halo3=sprite(new THREE.Color('#10b981'),22,.07);scene.add(halo1,halo2,halo3);

// neural shell
const shell=new THREE.Group();core.add(shell);
{const N=mobile?160:240,pts=[];for(let i=0;i<N;i++){const y=1-2*(i+.5)/N,r=Math.sqrt(1-y*y),th=i*2.399963;const R=1.42+(hash('n'+i)-.5)*.22;pts.push(new THREE.Vector3(Math.cos(th)*r,y,Math.sin(th)*r).multiplyScalar(R))}
 const seg=[],ph=[],t=[];pts.forEach((a,i)=>{pts.map((b,j)=>[j,a.distanceTo(b)]).filter(([j])=>j>i).sort((x,y)=>x[1]-y[1]).slice(0,2).forEach(([j])=>{const p=hash('e'+i+'-'+j);seg.push(a.x,a.y,a.z,pts[j].x,pts[j].y,pts[j].z);ph.push(p,p);t.push(0,1)})});
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(seg,3));g.setAttribute('ph',new THREE.Float32BufferAttribute(ph,1));g.setAttribute('tt',new THREE.Float32BufferAttribute(t,1));
 shell.add(new THREE.LineSegments(g,new THREE.ShaderMaterial({uniforms:U,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
  vertexShader:`attribute float ph;attribute float tt;varying float vp;varying float vt;void main(){vp=ph;vt=tt;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:`uniform float time;varying float vp;varying float vt;void main(){float s=fract(time*.35+vp*5.);float spark=exp(-pow((vt-s)*9.,2.))*step(.55,fract(vp*13.));
   float a=.10+.05*sin(time*1.3+vp*30.)+spark*.9;gl_FragColor=vec4(mix(vec3(.08,.72,.65),vec3(.6,1.,.93),spark)*a,1.);}`})));
 const pg=new THREE.BufferGeometry().setFromPoints(pts),pp=new Float32Array(N).map((_,i)=>hash('p'+i));pg.setAttribute('ph',new THREE.BufferAttribute(pp,1));
 shell.add(new THREE.Points(pg,new THREE.ShaderMaterial({uniforms:U,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
  vertexShader:`attribute float ph;varying float a;uniform float time;uniform float pr;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;a=.45+.55*pow(.5+.5*sin(time*1.7+ph*40.),4.);gl_PointSize=pr*a*26./-mv.z;}`,
  fragmentShader:`varying float a;void main(){float d=length(gl_PointCoord-.5)*2.;float g=exp(-d*d*6.);gl_FragColor=vec4(vec3(.45,.95,.85)*g*a,1.);}`})));}

/* ---------- trades ---------- */
const dotMat=new THREE.ShaderMaterial({uniforms:U,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
  vertexShader:`attribute float sz;attribute float al;attribute vec3 col;varying float a;varying vec3 vc;uniform float pr;
  void main(){vec4 mv=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;a=al;vc=col;gl_PointSize=sz*pr*60./-mv.z;}`,
  fragmentShader:`varying float a;varying vec3 vc;void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;
   float core=smoothstep(.2,.0,d);float glow=exp(-d*d*7.)*.75+exp(-d*d*2.2)*.18;
   gl_FragColor=vec4((vc*glow+mix(vc,vec3(1.),.55)*core)*a,1.);}`});
function pointsBuf(n){const g=new THREE.BufferGeometry();
  const P=new THREE.BufferAttribute(new Float32Array(n*3),3),S=new THREE.BufferAttribute(new Float32Array(n),1),A=new THREE.BufferAttribute(new Float32Array(n),1),Co=new THREE.BufferAttribute(new Float32Array(n*3),3);
  [P,S,A,Co].forEach(b=>b.setUsage(THREE.DynamicDrawUsage));g.setAttribute('position',P);g.setAttribute('sz',S);g.setAttribute('al',A);g.setAttribute('col',Co);g.setDrawRange(0,0);
  const o=new THREE.Points(g,dotMat);o.frustumCulled=false;scene.add(o);return{g,P,S,A,Co}}
const dots=pointsBuf(MAX),trails=pointsBuf(MAX*TRAIL);
const trades=new Map();let list=[];
const ring={};
function orbitFor(strategy){if(ring[strategy])return ring[strategy];const h1=hash(strategy),h2=hash(strategy+'#'),h3=hash(strategy+'@');
  const R=2.5+h1*4.2,inc=(h2-.5)*1.25,node=h3*Math.PI*2;
  const n=new THREE.Vector3(0,1,0).applyAxisAngle(new THREE.Vector3(1,0,0),inc).applyAxisAngle(new THREE.Vector3(0,1,0),node);
  const u=new THREE.Vector3(1,0,0).applyAxisAngle(new THREE.Vector3(0,1,0),node);const v=new THREE.Vector3().crossVectors(n,u).normalize();
  return ring[strategy]={R,u,v}}
function sync(positions){const now=performance.now()/1e3,ids=new Set();
  positions.slice(0,MAX).forEach(p=>{const id=p.__k;ids.add(id);let t=trades.get(id);const v=+p.pnl||0;
    if(!t){const o=orbitFor(p.strategy||'?'),h=hash(id),h2=hash(id+'~');
      const R=o.R+(h-.5)*.55,tilt=(h2-.5)*.18;
      const u=o.u.clone(),vv=o.v.clone().applyAxisAngle(u,tilt);
      t={id,R,u,v:vv,ph:h*Math.PI*2,w:.55/Math.pow(R,1.5)*(.85+h2*.3),born:first?now-5-h*2:now,dead:0,col:(v>0?C.pos:v<0?C.neg:C.zero).clone(),size:1};trades.set(id,t)}
    t.p=p;t.pnl=v;t.open=p.status==='open';t.target=v>0?C.pos:v<0?C.neg:C.zero;t.dead=0;
    t.size=(p.mode==='shadow'?.75:1)*(.85+Math.min(1.1,Math.log10(1+Math.abs(v))*.42))});
  trades.forEach(t=>{if(!ids.has(t.id)&&!t.dead)t.dead=now});
  first=false;list=[...trades.values()];
  const won=positions.filter(p=>+p.pnl>0).length,lost=positions.filter(p=>+p.pnl<0).length;
  const r=$('#readout');r.innerHTML=positions.length?`${positions.length} trades · <span class="pos">${won} won</span> · <span class="neg">${lost} lost</span>`:'Waiting for trades';r.classList.add('on')}
let first=true;
const tmp=new THREE.Vector3();
function posAt(t,ph,R,out){return out.copy(t.u).multiplyScalar(Math.cos(ph)*R).addScaledVector(t.v,Math.sin(ph)*R)}
function updateTrades(now,dt){let n=0,m=0;const k=1-Math.exp(-dt*2.5);
  for(const t of list){let a=Math.min(1,(now-t.born)/1.8);a=1-Math.pow(1-a,3);let fade=1;
    if(t.dead){fade=1-(now-t.dead)/1.5;if(fade<=0){trades.delete(t.id);continue}}
    t.col.lerp(t.target,k);const R=t.R*(1+(1-a)*2.2),ph=t.ph+now*t.w-(1-a)*1.2;
    const pulse=t.open?.75+.35*Math.sin(now*4+t.ph*3):1,al=a*fade*pulse,sz=t.size*(.4+.6*a)*(t.open?1+.15*Math.sin(now*4+t.ph*3):1);
    posAt(t,ph,R,tmp);t.x=tmp.x;t.y=tmp.y;t.z=tmp.z;t.vis=al>.05;
    dots.P.setXYZ(n,tmp.x,tmp.y,tmp.z);dots.S.setX(n,sz*(t===hover?1.8:1));dots.A.setX(n,Math.min(1.4,al*(t===hover?1.4:1)));dots.Co.setXYZ(n,t.col.r,t.col.g,t.col.b);n++;
    for(let i=1;i<=TRAIL;i++){const f=1-i/(TRAIL+1);posAt(t,ph-i*.022*Math.sign(t.w),R,tmp);
      trails.P.setXYZ(m,tmp.x,tmp.y,tmp.z);trails.S.setX(m,sz*(.25+.45*f));trails.A.setX(m,al*f*f*.45);trails.Co.setXYZ(m,t.col.r,t.col.g,t.col.b);m++}}
  if(list.length!==trades.size)list=[...trades.values()];
  for(const b of[[dots,n],[trails,m]]){const[o,c]=b;o.g.setDrawRange(0,c);[o.P,o.S,o.A,o.Co].forEach(x=>{x.needsUpdate=true})}}

/* ---------- hover / tap ---------- */
const tip=$('#tip');let hover=null,mouse=null,downAt=null;
function pick(x,y){let best=null,bd=mobile?26:18;const v=new THREE.Vector3();
  for(const t of list){if(!t.vis||t.dead)continue;v.set(t.x,t.y,t.z).project(camera);if(v.z>1)continue;
    const sx=(v.x+1)/2*innerWidth,sy=(1-v.y)/2*innerHeight,d=Math.hypot(sx-x,sy-y);if(d<bd){bd=d;best=t}}return best}
function showTip(){if(!hover||hover.dead){tip.classList.remove('on');return}
  const v=new THREE.Vector3(hover.x,hover.y,hover.z).project(camera);const x=(v.x+1)/2*innerWidth,y=(1-v.y)/2*innerHeight,p=hover.p;
  tip.style.left=Math.max(70,Math.min(innerWidth-70,x))+'px';tip.style.top=y+'px';
  const html=`<b>${esc(assetName(p.asset))}${p.status==='open'?' ·':''}</b><span>${esc(p.strategy||'')}</span><i class="${hover.pnl>0?'pos':hover.pnl<0?'neg':''}">${money(hover.pnl)}</i>`;
  if(tip._h!==html){tip.innerHTML=html;tip._h=html}tip.classList.add('on')}
canvas.addEventListener('pointermove',e=>{if(e.pointerType==='mouse'){mouse=[e.clientX,e.clientY]}});
canvas.addEventListener('pointerleave',()=>{mouse=null;if(!mobile)hover=null});
canvas.addEventListener('pointerdown',e=>{downAt=[e.clientX,e.clientY]});
canvas.addEventListener('pointerup',e=>{if(e.pointerType!=='mouse'&&downAt&&Math.hypot(e.clientX-downAt[0],e.clientY-downAt[1])<8){hover=pick(e.clientX,e.clientY)}downAt=null});

/* ---------- data ---------- */
let lastOk=0;
async function poll(){try{const b='?t='+Date.now(),idx=await(await fetch('data/positions/index.json'+b,{cache:'no-store'})).json(),all=[];
  await Promise.all((idx.files||[]).map(async f=>{try{const d=await(await fetch('data/positions/'+f+b,{cache:'no-store'})).json();
    (d.positions||[]).forEach(p=>{p.__k=f+':'+(p.id??(p.opened_at+p.asset+p.strategy));all.push(p)})}catch(e){}}));
  all.sort((a,b)=>String(b.opened_at||'').localeCompare(String(a.opened_at||'')));
  sync(all);lastOk=Date.now()}catch(e){console.warn(e)}}
setInterval(()=>{const s=lastOk?Math.round((Date.now()-lastOk)/1e3):null;$('#ago').textContent=s==null?'Connecting':s<10?'Live':`Live · ${s}s`;$('#live').classList.toggle('stale',s!=null&&s>30)},1000);

/* ---------- loop ---------- */
const portrait=()=>innerWidth/innerHeight<.8;
function frame(){camera.position.set(0,3.2,portrait()?21:14.5);controls.target.set(0,portrait()?-.3:-.2,0);controls.update()}
resize();frame();addEventListener('resize',()=>{resize()});
const clock=new THREE.Clock();let prev=0;
renderer.setAnimationLoop(()=>{const now=clock.getElapsedTime(),dt=Math.min(.05,now-prev);prev=now;U.time.value=now;
  core.rotation.y=now*.08;shell.rotation.y=-now*.05;shell.rotation.x=Math.sin(now*.1)*.2;
  const br=1+.06*Math.sin(now*1.6);halo1.scale.setScalar(6.5*br);heart.material.opacity=.75+.2*Math.sin(now*1.6);
  stars.rotation.y=now*.004;nebula.rotation.y=now*.006;
  updateTrades(now,dt);
  if(mouse&&!downAt)hover=pick(mouse[0],mouse[1]);showTip();
  controls.update();composer.render()});
poll();setInterval(poll,POLL);
