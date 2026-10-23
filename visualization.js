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
const bloom=new UnrealBloomPass(new THREE.Vector2(256,256),.8,.55,.16);
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
const eye=new THREE.Group();scene.add(eye);eye.scale.setScalar(1.3);
const EU={time:U.time,pr:U.pr,look:{value:new THREE.Vector2()},blink:{value:0},dil:{value:1},tint:{value:new THREE.Color('#34d399')}};
const eyeMat=new THREE.ShaderMaterial({uniforms:EU,transparent:true,depthWrite:true,
  vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:NOISE+`uniform float time;uniform vec2 look;uniform float blink;uniform float dil;uniform vec3 tint;varying vec2 vUv;
  void main(){vec2 p=(vUv-.5)*vec2(2.3,1.5);float W=.95,xn=clamp(p.x/W,-1.,1.),sh=pow(max(1.-xn*xn,0.),.85),op=1.-blink;
   float up=(.44*sh)*op+.004,lo=(.32*sh)*op+.004;float inU=up-p.y,inL=p.y+lo,ins=min(inU,inL);
   float mask=smoothstep(0.,.025,ins)*step(abs(p.x),W);
   float rim=(exp(-pow(inU*30.,2.))+exp(-pow(inL*30.,2.))*.7)*smoothstep(1.,.55,abs(xn));
   vec2 c=look*vec2(.40,.15);vec2 q=p-c;q.x*=1.+.35*abs(look.x);q.y*=1.+.2*abs(look.y);float r=length(q);vec2 dir=q/max(r,1e-4);
   float R=.34,pr=.12*dil;
   float fib=snoise(vec3(dir*7.,r*3.-time*.2))*.5+.5;fib=mix(fib,snoise(vec3(dir*19.,r*9.+time*.15))*.5+.5,.45);
   float t=smoothstep(pr,R,r);
   vec3 cIn=vec3(.3,1.,.75),cMid=vec3(0.,.72,.8),cOut=vec3(.05,.35,1.);
   vec3 iris=mix(cIn,cMid,smoothstep(0.,.4,t));iris=mix(iris,cOut,smoothstep(.4,1.,t));iris=mix(iris,tint,.22*smoothstep(.45,1.,t));
   iris*=.18+1.2*pow(fib,1.5);iris*=1.-.85*smoothstep(.8,1.,t);iris*=.8;
   iris+=cIn*exp(-pow((r-pr-.03)*45.,2.))*.35;
   float irisM=1.-smoothstep(R-.012,R+.006,r),pupM=1.-smoothstep(pr-.01,pr+.008,r);
   vec3 scl=vec3(.01,.045,.07)+vec3(.03,.16,.24)*pow(1.-abs(xn),.6)*.45;
   scl+=vec3(.05,.35,.4)*pow(max(0.,1.-length(q)/.9),3.)*.25;
   vec3 col=mix(scl,iris,irisM);col=mix(col,vec3(0.,.008,.012),pupM);
   col+=vec3(.3,.9,.85)*exp(-pow((r-pr)*90.,2.))*.2;
   vec2 hl=q-vec2(-.085,.085);col+=vec3(1.)*exp(-dot(hl,hl)*1400.)*1.4;
   col*=mix(.3,1.,smoothstep(0.,.12,inU));
   col*=.88+.12*sin(p.y*260.+time*5.);
   vec3 rc=mix(vec3(.2,.95,.8),vec3(.3,.6,1.),.5+.5*sin(time*.8+p.x*3.));
   float a=max(mask*.96,clamp(rim*.85,0.,1.));if(a<.01)discard;
   gl_FragColor=vec4(col*mask+rc*rim*1.2,a);}`});
const eyePlane=new THREE.Mesh(new THREE.PlaneGeometry(2.3,1.5),eyeMat);eyePlane.renderOrder=2;eye.add(eyePlane);

// flowing strands: contour lines around the lids + fanning fibres
{const NC=mobile?16:26,NF=mobile?70:130,SEG=mobile?48:72,pos=[],s=[],k=[],sd=[],ph=[],ty=[];
 const push=(a,b,side,kk,p,tp)=>{for(const v of[a,b]){pos.push(0,0,0);s.push(v);k.push(kk);sd.push(side);ph.push(p);ty.push(tp)}};
 for(const side of[1,-1])for(let i=0;i<NC;i++){const kk=(i+hash('k'+side+i)*.6)/NC,p=hash('c'+side+i);for(let j=0;j<SEG;j++)push(-1+2*j/SEG,-1+2*(j+1)/SEG,side,kk,p,0)}
 for(let i=0;i<NF;i++){const side=hash('fs'+i)<.45?1:-1,s0=(hash('fx'+i)*2-1)*.97,p=hash('fp'+i),L=6;for(let j=0;j<L;j++)push(j/L,(j+1)/L,side,s0,p,1)}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
 [['s',s],['k',k],['side',sd],['ph',ph],['ty',ty]].forEach(([n,a])=>g.setAttribute(n,new THREE.Float32BufferAttribute(a,1)));
 const m=new THREE.LineSegments(g,new THREE.ShaderMaterial({uniforms:EU,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
  vertexShader:`attribute float s;attribute float k;attribute float side;attribute float ph;attribute float ty;uniform float time;uniform float blink;varying float va;varying vec3 vc;
  float lid(float x,float sd){float sh=pow(max(1.-x*x,0.),.85);return sd*(sd>0.?.44:.32)*sh*(1.-blink);}
  void main(){vec3 P;float spark;
   if(ty<.5){float W=.95*(1.+k*1.5),x=s;float sh=pow(max(1.-x*x,0.),.85);
     float y=side*((side>0.?.44:.32)*(1.-blink*(1.-k)*.95)+k*(side>0.?1.05:.85))*sh;
     y+=(sin(x*5.+time*1.1+ph*6.28)*.035*(.25+k*2.)+sin(x*13.-time*1.9+ph*20.)*.01)*sh;
     P=vec3(x*W,y,-k*.35*sh);float pp=fract(time*.22+ph);spark=exp(-pow((s*.5+.5-pp)*12.,2.));
     va=(.05+.16*pow(1.-k,1.6))*pow(sh,.5)+spark*.55*(1.-k)*sh;vc=mix(vec3(.1,.85,.75),vec3(.2,.5,1.),k);}
   else{float x=k,L=.2+ph*.45;vec2 o=vec2(x*.95,lid(x,side));vec2 n=normalize(vec2(x*.55,side));
     float t=s*L;vec2 q=o+n*t;q.x+=sin(t*3.+time*1.3+ph*30.)*.06*t+side*.0;q.y+=side*t*t*.15;
     P=vec3(q,-.15*t);float pp=fract(time*.45+ph*7.);spark=exp(-pow((s-pp)*7.,2.));
     va=(.12*(1.-s)+spark*.35)*(1.-s*.6)*(.6+.4*sin(time*2.+ph*40.));vc=mix(vec3(.25,.95,.85),vec3(.35,.6,1.),ph);}
   gl_Position=projectionMatrix*modelViewMatrix*vec4(P,1.);}`,
  fragmentShader:`varying float va;varying vec3 vc;void main(){gl_FragColor=vec4(vc*va,1.);}`}));
 m.renderOrder=3;m.frustumCulled=false;eye.add(m);}

// sparkles along the lids (red + blue like the reference, tuned to the palette)
{const N=mobile?380:720,s=new Float32Array(N),sd=new Float32Array(N),off=new Float32Array(N),ph=new Float32Array(N),col=new Float32Array(N*3);
 const warm=new THREE.Color('#ff5a78'),cool=[new THREE.Color('#5eead4'),new THREE.Color('#60a5fa'),new THREE.Color('#a5f3fc'),new THREE.Color('#34d399')];
 for(let i=0;i<N;i++){const side=Math.random()<.55?1:-1;sd[i]=side;s[i]=Math.random();off[i]=Math.pow(Math.random(),2.2)*(side>0?.32:.45);ph[i]=Math.random();
   const w=side>0?(off[i]<.14&&Math.random()<.5):Math.random()<.18;const c=w?warm:cool[(Math.random()*4)|0];col.set([c.r,c.g,c.b],i*3)}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(N*3),3));
 [['s',s],['side',sd],['off',off],['ph',ph]].forEach(([n,a])=>g.setAttribute(n,new THREE.BufferAttribute(a,1)));g.setAttribute('col',new THREE.BufferAttribute(col,3));
 const m=new THREE.Points(g,new THREE.ShaderMaterial({uniforms:EU,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
  vertexShader:`attribute float s;attribute float side;attribute float off;attribute float ph;attribute vec3 col;uniform float time;uniform float blink;uniform float pr;varying float a;varying vec3 vc;
  void main(){float x=fract(s+time*.012*(ph-.5))*2.-1.;float sh=pow(max(1.-x*x,0.),.85);
   float y=side*((side>0.?.44:.32)*sh*(1.-blink)+off*(.35+.65*sh)+.01);y+=sin(time*1.4+ph*50.)*.012;
   vec4 mv=modelViewMatrix*vec4(x*(1.02+off*.6),y,.02,1.);gl_Position=projectionMatrix*mv;
   a=(.25+.75*pow(.5+.5*sin(time*(2.+ph*4.)+ph*60.),3.))*smoothstep(1.,.75,abs(x));vc=col;gl_PointSize=pr*(1.+fract(ph*13.)*2.2)*34./-mv.z;}`,
  fragmentShader:`varying float a;varying vec3 vc;void main(){float d=length(gl_PointCoord-.5)*2.;float g=exp(-d*d*4.);if(g<.02)discard;gl_FragColor=vec4(vc*g*a*.8,1.);}`}));
 m.renderOrder=3;m.frustumCulled=false;eye.add(m);}

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
  eye.quaternion.copy(camera.quaternion);eye.rotateY(gaze.cur.x*.14);eye.rotateX(-gaze.cur.y*.1)}

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
