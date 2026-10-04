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
uniform vec3 uTap;

float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){
  vec2 i=floor(p),f=fract(p);
  float a=hash(i),b=hash(i+vec2(1.,0.)),c=hash(i+vec2(0.,1.)),d=hash(i+vec2(1.,1.));
  vec2 u=f*f*(3.-2.*f);
  return mix(mix(a,b,u.x),mix(c,d,u.x),u.y);
}
float fbm(vec2 p){
  float n=noise(p);
  n+=.5*noise(p*2.02+13.1);
  float hi=noise(p*4.05+3.7)+.5*noise(p*8.1+7.2);
  return n+hi*uHi*.25;
}
float ign(vec2 p){return fract(52.9829189*fract(dot(p,vec2(.06711056,.00583715))));}

vec3 sunDir(){
  float az=.62;
  return normalize(vec3(sin(az)*cos(uSunEl),sin(uSunEl),cos(az)*cos(uSunEl)));
}
vec3 skyColor(vec3 rd){
  vec3 sun=sunDir();
  float elev=clamp(rd.y/.38,0.,1.);
  vec3 zenith=vec3(.494,.659,.859);
  vec3 midc=vec3(.639,.851,.996);
  vec3 hor=mix(vec3(1.,.820,.580),vec3(1.,.702,.278),clamp(uSunEl*8.,0.,1.));
  vec3 sky=mix(hor,midc,smoothstep(0.,.42,elev));
  sky=mix(sky,zenith,smoothstep(.28,1.,elev));
  float mu=dot(rd,sun);
  float g=.76;
  float mie=(1.-g*g)/pow(max(1.+g*g-2.*g*mu,.0008),1.5);
  sky+=vec3(1.,.875,.341)*mie*.008;
  float disk=smoothstep(.9986,.99965,mu);
  vec3 core=vec3(1.,.957,.839);
  sky=mix(sky,core,disk);
  sky=mix(sky,vec3(.996,.498,.220),disk*.15);
  vec2 drift=vec2(uTime*.01*max(uWind,.2),0.);
  float clouds=smoothstep(.58,.82,noise(rd.xz*2.4+drift))+smoothstep(.62,.86,noise(rd.xz*4.6+drift.yx+4.));
  clouds*=smoothstep(.02,.16,rd.y)*smoothstep(.5,.2,rd.y);
  sky=mix(sky,min(sky+vec3(.08,.07,.05),vec3(1.)),clamp(clouds,0.,1.)*.2);
  if(uOct>.5){
    vec2 q=(rd.xy-sun.xy);
    vec2 a=abs(q);
    float oct=max(max(a.x,a.y),(a.x+a.y)*.7071);
    sky+=core*smoothstep(.22,.02,oct)*disk*.04;
  }
  return sky;
}
vec3 ray(vec2 frag){
  vec2 ndc=frag/uRes*2.-1.;
  float cs=.999986,sn=.005236;
  ndc=mat2(cs,-sn,sn,cs)*ndc;
  float th=tan(uFov*.5);
  vec3 rd=normalize(vec3(ndc.x*th*uRes.x/uRes.y,ndc.y*th,1.));
  float cp=cos(uPitch),sp=sin(uPitch);
  return vec3(rd.x,cp*rd.y+sp*rd.z,-sp*rd.y+cp*rd.z);
}
vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}

void main(){
  vec3 rd=ray(gl_FragCoord.xy);
  vec3 sun=sunDir();
  vec3 col;
  if(rd.y>=-.0004){
    col=skyColor(rd);
    float yTop=1.-gl_FragCoord.y/uRes.y;
    float head=smoothstep(.62,.2,gl_FragCoord.x/uRes.x);
    head*=smoothstep(.1,.18,yTop)*smoothstep(.52,.36,yTop);
    col=mix(col,col*.74+vec3(.45,.58,.7)*.08,head);
  }else{
    float tHit=1.8/max(-rd.y,.0008);
    vec3 hit=vec3(0.,1.8,0.)+rd*tHit;
    vec2 xz=hit.xz;
    float fw=tHit*uFov/max(uRes.y,1.)*2.8;
    float shore=smoothstep(0.,.1,-rd.y);
    float y=0.;
    vec3 n=vec3(0.,1.,0.);
    for(int i=0;i<6;i++){
      float fi=float(i);
      float alive=(fi<4.||uHi>.5)?1.:0.;
      float L=60.*pow(.69,fi);
      float k=6.2831853/L;
      float A=L*mix(.006,.011,fi/5.)*alive;
      float Q=mix(.25,.45,fi/5.);
      float ang=atan(.12,1.)+(fi-2.5)*.22;
      vec2 D=vec2(cos(ang),sin(ang));
      float omega=sqrt(9.81*k);
      float ph=k*dot(D,xz)-omega*uTime;
      float s=sin(ph),c=cos(ph);
      float vis=smoothstep(L*.16,L*.06,fw)*shore;
      y+=A*s*vis;
      n.x-=D.x*A*k*c*vis;
      n.z-=D.y*A*k*c*vis;
      n.y-=Q*A*k*s*vis;
    }
    float detail=smoothstep(1.8,.35,fw);
    vec2 flow=vec2(mix(.15,1.,clamp(uWind,0.,1.)),mix(.2,0.,clamp(uWind,0.,1.)));
    vec2 rp=xz*.21+flow*uTime*mix(.15,.8,clamp(uWind,0.,1.));
    float eps=.28;
    float amp=mix(.006,.028,clamp(uWind,0.,1.))*detail*shore;
    float h0=fbm(rp);
    float hx=fbm(rp+vec2(eps,0.));
    float hz=fbm(rp+vec2(0.,eps));
    n.x+=(h0-hx)/eps*amp;
    n.z+=(h0-hz)/eps*amp;
    n=normalize(n);
    vec3 V=normalize(-rd);
    float ndv=clamp(dot(n,V),0.,1.);
    float fres=.02+.98*pow(1.-ndv,5.);
    vec3 refl=skyColor(reflect(rd,n));
    float depth=clamp(tHit/80.,0.,1.);
    vec3 deep=vec3(.078,.188,.290);
    vec3 shallow=vec3(.180,.435,.557);
    col=mix(shallow,deep,smoothstep(0.,.65,depth));
    float crest=smoothstep(0.,.12,y)*smoothstep(.15,.85,dot(n,sun));
    col=mix(col,vec3(1.,.702,.278),crest*.12);
    col=mix(col,refl,fres);
    float paw=smoothstep(.58,.8,noise(xz*.04-vec2(uWindFront*26.+uTime*.15,0.)))*detail;
    float rough=mix(.035,.16,clamp(uWind,0.,1.))*mix(1.,2.2,paw);
    float a2=rough*rough;
    vec3 H=normalize(V+sun);
    float ndh=max(dot(n,H),0.);
    float D=a2/(3.14159*pow(ndh*ndh*(a2-1.)+1.,2.));
    float spec=D*fres*clamp(dot(n,sun),0.,1.);
    col+=vec3(1.,.93,.75)*spec*detail*.55;
    float across=abs(dot(xz,normalize(vec2(-sun.z,sun.x))));
    float path=exp(-across*mix(.55,.12,clamp(uWind,0.,1.)))*exp(-tHit*.012);
    float glint=smoothstep(.78,.95,noise(xz*mix(6.,14.,uGlitter)+uTime*.6))*detail;
    col+=vec3(1.,.95,.82)*glint*path*uGlitter*clamp(uWind,.15,1.2)*.55;
    col*=mix(1.,.92,paw);
    col=mix(col,vec3(.965,.851,.690),1.-exp(-tHit/1400.));
    vec2 top=vec2(gl_FragCoord.x/uRes.x,1.-gl_FragCoord.y/uRes.y);
    vec2 ship=uShip.xy;
    vec2 wh=max(uShip.zw,vec2(.001));
    float wl=ship.y+wh.y*.86;
    float below=top.y-wl;
    if(below>0.&&below<wh.y*1.2){
      float warp=y*.015;
      vec2 m=vec2(top.x+warp,wl-below);
      vec2 d=(m-vec2(ship.x,ship.y+wh.y*.42))/wh;
      float sail=length(d/vec2(.46,.5));
      float a=(1.-smoothstep(.55,1.05,sail))*uSail*exp(-below*7.);
      vec3 sailCol=mix(vec3(1.,.965,.918),vec3(1.,.82,.58),.35);
      col=mix(col,sailCol,a*.5);
    }
    vec2 rel=(top-vec2(ship.x,wl))*vec2(uRes.x/uRes.y,1.);
    float behind=-rel.x;
    float side=rel.y;
    if(behind>0.){
      float ang=degrees(atan(side,behind));
      float band=mix(2.4,.35,clamp(uConverge,0.,1.));
      float kel=smoothstep(band,.15,abs(abs(ang)-19.5));
      float foam=noise(vec2(behind*30.,side*24.)+uTime*.4);
      float fade=exp(-behind*mix(9.,2.4,clamp(uWake,0.,1.)));
      col+=vec3(.93,.96,1.)*kel*fade*smoothstep(.4,.85,foam)*uWake*.55;
    }
    if(uTap.z>0.){
      float age=max(uTime-uTap.z,0.);
      vec2 p=top-vec2(uTap.x+age*.15,uTap.y);
      float ring=exp(-abs(length(p)-age*.05)*90.)*exp(-age*.7);
      col+=vec3(.85,.93,1.)*ring*.4;
    }
    vec3 lip=skyColor(normalize(vec3(rd.x,.035,max(rd.z,.2))));
    col=mix(lip,col,shore);
  }
  float hot=smoothstep(.9,1.8,dot(col,vec3(.2126,.7152,.0722)));
  col=mix(col,vec3(1.,.82,.58),hot*.45);
  col=aces(col);
  float luma=dot(col,vec3(.2126,.7152,.0722));
  col=mix(vec3(.106,.227,.333),col,smoothstep(0.,.28,luma));
  col=mix(col,vec3(.976,.973,.969),clamp(uFade,0.,1.));
  col+=(ign(gl_FragCoord.xy+fract(uTime)*vec2(47.,17.))-.5)/255.;
  fragColor=vec4(col,1.);
}
