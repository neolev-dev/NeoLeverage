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
    float oct=uOct<.5?3.:uOct;
    float wave=0.;
    vec2 grad=vec2(0.);
    for(int i=0;i<4;i++){
      float fi=float(i);
      float alive=fi<oct?1.:0.;
      float L=mix(108.,34.,fi/3.)*px;
      float ang=fi<2.?(.46+fi*.42):(-.55-(fi-2.)*.38);
      vec2 D=vec2(cos(ang),sin(ang));
      float k=6.2831853/L;
      float freq=length(vec2(D.x,D.y/max(vScale,.15)));
      float wl=L/max(freq,.001);
      float vis=smoothstep(8.*px,20.*px,wl)*alive;
      float amp=mix(4.6,1.15,fi/3.)*px*vScale*vScale*vis;
      float ph=k*(D.x*frag.x+D.y*yAcc)-uTime*(.42+.22*fi)*max(uWind,.2);
      float c=cos(ph);
      wave+=amp*sin(ph);
      float slope=amp*k*c;
      grad.x+=D.x*slope;
      grad.y+=D.y*slope/max(vScale,.15);
    }
    vec3 n=normalize(vec3(-grad.x,1.,-grad.y));
    vec3 farC=vec3(124.,198.,238.)/255.;
    vec3 midC=vec3(46.,155.,214.)/255.;
    vec3 nearC=vec3(26.,134.,196.)/255.;
    vec3 clearC=vec3(78.,176.,196.)/255.;
    col=mix(farC,midC,smoothstep(0.,.48,yN));
    col=mix(col,nearC,smoothstep(.52,1.,yN));
    float delta=dot(n,sun)-.242;
    float atten=smoothstep(.04,.34,yN);
    col*=clamp(1.+delta*.62*atten,.9,1.08);
    float crest=clamp(wave/(6.*px),-1.,1.);
    col=mix(col,min(col+vec3(.035,.03,.02),vec3(1.)),max(crest,0.)*.16*smoothstep(.22,.6,yN));
    float caus=uCaustic<.01?1.:uCaustic;
    vec2 cUV=vec2(frag.x/(42.*px),yAcc/(36.*px));
    float cells=pow(smoothstep(.22,.86,1.-vor(cUV+vec2(uTime*.04,uWindFront))),2.);
    float see=smoothstep(.5,1.,yN)*clamp(.55-crest,0.,1.);
    col=mix(col,clearC,cells*see*caus*.16);
    float down=clamp(-rd.y/.28,0.,1.);
    vec3 V=normalize(-rd);
    float ndv=clamp(dot(n,V),0.,1.);
    float fres=.02+.98*pow(1.-ndv,5.);
    vec3 refl=skyColor(uv);
    float band=smoothstep(.78,.805,uv.x)*smoothstep(.94,.915,uv.x);
    float reflAmt=min(fres,mix(.28,.06,down))*band;
    col=mix(col,refl,reflAmt);
    float nearH=1.-smoothstep(0.,.42,yN);
    float cell=mix(1.,3.,1.-nearH)*px;
    vec2 g=frag/max(cell,1.);
    float spark=smoothstep(.965,.992,hash(floor(g)+vec2(uTime*.15,0.)));
    float blob=smoothstep(.48,.08,length(fract(g)-.5));
    col+=vec3(1.,.985,.94)*spark*blob*band*nearH*uGlitter*.9;
    float fore=smoothstep(.80,.88,uv.y);
    float period=max(uRes.x*.6,1.);
    float swell=sin((frag.x+uScroll*period*1.25)/period*6.2831853);
    col*=1.+swell*.04*fore;
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
