uniform vec2 uRes;
uniform float uTime;
uniform float uWind;
uniform float uWindFront;
uniform float uPitch;
uniform float uFov;
uniform float uSunEl;
uniform vec4 uShip;
uniform float uSail;
uniform float uWake;
uniform float uConverge;
uniform float uGlitter;
uniform float uOct;
uniform float uHi;
uniform float uFade;
uniform float uExposure;
uniform float uCaustic;
uniform vec4 uHead;
uniform vec2 uStern;
uniform vec2 uBow;
uniform float uYaw;
uniform float uBeam;
uniform float uSunX;
uniform vec3 uTap;
uniform float uHorizon;
uniform float uScroll;
uniform float uCloud;
uniform float uSunR;

float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){
  vec2 i=floor(p),f=fract(p);
  float a=hash(i),b=hash(i+vec2(1.,0.)),c=hash(i+vec2(0.,1.)),d=hash(i+vec2(1.,1.));
  vec2 u=f*f*(3.-2.*f);
  return mix(mix(a,b,u.x),mix(c,d,u.x),u.y);
}
float ign(vec2 p){return fract(52.9829189*fract(dot(p,vec2(.06711056,.00583715))));}
float vor(vec2 p){
  vec2 i=floor(p),f=fract(p);
  float m=1.;
  for(int y=-1;y<=1;y++){
    for(int x=-1;x<=1;x++){
      vec2 g=vec2(float(x),float(y));
      vec2 o=vec2(hash(i+g),hash(i+g+17.3));
      m=min(m,length(f-g-o));
    }
  }
  return m;
}
float inHead(vec2 uv){
  if(uHead.z<0.01) return 0.;
  vec2 pad=48./max(uRes,vec2(1.));
  vec2 a=uHead.xy-pad;
  vec2 b=uHead.xy+uHead.zw+pad;
  return step(a.x,uv.x)*step(uv.x,b.x)*step(a.y,uv.y)*step(uv.y,b.y);
}
vec3 sunDir(){
  float az=.40;
  return normalize(vec3(sin(az)*cos(uSunEl),sin(uSunEl),cos(az)*cos(uSunEl)));
}
float horizonY(){return uHorizon<0.05?.56:uHorizon;}
float persp(float t){
  return t*(6.596093+t*(1.602442+t*(-18.627061+t*(26.167319+t*(-16.165713+t*3.873476)))));
}
vec3 skyColor(vec2 uv){
  float h=horizonY();
  vec3 zen=vec3(142.,201.,240.)/255.;
  vec3 midc=vec3(191.,227.,251.)/255.;
  vec3 hor=vec3(232.,244.,252.)/255.;
  vec3 sky=mix(zen,midc,smoothstep(0.,.35,uv.y));
  sky=mix(sky,hor,smoothstep(.35,max(h,.36),uv.y));
  vec2 sun=vec2(uRes.x*(uSunX<0.05?.86:uSunX),uRes.y*1.06);
  float rad=uSunR<1.?420.*uRes.y/900.:uSunR;
  float r=length(gl_FragCoord.xy-sun)/rad;
  vec3 warm=vec3(1.,246./255.,224./255.);
  vec3 tint=mix(vec3(1.),warm,smoothstep(0.,.4,r));
  float a=mix(.90,.35,clamp(r/.4,0.,1.));
  a*=1.-smoothstep(.4,1.,r);
  sky=mix(sky,tint,clamp(a,0.,1.));
  float xMask=smoothstep(.55,.62,uv.x)*smoothstep(1.,.9,uv.x);
  float yMask=smoothstep(.08,.14,uv.y)*smoothstep(.40,.30,uv.y);
  float drift=uv.x-uCloud;
  float cirrus=smoothstep(.48,.82,noise(vec2(drift*7.5,uv.y*16.)));
  cirrus*=xMask*yMask*(1.-inHead(uv));
  sky=mix(sky,min(sky+vec3(.07,.075,.08),vec3(1.)),cirrus*.12);
  return sky;
}
vec3 ray(vec2 frag){
  vec2 ndc=frag/uRes*2.-1.;
  float th=tan(uFov*.5);
  vec3 rd=normalize(vec3(ndc.x*th*uRes.x/uRes.y,ndc.y*th,1.));
  float cp=cos(uPitch),sp=sin(uPitch);
  return vec3(rd.x,cp*rd.y+sp*rd.z,-sp*rd.y+cp*rd.z);
}
vec2 planeAt(vec2 frag){
  vec3 rd=ray(frag);
  float t=1.8/max(-rd.y,1e-4);
  return vec2(rd.x,rd.z)*t;
}

void main(){
  vec2 frag=gl_FragCoord.xy;
  vec2 uv=vec2(frag.x/uRes.x,1.-frag.y/uRes.y);
  vec3 rd=ray(frag);
  vec3 sun=sunDir();
  float h=horizonY();
  vec3 col;
  if(uv.y<=h){
    col=skyColor(uv);
  }else{
    float yN=clamp((uv.y-h)/max(1.-h,1e-3),0.,1.);
    float vScale=mix(.15,1.,pow(yN,2.2));
    float px=uRes.y/900.;
    float Hpx=(1.-h)*uRes.y;
    float yAcc=persp(yN)*Hpx;
    float oct=uOct<.5?4.:uOct;
    float warp=noise(vec2(frag.x/(150.*px)+uTime*.015,yAcc/(130.*px)))-.5;
    float warp2=noise(vec2(frag.x/(70.*px)+4.2,yAcc/(64.*px)+1.7))-.5;
    float wave=0.;
    vec2 grad=vec2(0.);
    for(int i=0;i<5;i++){
      float fi=float(i);
      float alive=fi<oct?1.:0.;
      float L=px*(fi<.5?168.:fi<1.5?97.:fi<2.5?61.:fi<3.5?37.:22.);
      float ang=fi<.5?.62:fi<1.5?-.28:fi<2.5?1.18:fi<3.5?.15:-.84;
      float amp0=fi<.5?3.8:fi<1.5?1.35:fi<2.5?.7:fi<3.5?.32:.14;
      vec2 D=vec2(cos(ang),sin(ang));
      float k=6.2831853/L;
      float freq=length(vec2(D.x,D.y/max(vScale,.12)));
      float wl=L/max(freq,.001);
      float vis=smoothstep(7.*px,16.*px,wl)*alive;
      float amp=amp0*px*vScale*vis;
      float along=D.x*(frag.x+warp*40.*px)+D.y*(yAcc+warp2*28.*px);
      float ph=k*along-uTime*(.22+.07*fi)*max(uWind,.2);
      float s=sin(ph),c=cos(ph);
      wave+=amp*s;
      float slope=amp*k*c;
      grad.x+=D.x*slope;
      grad.y+=D.y*slope/max(vScale,.12);
    }
    vec3 n=normalize(vec3(-grad.x,1.,-grad.y));
    vec3 farC=vec3(124.,198.,238.)/255.;
    vec3 midC=vec3(46.,155.,214.)/255.;
    vec3 nearC=vec3(26.,134.,196.)/255.;
    vec3 clearC=vec3(78.,176.,196.)/255.;
    col=mix(farC,midC,smoothstep(0.,.48,yN));
    col=mix(col,nearC,smoothstep(.52,1.,yN));
    float delta=dot(n,sun)-.242;
    float atten=smoothstep(.06,.4,yN);
    col*=clamp(1.+delta*.65*atten,.92,1.08);
    float crest=clamp(wave/(5.2*px),-1.,1.);
    col=mix(col,min(col+vec3(.04,.032,.02),vec3(1.)),max(crest,0.)*.18*smoothstep(.22,.65,yN));
    float caus=uCaustic<.01?1.:uCaustic;
    float grain=noise(vec2(frag.x/(34.*px)+uTime*.02,yAcc/(30.*px)));
    float grain2=noise(vec2(frag.x/(15.*px)+9.2,yAcc/(13.*px)+2.4));
    float caust=smoothstep(.42,.78,grain)*smoothstep(.38,.8,grain2);
    float see=smoothstep(.55,1.,yN)*clamp(.6-crest*.4,0.,1.);
    col=mix(col,clearC,caust*see*caus*.09);
    float down=clamp(-rd.y/.28,0.,1.);
    vec3 V=normalize(-rd);
    float ndv=clamp(dot(n,V),0.,1.);
    float fres=.02+.98*pow(1.-ndv,5.);
    vec3 refl=skyColor(uv);
    float sunU=uSunX<0.05?.86:uSunX;
    float halfW=mix(.018,.095,pow(yN,1.15));
    float gx=abs(uv.x-sunU)/max(halfW,.001);
    float path=exp(-gx*gx);
    path*=smoothstep(0.,.22,yN);
    float reflAmt=fres*mix(.03,.4,path)*mix(.4,1.,smoothstep(.05,.5,yN));
    col=mix(col,refl,reflAmt);
    float cell=mix(1.1,3.,smoothstep(0.,.7,yN))*px;
    vec2 g=frag/max(cell,1.);
    float thresh=mix(.955,.988,smoothstep(0.,.65,yN));
    float spark=smoothstep(thresh,.998,hash(floor(g)+vec2(floor(uTime*.4),1.7)));
    float blob=smoothstep(.5,.05,length(fract(g)-.5));
    col+=vec3(1.,.985,.94)*spark*blob*path*uGlitter*.75;
    float fore=smoothstep(.80,.88,uv.y);
    float period=max(uRes.x*.6,1.);
    float swell=sin((frag.x+uScroll*period*1.25)/period*6.2831853);
    col*=1.+swell*.04*fore;
    if(uWake>0.001 && uStern.y>h && uBow.y>h){
      vec2 sternFrag=vec2(uStern.x*uRes.x,(1.-uStern.y)*uRes.y);
      vec2 bowFrag=vec2(uBow.x*uRes.x,(1.-uBow.y)*uRes.y);
      vec2 sternP=planeAt(sternFrag);
      vec2 bowP=planeAt(bowFrag);
      vec2 head=bowP-sternP;
      float headL=length(head);
      head=headL>1e-4?head/headL:vec2(1.,0.);
      float cyaw=cos(uYaw),syaw=sin(uYaw);
      head=vec2(cyaw*head.x-syaw*head.y,syaw*head.x+cyaw*head.y);
      vec2 aftP=-head;
      vec2 sideP=vec2(-aftP.y,aftP.x);
      vec2 jx=planeAt(sternFrag+vec2(1.,0.))-sternP;
      vec2 jy=planeAt(sternFrag+vec2(0.,1.))-sternP;
      float det=jx.x*jy.y-jx.y*jy.x;
      if(abs(det)>1e-5){
        vec2 aftS=vec2(jy.y*aftP.x-jy.x*aftP.y,-jx.y*aftP.x+jx.x*aftP.y)/det;
        float aLen=length(aftS);
        if(aLen>1e-3){
          vec2 aft=aftS/aLen;
          vec2 acr=vec2(-aft.y,aft.x);
          float cs=cos(.340339),sn=sin(.340339);
          vec2 armP=cs*aftP+sn*sideP;
          vec2 armS=vec2(jy.y*armP.x-jy.x*armP.y,-jx.y*armP.x+jx.x*armP.y)/det;
          float spread=abs(dot(armS,acr))/max(abs(dot(armS,aft)),1e-3);
          spread=clamp(spread,.06,.42);
          vec2 d=frag-sternFrag;
          float alongPx=dot(d,aft);
          float acrossPx=dot(d,acr);
          float alongVw=alongPx/max(uRes.x,1.);
          float reach=.35*clamp(uWake,0.,1.);
          if(alongVw>-0.012 && alongVw<reach){
            float sternHalf=max(uBeam,.008)*uRes.x;
            float armLine=sternHalf+max(alongPx,0.)*spread;
            float armW=mix(.04,.014,smoothstep(.02,.30,alongVw))*uRes.x;
            float dArm=min(abs(acrossPx-armLine),abs(acrossPx+armLine));
            float arms=1.-smoothstep(armW*.3,armW,dArm);
            float centreW=mix(.05,.018,smoothstep(0.,.28,alongVw))*uRes.x;
            float centre=(1.-smoothstep(centreW*.1,centreW,abs(acrossPx)))*.8;
            float fillW=armLine+armW*.75;
            float fill=(1.-smoothstep(fillW*.15,fillW,abs(acrossPx)))*(1.-smoothstep(.05,.16,alongVw));
            float field=max(arms,max(centre,fill));
            field*=smoothstep(-.012,.006,alongVw);
            vec2 adv=vec2(acrossPx,alongPx-uTime*46.);
            float n1=noise(adv*.01);
            float n2=noise(adv*.022+3.7);
            float n3=noise(adv*.042+8.1);
            float n=n1*.5+n2*.32+n3*.18;
            float holes=smoothstep(.2,.7,n);
            float foam=field*mix(.7,1.,holes);
            float up=smoothstep(0.,.055,alongVw);
            float down=1.-smoothstep(.055,max(reach,.06),alongVw);
            float fall=mix(.78,.86,up)*mix(1.,down,step(.055,alongVw));
            fall*=1.-smoothstep(max(reach-.04,0.),reach,alongVw);
            float crestW=smoothstep(-.55,.35,crest);
            float amt=foam*fall;
            vec3 foamCol=mix(col,vec3(.995,1.,1.),mix(.74,1.,crestW));
            col=mix(col,foamCol,clamp(amt,0.,1.));
          }
        }
      }
    }
    float belowPx=(uv.y-h)*uRes.y;
    float hazeW=24.*px;
    vec3 hazeC=vec3(232.,244.,252.)/255.;
    col=mix(hazeC,col,smoothstep(0.,8.*px,belowPx));
    float haze=0.;
    if(belowPx>0.&&belowPx<hazeW) haze=sin(belowPx/hazeW*3.14159265)*.70;
    col=mix(col,hazeC,haze);
    if(uTap.z>0.){
      float age=max(uTime-uTap.z,0.);
      vec2 p=uv-vec2(uTap.x+age*.12,uTap.y);
      float ring=exp(-abs(length(p)-age*.04)*80.)*exp(-age*.8);
      col+=vec3(.7,.95,1.)*ring*.25;
    }
  }
  float lift=max(uExposure-.4,0.);
  col*=1.+lift;
  vec3 floorC=vec3(15.,90.,122.)/255.;
  float ls=dot(col,vec3(.2126,.7152,.0722));
  float lf=dot(floorC,vec3(.2126,.7152,.0722));
  if(ls<lf) col=mix(floorC,col,ls/max(lf,.001));
  col=mix(col,vec3(.976,.973,.969),clamp(uFade,0.,1.));
  float d0=ign(frag+vec2(uTime*17.,3.));
  float d1=ign(frag+vec2(8.2,uTime*9.));
  col+=(vec3(d0,d1,d0*.6+d1*.4)-.5)*(1.4/255.);
  fragColor=vec4(clamp(col,0.,1.),1.);
}
