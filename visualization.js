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
Object.assign(controls,{enableDamping:true,dampingFactor:.06,enablePan:false,autoRotate:true,autoRotateSpeed:.35,minDistance:4,maxDistance:45,rotateSpeed:.6,zoomSpeed:.8});

const composer=new EffectComposer(renderer);
composer.addPass(new RenderPass(scene,camera));
const bloom=new UnrealBloomPass(new THREE.Vector2(256,256),.65,.45,.24);
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
[['#10b981',70,.05,[-45,18,-70]],['#0891b2',85,.055,[50,-10,-80]],['#2563eb',60,.035,[10,35,-90]],['#14b8a6',75,.025,[-20,-35,-75]],['#0891b2',55,.02,[60,30,40]],['#10b981',60,.02,[-60,-20,50]]]
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
   vec3 col=mix(c3,c1,smoothstep(-.55,-.05,n));col=mix(col,c2,smoothstep(.0,.5,n));
   col=col*(.06+.34*smoothstep(-.6,.7,n))+mix(c2,acc,.5)*veins*.45+mix(c1,c2,.5+.5*sin(time*.3))*fr*.55;
   col=pow(col,vec3(1.9))*1.25;gl_FragColor=vec4(col*pulse,1.);}`});
core.add(new THREE.Mesh(new THREE.SphereGeometry(1,96,96),orbMat));
const heart=sprite(new THREE.Color('#bffcf0'),1.,.22);heart.visible=false;core.add(heart);
const halo1=sprite(new THREE.Color('#14b8a6'),5,.13);const halo2=sprite(new THREE.Color('#0891b2'),10,.08);const halo3=sprite(new THREE.Color('#2563eb'),18,.03);scene.add(halo1,halo2,halo3);

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
  void main(){vec4 mv=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;a=al;vc=col;gl_PointSize=sz*pr*110./-mv.z;}`,
  fragmentShader:`varying float a;varying vec3 vc;void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;
   float core=smoothstep(.2,.0,d);float glow=exp(-d*d*7.)*.75+exp(-d*d*2.2)*.18;
   gl_FragColor=vec4((vc*glow+mix(vc,vec3(1.),.55)*core)*a,1.);}`});
function pointsBuf(n){const g=new THREE.BufferGeometry();
  const P=new THREE.BufferAttribute(new Float32Array(n*3),3),S=new THREE.BufferAttribute(new Float32Array(n),1),A=new THREE.BufferAttribute(new Float32Array(n),1),Co=new THREE.BufferAttribute(new Float32Array(n*3),3);
  [P,S,A,Co].forEach(b=>b.setUsage(THREE.DynamicDrawUsage));g.setAttribute('position',P);g.setAttribute('sz',S);g.setAttribute('al',A);g.setAttribute('col',Co);g.setDrawRange(0,0);
  const o=new THREE.Points(g,dotMat);o.frustumCulled=false;o.renderOrder=4;scene.add(o);return{g,P,S,A,Co}}
const dots=pointsBuf(MAX),trails=pointsBuf(MAX*TRAIL);
const trades=new Map();let list=[];
const ring={};
function orbitFor(strategy){if(ring[strategy])return ring[strategy];const h1=hash(strategy),h2=hash(strategy+'#'),h3=hash(strategy+'@');
  const R=2.5+h1*4.2,inc=(h2-.5)*1.25,node=h3*Math.PI*2;
  const n=new THREE.Vector3(0,1,0).applyAxisAngle(new THREE.Vector3(1,0,0),inc).applyAxisAngle(new THREE.Vector3(0,1,0),node);
  const u=new THREE.Vector3(1,0,0).applyAxisAngle(new THREE.Vector3(0,1,0),node);const v=new THREE.Vector3().crossVectors(n,u).normalize();
  return ring[strategy]={R,u,v}}
function sync(positions){const now=clock.getElapsedTime(),ids=new Set();let fresh=null;
  positions.slice(0,MAX).forEach(p=>{const id=p.__k;ids.add(id);let t=trades.get(id);const v=+p.pnl||0;
    if(!t){const o=orbitFor(p.strategy||'?'),h=hash(id),h2=hash(id+'~');
      const R=o.R+(h-.5)*.55,tilt=(h2-.5)*.18;
      const u=o.u.clone(),vv=o.v.clone().applyAxisAngle(u,tilt);
      t={id,R,u,v:vv,ph:h*Math.PI*2,w:.55/Math.pow(R,1.5)*(.85+h2*.3),born:first?now-5-h*2:now,dead:0,col:(v>0?C.pos:v<0?C.neg:C.zero).clone(),size:1};trades.set(id,t);if(!first&&!fresh)fresh=t}
    t.p=p;t.pnl=v;t.open=p.status==='open';t.target=v>0?C.pos:v<0?C.neg:C.zero;t.dead=0;
    t.size=(p.mode==='shadow'?.75:1)*(.85+Math.min(1.1,Math.log10(1+Math.abs(v))*.42))});
  trades.forEach(t=>{if(!ids.has(t.id)&&!t.dead)t.dead=now});
  first=false;list=[...trades.values()];if(fresh)gaze.fresh=fresh;
  const tot=positions.reduce((a,p)=>a+(+p.pnl||0),0),won=positions.filter(p=>+p.pnl>0).length,lost=positions.filter(p=>+p.pnl<0).length;
  const r=$('#readout');r.innerHTML=positions.length?`${positions.length} trades · <span class="pos">${won} won</span> · <span class="neg">${lost} lost</span> · <span class="${tot>0?'pos':tot<0?'neg':''}">${(tot<0?'\u2212':tot>0?'+':'')+Math.abs(tot).toLocaleString('en-US',{style:'currency',currency:'USD'})}</span>`:'Waiting for trades';r.classList.add('on')}
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
      trails.P.setXYZ(m,tmp.x,tmp.y,tmp.z);trails.S.setX(m,sz*(.25+.45*f));trails.A.setX(m,al*f*f*.3);trails.Co.setXYZ(m,t.col.r,t.col.g,t.col.b);m++}}
  if(list.length!==trades.size)list=[...trades.values()];
  for(const b of[[dots,n],[trails,m]]){const[o,c]=b;o.g.setDrawRange(0,c);[o.P,o.S,o.A,o.Co].forEach(x=>{x.needsUpdate=true})}}


/* ---------- AI eye ---------- */
const eye=new THREE.Group();scene.add(eye);const EYE_S=2;eye.scale.setScalar(EYE_S);
const EU={time:U.time,pr:U.pr,look:{value:new THREE.Vector2()},blink:{value:0},dil:{value:1},tint:{value:new THREE.Color('#34d399')}};
const LID=`float shp(float x){return pow(max(1.-x*x,0.),.8);}float lidU(float x){return .35*shp(x)*(1.+.12*x);}float lidL(float x){return .26*shp(x);}`;
const shp=x=>Math.pow(Math.max(1-x*x,0),.8),lidU=x=>.35*shp(x)*(1+.12*x),lidL=x=>.26*shp(x),EW=.95;
const eyeMat=new THREE.ShaderMaterial({uniforms:EU,transparent:true,depthWrite:true,
  vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:NOISE+LID+`uniform float time;uniform vec2 look;uniform float blink;uniform float dil;uniform vec3 tint;varying vec2 vUv;
  void main(){vec2 p=(vUv-.5)*vec2(2.3,1.5);float W=.95,xn=clamp(p.x/W,-1.,1.),op=1.-blink;
   float up=lidU(xn)*op+.002,lo=lidL(xn)*op+.002;float inU=up-p.y,inL=p.y+lo,ins=min(inU,inL);
   float mask=smoothstep(0.,.03,ins)*step(abs(p.x),W);if(mask<.004)discard;
   vec2 c=look*vec2(.26,.05);vec2 q=p-c;q.x*=1.+.3*abs(look.x);float r=length(q);vec2 dir=q/max(r,1e-4);
   float R=.5,pr=.105*dil;
   vec3 scl=vec3(.03,.26,.8)*(.3+.7*pow(1.-abs(xn),.45))*(.55+.6*exp(-max(r-R,0.)*5.));
   float t=clamp((r-pr)/(R-pr),0.,1.);
   float f1=snoise(vec3(dir*34.,r*3.+time*.05)),f2=snoise(vec3(dir*12.,r*7.-time*.07)),f3=snoise(vec3(dir*75.,r*2.));
   float fib=pow(clamp(.5+.5*(f1*.5+f2*.3+f3*.3),0.,1.),1.5);
   vec3 deep=vec3(.0,.06,.4),mid=vec3(.0,.32,1.),hi=vec3(.15,.75,1.);
   vec3 iris=mix(mid,deep,smoothstep(.5,1.,t));iris=mix(iris,tint,.12);
   iris=iris*(.2+1.1*fib)+hi*pow(fib,4.)*.45*(1.-t*.6);
   float cr=pr+.08+.025*snoise(vec3(dir*5.,1.7));iris+=hi*.3*exp(-pow((r-cr)*28.,2.));
   iris*=1.-.55*smoothstep(.78,1.,t);
   float irisM=1.-smoothstep(R-.045,R+.015,r),pupM=1.-smoothstep(pr-.012,pr+.01,r);
   vec3 col=mix(scl,iris*1.7,irisM);col=mix(col,vec3(0.,.012,.035),pupM);
   vec2 h1=q-vec2(-.07,.055);col+=vec3(.9,.97,1.)*exp(-dot(h1,h1)*2600.)*1.5;
   vec2 h2=(q-vec2(.13,.09))*vec2(1.,2.6);col+=vec3(.6,.85,1.)*exp(-dot(h2,h2)*260.)*.18;
   col*=mix(.12,1.,smoothstep(0.,.12,inU));col*=mix(.4,1.,smoothstep(0.,.035,inL));
   col+=vec3(.45,.85,1.)*exp(-pow(inL*55.,2.))*.3*shp(xn);
   col*=.3+.7*smoothstep(1.,.7,abs(xn));
   vec2 gp=fract(p*165.)-.5;col*=.8+.3*(1.-smoothstep(.2,.5,length(gp)));
   gl_FragColor=vec4(col*.6,mask);}`});
const eyePlane=new THREE.Mesh(new THREE.PlaneGeometry(2.3,1.5),eyeMat);eyePlane.renderOrder=2;eye.add(eyePlane);

// THE FLOW: dense pixel strands streaming out of the eye, side contour ripples, long sweeping strands
{const D=mobile?.5:1,pos=[],col=[],aux=[],rnd=Math.random;
 const blue=[[.01,.26,1],[.02,.4,1],[.15,.7,1],[.005,.16,.9],[.01,.33,1]],red=[[1,.22,.18],[1,.42,.25],[1,.3,.45]];
 const pick=a=>a[(rnd()*a.length)|0];
 const add=(x,y,z,c,b,t,ph,k,sz)=>{pos.push(x,y,z);col.push(c[0]*b,c[1]*b,c[2]*b);aux.push(t,ph,k,sz)};
 for(const side of[1,-1]){const N=Math.round((side>0?95:85)*(mobile?.7:1));
  for(let i=0;i<N;i++){const u=-1+2*(i+.5)/N+(rnd()-.5)*.6/N,x0=u*EW*1.03,y0=side>0?lidU(u)+.02:-lidL(u)-.02;
   const dx=u*(side>0?.5:.8),L=(side>0?1.8:2.1)*(.75+rnd()*.5)*(1-.3*u*u),step=.018/Math.sqrt(D),ph=rnd();
   for(let t=0;t<L;t+=step){const s=t/L,x=x0+dx*t+dx*t*t*.14,y=y0+side*t,z=-.1*t*t;
    let c=pick(blue),b=.85*Math.pow(1-s,1.3)*(.4+.6*rnd())*(.5+.5*Math.exp(-t*1.5));
    const r=rnd();if(side>0&&t>.1&&t<.7&&r<.32*Math.exp(-Math.pow((t-.35)/.2,2))+.04*(t<.7))c=pick(red),b*=2.4;
    else if(side<0&&t<.8&&r<.07)c=pick(red),b*=2.2;else if(r>.985)c=[.9,.97,1],b*=1.6;
    add(x,y,z,c,b,t,ph,0,.8+rnd()*.7)}}}
 const NR=Math.round(26*D);
 for(let k=0;k<NR;k++){const rx=1.2+k*.075,ry=rx*.66,ph=rnd(),stp=.02/Math.sqrt(D)/rx;
  for(let th=0;th<Math.PI*2;th+=stp){const cs=Math.cos(th),sn=Math.sin(th),side=Math.pow(Math.abs(cs),2.5);if(side<.12)continue;
   const w=1+.03*Math.sin(th*9+k*.7);const x=cs*rx*w,y=sn*ry*w;
   add(x,y,-.06*rx*rx,pick(blue),.3*side*(.5*(1-k/NR)+.1)*(.4+.6*rnd())*(cs<0?1:.75),rx-1.2,ph,1,.8+rnd()*.5)}}
 const NS=Math.round(12*D);
 for(let i=0;i<NS;i++){const sd=i%3===0?-1:1,ph=rnd(),L=3+rnd()*2.5,a0=(sd>0?1.25:1.9)+(rnd()-.5)*.5,bend=(.25+rnd()*.5)*(rnd()<.5?1:-1);
  let x=sd*(EW*1.05+rnd()*.3),y=(rnd()-.3)*.25,a=sd>0?a0:Math.PI-a0;const c=rnd()<.5?[.5,.9,1]:[.35,.6,1];
  for(let t=0;t<L;t+=.012/Math.sqrt(D)){a+=bend*.012*sd/Math.sqrt(D)*(sd>0?1:-1);x+=Math.cos(a)*.012/Math.sqrt(D);y+=Math.sin(a)*.012/Math.sqrt(D);
   add(x,y,-.05*t*t,c,.22*Math.pow(1-t/L,1.2)*(.6+.4*rnd()),t,ph,2,1+rnd()*.6)}}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('col',new THREE.Float32BufferAttribute(col,3));g.setAttribute('aux',new THREE.Float32BufferAttribute(aux,4));
 const m=new THREE.Points(g,new THREE.ShaderMaterial({uniforms:EU,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
  vertexShader:`attribute vec3 col;attribute vec4 aux;uniform float time;uniform float pr;varying vec3 vc;
  void main(){vec3 P=position;float t=aux.x,ph=aux.y,k=aux.z,b=1.;
   if(k<.5){P.x+=sin(t*4.5+position.x*2.2-time*1.1)*.045*t+sin(t*11.-time*2.+ph*6.28)*.008*t;
     float pk=pow(.5+.5*sin(t*7.-time*2.6+ph*6.283),14.);b=.7+2.*pk;}
   else if(k<1.5){P.y+=sin(position.x*6.-time*.9+t*3.)*.025;b=.7+.6*pow(.5+.5*sin(atan(position.y,position.x)*6.+time*1.2-t*8.),6.);}
   else{P.x+=sin(t*2.+time*.8+ph*9.)*.04*t;float pk=pow(.5+.5*sin(t*5.-time*3.2+ph*6.283),10.);b=.55+2.5*pk;}
   vec4 mv=modelViewMatrix*vec4(P,1.);gl_Position=projectionMatrix*mv;vc=col*b;gl_PointSize=max(1.,pr*aux.w*30./-mv.z);}`,
  fragmentShader:`varying vec3 vc;void main(){float d=length(gl_PointCoord-.5)*2.;gl_FragColor=vec4(vc*(1.-d*d*.7),1.);}`}));
 m.renderOrder=3;m.frustumCulled=false;eye.add(m);}

// THE PIXELS: glittering dust along the lids
{const N=mobile?900:2000,s=new Float32Array(N),sd=new Float32Array(N),off=new Float32Array(N),ph=new Float32Array(N),col=new Float32Array(N*3);
 const reds=['#ff3b2f','#ff6a2a','#ff3d6e'].map(c=>new THREE.Color(c)),cool=['#38bdf8','#3b82f6','#e0f2fe','#2563eb','#7dd3fc','#22d3ee'].map(c=>new THREE.Color(c));
 for(let i=0;i<N;i++){const side=Math.random()<.5?1:-1;sd[i]=side;s[i]=Math.random();off[i]=Math.pow(Math.random(),1.8)*(side>0?.38:.55);ph[i]=Math.random();
   if(side>0&&Math.random()<.45)off[i]=.07+Math.random()*.16;const w=side>0?(off[i]>.06&&off[i]<.25&&Math.random()<.75):Math.random()<.22;const c=w?reds[(Math.random()*3)|0]:cool[(Math.random()*6)|0];col.set([c.r,c.g,c.b],i*3)}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(N*3),3));
 [['s',s],['side',sd],['off',off],['ph',ph]].forEach(([n,a])=>g.setAttribute(n,new THREE.BufferAttribute(a,1)));g.setAttribute('col',new THREE.BufferAttribute(col,3));
 const m=new THREE.Points(g,new THREE.ShaderMaterial({uniforms:EU,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
  vertexShader:LID+`attribute float s;attribute float side;attribute float off;attribute float ph;attribute vec3 col;uniform float time;uniform float blink;uniform float pr;varying float a;varying vec3 vc;
  void main(){float u=fract(s+time*.01*(ph-.5))*2.4-1.2;float x=clamp(u,-1.,1.);float sh=shp(x);float ext=abs(u)>1.?(abs(u)-1.)*3.:0.;
   float y=side*((side>0.?lidU(x):lidL(x))*(1.-blink)+off*(.3+.7*sh)+.012)+sin(time*1.3+ph*50.)*.01;
   vec4 mv=modelViewMatrix*vec4(u*(1.03+off*.5),y+(fract(ph*31.)-.5)*ext*.4,.02,1.);gl_Position=projectionMatrix*mv;
   a=(.15+.85*pow(.5+.5*sin(time*(2.+ph*5.)+ph*60.),4.))*(1.-smoothstep(1.,1.2,abs(u)))*(1.-off*1.2);vc=col;gl_PointSize=max(1.,pr*(.9+fract(ph*13.)*1.6)*30./-mv.z);}`,
  fragmentShader:`varying float a;varying vec3 vc;void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;gl_FragColor=vec4(vc*a*(1.-d*d*.6)*.6,1.);}`}));
 m.renderOrder=3;m.frustumCulled=false;eye.add(m);}

// deep blue atmosphere
const atmo=new THREE.Group();scene.add(atmo);
[['#0b63d6',9,.16,[0,0,-1]],['#0a84d6',4.5,.12,[0,.1,-.5]],['#0a4fb0',24,.3,[0,0,-3]],['#0a8ae0',14,.1,[-4,-3,-2]],['#0b5cd5',12,.08,[4,2.5,-2]],['#08367a',46,.34,[0,0,-6]],['#0a6fd6',20,.16,[-6,-4,-4]]]
  .forEach(([c,sc,o,p])=>atmo.add(sprite(new THREE.Color(c),sc,o,new THREE.Vector3(...p))));
core.visible=false;halo1.visible=halo2.visible=halo3.visible=false;


// gaze: follow one orbiting trade at a time
const gaze={t:null,until:0,fresh:null,cur:new THREE.Vector2(),tgt:new THREE.Vector2(),blinkAt:-1,nextBlink:2.5,jit:new THREE.Vector2(),jitAt:0};
const vv=new THREE.Vector3(),vc0=new THREE.Vector3();
function chooseTarget(){const vis=list.filter(t=>t.vis&&!t.dead&&t!==gaze.t);if(!vis.length)return gaze.t&&!gaze.t.dead?gaze.t:null;
  if(Math.random()<.55){const r=vis.slice().sort((a,b)=>String(b.p?.opened_at||'').localeCompare(String(a.p?.opened_at||''))).slice(0,6);return r[(Math.random()*r.length)|0]}
  return vis[(Math.random()*vis.length)|0]}
function updateEye(now,dt){
  let t=null;
  if(hover&&!hover.dead)t=hover;
  else{if(gaze.fresh&&!gaze.fresh.dead){gaze.t=gaze.fresh;gaze.until=now+5;gaze.fresh=null;if(gaze.blinkAt<0)gaze.blinkAt=now}
    if(!gaze.t||gaze.t.dead||(!gaze.t.vis&&now-gaze.t.born>2)||now>gaze.until){gaze.t=chooseTarget();gaze.until=now+2.6+Math.random()*2.6;if(Math.random()<.3&&gaze.blinkAt<0)gaze.blinkAt=now}
    t=gaze.t}
  if(now>gaze.jitAt){gaze.jit.set((Math.random()-.5)*.06,(Math.random()-.5)*.06);gaze.jitAt=now+.4+Math.random()*.9}
  if(t&&t.x!==undefined){vv.set(t.x,t.y,t.z).applyMatrix4(camera.matrixWorldInverse);vc0.set(0,0,0).applyMatrix4(camera.matrixWorldInverse);vv.sub(vc0);
    gaze.tgt.set(THREE.MathUtils.clamp(vv.x/4.2,-1,1),THREE.MathUtils.clamp(vv.y/2.6,-1,1)).add(gaze.jit);EU.tint.value.lerp(t.col,1-Math.exp(-dt*3))}
  else gaze.tgt.set(Math.sin(now*.4)*.5,Math.sin(now*.27)*.25);
  gaze.cur.lerp(gaze.tgt,1-Math.exp(-dt*7));EU.look.value.copy(gaze.cur);
  if(gaze.blinkAt<0&&now>gaze.nextBlink)gaze.blinkAt=now;
  let b=0;if(gaze.blinkAt>=0){const ph=(now-gaze.blinkAt)/.24;if(ph>=1){gaze.blinkAt=-1;gaze.nextBlink=now+3+Math.random()*5}else b=Math.sin(Math.PI*ph)}
  EU.blink.value=Math.min(1,b*1.05);
  EU.dil.value=1+.1*Math.sin(now*.7)+.08*Math.sin(now*2.3);
  eye.quaternion.copy(camera.quaternion);eye.rotateY(gaze.cur.x*.05);eye.rotateX(-gaze.cur.y*.04);atmo.quaternion.copy(camera.quaternion)}

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
function frame(){const a=innerWidth/innerHeight;camera.fov=a<1?62:48;camera.updateProjectionMatrix();const d=a<1?Math.min(30,6.4/(Math.tan(camera.fov*Math.PI/360)*a)):15;camera.position.set(0,d*(a<1?.38:.24),d);controls.target.set(0,0,0);controls.update()}
resize();frame();addEventListener('resize',()=>{resize();frame()});
const clock=new THREE.Clock();let prev=0;
renderer.setAnimationLoop(()=>{const now=clock.getElapsedTime(),dt=Math.min(.05,now-prev);prev=now;U.time.value=now;
  core.rotation.y=now*.08;shell.rotation.y=-now*.05;shell.rotation.x=Math.sin(now*.1)*.2;
  const br=1+.06*Math.sin(now*1.6);halo1.scale.setScalar(5*br);heart.material.opacity=.18+.07*Math.sin(now*1.6);
  stars.rotation.y=now*.004;nebula.rotation.y=now*.006;
  updateTrades(now,dt);updateEye(now,dt);
  if(mouse&&!downAt)hover=pick(mouse[0],mouse[1]);showTip();
  controls.update();composer.render()});
poll();setInterval(poll,POLL);
