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

float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){
  vec2 i=floor(p),f=fract(p);
  float a=hash(i),b=hash(i+vec2(1.,0.)),c=hash(i+vec2(0.,1.)),d=hash(i+vec2(1.,1.));
  vec2 u=f*f*(3.-2.*f);
  return mix(mix(a,b,u.x),mix(c,d,u.x),u.y);
}
float fbm(vec2 p){
  float oct=uOct<0.5?4.:uOct;
  float n=0.,a=.55,s=1.;
  for(int i=0;i<4;i++){
    n+=noise(p*s)*a*step(float(i),oct-0.5);
    s*=2.03;
    a*=.5;
  }
  return n;
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
vec3 lin(vec3 c){return pow(c,vec3(2.2));}
vec3 enc(vec3 c){return pow(max(c,0.),vec3(1./2.2));}
vec3 neutral(vec3 color){
  const float startCompression=.76;
  const float desaturation=.15;
  float x=min(color.r,min(color.g,color.b));
  float offset=x<0.08?x-6.25*x*x:0.04;
  color-=offset;
  float peak=max(color.r,max(color.g,color.b));
  if(peak<startCompression) return max(color,0.);
  float d=1.-startCompression;
  float newPeak=1.-d*d/(peak+d-startCompression);
  color*=newPeak/peak;
  float g=1.-1./(desaturation*(peak-newPeak)+1.);
  return mix(color,vec3(newPeak),g);
}
vec3 sunDir(){
  float az=.40;
  return normalize(vec3(sin(az)*cos(uSunEl),sin(uSunEl),cos(az)*cos(uSunEl)));
}
float inHead(vec2 uv){
  if(uHead.z<0.01) return 0.;
  vec2 pad=48./uRes;
  vec2 a=uHead.xy-pad;
  vec2 b=uHead.xy+uHead.zw+pad;
  return step(a.x,uv.x)*step(uv.x,b.x)*step(a.y,uv.y)*step(uv.y,b.y);
}
vec3 skyColor(vec3 rd, vec2 uv){
  vec3 sun=sunDir();
  float elev=clamp(rd.y/.42,0.,1.);
  vec3 zen=lin(vec3(186.,220.,246.)/255.);
  vec3 midc=lin(vec3(214.,236.,252.)/255.);
  vec3 hor=lin(vec3(234.,246.,254.)/255.);
  vec3 sky=mix(hor,midc,smoothstep(0.,.22,elev));
  sky=mix(sky,zen,smoothstep(.2,.9,elev));
  float mu=max(dot(rd,sun),0.);
  sky+=vec3(1.)*pow(mu,80.)*.35;
  sky=mix(sky,vec3(1.),smoothstep(.9988,.9996,mu));
  float band=0.;
  if(uHead.z>.01){
    vec2 pad=72./max(uRes,vec2(1.));
    vec2 q=abs(uv-(uHead.xy+uHead.zw*.5))/(uHead.zw*.5+pad);
    band=1.-smoothstep(.72,1.2,max(q.x,q.y));
  }
  float cirrus=smoothstep(.62,.9,noise(vec2(rd.x*9.-uTime*.04,rd.y*28.)));
  cirrus*=smoothstep(.08,.2,rd.y)*smoothstep(.72,.4,rd.y)*(1.-band);
  sky=mix(sky,min(sky+vec3(.08,.09,.1),vec3(1.)),cirrus*.12);
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
  vec3 col;
  if(rd.y>=-.0004){
    col=skyColor(rd,uv);
  }else{
    float camY=2.2;
    float tHit=camY/max(-rd.y,.0008);
    vec2 xz=rd.xz*tHit;
    xz.x-=uTime*1.6*max(uWind,.15);
    float fw=tHit*uFov/max(uRes.y,1.)*2.6;
    float shore=smoothstep(0.,.08,-rd.y);
    float y=0.;
    vec3 n=vec3(0.,1.,0.);
    for(int i=0;i<6;i++){
      float fi=float(i);
      float alive=(fi<4.||uHi>.5)?1.:0.;
      float L=40.*pow(.15,fi/5.);
      float k=6.2831853/L;
      float A=L*mix(.016,.03,fi/5.)*alive;
      float Q=mix(.2,.35,fi/5.);
      float ang=atan(.1,1.)+(fi-2.5)*.209;
      vec2 D=vec2(cos(ang),sin(ang));
      float ph=k*dot(D,xz)-sqrt(9.81*k)*uTime;
      float s=sin(ph),c=cos(ph);
      float vis=smoothstep(L*.2,L*.07,fw)*shore;
      y+=A*s*vis;
      n.x-=D.x*A*k*c*vis;
      n.z-=D.y*A*k*c*vis;
      n.y-=Q*A*k*s*vis;
    }
    float detail=smoothstep(2.2,.4,fw);
    float rip=mix(.035,.08,clamp(uWind,0.,1.4))*detail*shore;
    vec2 rp=xz*.28+vec2(uTime*mix(.2,.9,clamp(uWind,0.,1.)),0.);
    float e=.22;
    float h0=fbm(rp);
    n.x+=(h0-fbm(rp+vec2(e,0.)))/e*rip;
    n.z+=(h0-fbm(rp+vec2(0.,e)))/e*rip;
    n=normalize(n);
    vec3 V=normalize(-rd);
    float ndv=clamp(dot(n,V),0.,1.);
    float fres=.02+.98*pow(1.-ndv,5.);
    vec3 refl=skyColor(reflect(rd,n),uv);
    float depth=clamp(tHit/70.,0.,1.);
    vec3 nearC=lin(vec3(30.,156.,203.)/255.);
    vec3 midC=lin(vec3(56.,178.,221.)/255.);
    vec3 farC=lin(vec3(140.,205.,235.)/255.);
    vec3 transmit=lin(vec3(94.,214.,214.)/255.);
    col=mix(nearC,midC,smoothstep(0.,.4,depth));
    col=mix(col,farC,smoothstep(.3,1.,depth));
    col=mix(transmit,col,.55);
    float wrap=clamp(dot(n,sun)*.55+.45,0.,1.);
    col*=mix(.5,1.4,wrap);
    float crest=smoothstep(0.,.08,y)*smoothstep(.2,.75,dot(n,sun));
    col=mix(col,min(transmit*1.35,vec3(1.)),crest*.45);
    float down=clamp(-rd.y/.22,0.,1.);
    float fresMix=min(fres,mix(.55,.1,down));
    col=mix(col,refl,fresMix);
    float luma=dot(max(col,0.),vec3(.2126,.7152,.0722));
    vec3 ink=lin(vec3(16.,124.,178.)/255.);
    float inkL=max(dot(ink,vec3(.2126,.7152,.0722)),.0008);
    float dye=smoothstep(.001,.09,-rd.y);
    col=mix(col,ink*clamp(luma/inkL,.4,1.55),dye*.92);
    float paw=smoothstep(.55,.82,noise(xz*.045-vec2(uWindFront*18.,0.)))*detail;
    float rough=mix(.06,.14,paw);
    float a2=rough*rough;
    vec3 H=normalize(V+sun);
    float ndh=max(dot(n,H),0.);
    float D=a2/(3.14159*pow(ndh*ndh*(a2-1.)+1.,2.));
    col+=vec3(1.)*D*fres*clamp(dot(n,sun),0.,1.)*detail*1.35;
    float sunBand=smoothstep(.22,.0,abs(uv.x-uSunX))*(1.-inHead(uv));
    float glint=smoothstep(.62,.9,noise(xz*mix(10.,22.,uGlitter)+vec2(uTime*.5,0.)))*detail;
    col+=vec3(1.)*glint*sunBand*uGlitter*clamp(uWind,.2,1.3)*1.15;
    col+=vec3(1.)*exp(-abs(uv.x-uSunX)*14.)*shore*sunBand*.28;
    float zone=smoothstep(.22,.04,frag.y/uRes.y);
    float caus=uCaustic<.01?1.:uCaustic;
    float cells=pow(1.-vor(xz*.42+vec2(uTime*.08,0.)),3.);
    col+=transmit*cells*zone*caus*.18*shore;
    float lanes=smoothstep(.4,.78,noise(vec2(xz.y*3.2,xz.x*.03-uTime*1.1)));
    col+=vec3(1.)*lanes*shore*clamp(uWind,0.,1.4)*.22*(1.-inHead(uv));
    vec2 top=uv;
    vec2 ship=uShip.xy;
    vec2 wh=max(uShip.zw,vec2(.001));
    float wl=ship.y+wh.y*.92;
    float below=top.y-wl;
    if(below>0.&&below<wh.y){
      vec2 d=(vec2(top.x,wl-below)-vec2(ship.x,ship.y+wh.y*.35))/wh;
      float sail=length(d/vec2(.42,.55));
      col=mix(col,lin(vec3(1.,.97,.9)),(1.-smoothstep(.5,1.,sail))*uSail*exp(-below*8.)*.35);
    }
    vec2 rel=(top-vec2(ship.x,wl))*vec2(uRes.x/uRes.y,1.);
    float behind=-rel.x;
    if(behind>0.){
      float ang=degrees(atan(rel.y,behind));
      float kel=smoothstep(mix(2.2,.4,clamp(uConverge,0.,1.)),.12,abs(abs(ang)-19.));
      float foam=noise(vec2(behind*26.,rel.y*20.)+uTime*.35);
      float life=exp(-behind*mix(8.,3.2,clamp(uWake,0.,1.)));
      col+=vec3(1.)*kel*life*smoothstep(.28,.75,foam)*uWake*1.35;
    }
    if(uTap.z>0.){
      float age=max(uTime-uTap.z,0.);
      vec2 p=top-vec2(uTap.x+age*.12,uTap.y);
      float ring=exp(-abs(length(p)-age*.04)*80.)*exp(-age*.8);
      col+=vec3(.7,.95,1.)*ring*.35;
    }
  }
  float expo=uExposure<.01?.4:uExposure;
  col=neutral(max(col,0.)*exp2(expo));
  col=enc(col);
  vec3 floorC=vec3(15.,90.,122.)/255.;
  float ls=dot(col,vec3(.2126,.7152,.0722));
  float lf=dot(floorC,vec3(.2126,.7152,.0722));
  if(ls<lf) col=mix(floorC,col,ls/max(lf,.001));
  col=mix(col,vec3(.976,.973,.969),clamp(uFade,0.,1.));
  col+=(ign(frag+fract(uTime)*vec2(47.,17.))-.5)/255.;
  fragColor=vec4(clamp(col,0.,1.),1.);
}
