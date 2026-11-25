/* WebGL-Seide: zeichnet NUR das echte Bild (assets/intro/silk.*) – verzerrt (Flow-Noise), verschoben, gespiegelt, gedreht,
   mit Bewegungsunschärfe und einer abgerundeten Rechteck-Maske (SDF). Kein nachgebauter Stoff.
   Die Abbildung im Rechteck entspricht `background-size: cover; background-position: center` – so passt das Ende exakt auf die
   echte Kachel (dort liegt dasselbe Bild als CSS-Hintergrund), inklusive derselben Vignette wie .silk-vig. */
import { TUNE } from './intro-config.js';

const VS = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
const FS = `precision highp float;
uniform sampler2D uTex;uniform vec2 uRes;uniform vec2 uImg;uniform float uTime;
uniform vec4 uRect;uniform float uRad;uniform float uDist;uniform float uBlur;uniform float uLayers;
uniform vec2 uOff0;uniform vec2 uOff1;uniform vec2 uOff2;uniform vec2 uOff3;uniform float uVig;uniform float uAlpha;uniform float uFlash;
vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}vec2 mod289(vec2 x){return x-floor(x*(1./289.))*289.;}
vec3 permute(vec3 x){return mod289(((x*34.)+1.)*x);}
float snoise(vec2 v){const vec4 C=vec4(.211324865405187,.366025403784439,-.577350269189626,.024390243902439);
vec2 i=floor(v+dot(v,C.yy));vec2 x0=v-i+dot(i,C.xx);vec2 i1=(x0.x>x0.y)?vec2(1.,0.):vec2(0.,1.);vec4 x12=x0.xyxy+C.xxzz;x12.xy-=i1;
i=mod289(i);vec3 p=permute(permute(i.y+vec3(0.,i1.y,1.))+i.x+vec3(0.,i1.x,1.));
vec3 m=max(.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.);m=m*m;m=m*m;
vec3 x=2.*fract(p*C.www)-1.;vec3 h=abs(x)-.5;vec3 ox=floor(x+.5);vec3 a0=x-ox;m*=1.79284291400159-.85373472095314*(a0*a0+h*h);
vec3 g;g.x=a0.x*x0.x+h.x*x0.y;g.yz=a0.yz*x12.xz+h.yz*x12.yw;return 130.*dot(m,g);}
vec2 mir(vec2 u){return 1.-abs(mod(u,2.)-1.);}
vec2 cover(vec2 p,vec4 r){vec2 l=(p-r.xy)/r.zw;float ra=r.z/r.w,ia=uImg.x/uImg.y;vec2 s=ra>ia?vec2(1.,ia/ra):vec2(ra/ia,1.);return (l-.5)*s+.5;}
vec2 flow(vec2 uv,float t,float sd){return vec2(snoise(uv*1.7+vec2(t*.45+sd,-t*.25)),snoise(uv*1.7+vec2(5.2-t*.35,1.3+t*.3+sd)));}
mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}
vec3 tap(vec2 uv,vec2 d){vec2 dir=normalize(d+vec2(1e-5));vec3 c=texture2D(uTex,mir(uv+d)).rgb;
c+=texture2D(uTex,mir(uv+d+dir*uBlur)).rgb;c+=texture2D(uTex,mir(uv+d-dir*uBlur)).rgb;return c/3.;}
vec3 lay(vec2 uv,float sd){vec2 d=flow(uv,uTime,sd)*uDist;return tap(uv,d);}
vec3 scr(vec3 a,vec3 b){return 1.-(1.-a)*(1.-b);}
void main(){
 vec2 p=vec2(gl_FragCoord.x,uRes.y-gl_FragCoord.y);
 vec2 uv=cover(p,uRect);
 vec3 col=lay(uv+uOff0,0.);
 if(uLayers>.001){
  vec2 c=uv-.5;
  vec3 l1=lay(vec2(1.-uv.x,uv.y)*1.15+uOff1,3.1);
  vec3 l2=lay(rot(.7)*c*1.3+.5+uOff2,7.7);
  vec3 l3=lay(vec2(uv.x,1.-uv.y)*.85+uOff3,11.3);
  col=mix(col,scr(scr(col,l1*.85),scr(l2*.7,l3*.6)),uLayers);
 }
 vec2 l=(p-uRect.xy)/uRect.zw;float dd=length((l-.5)*2.)/1.41421356;
 col*=1.-uVig*${TUNE.vignette.alpha.toFixed(3)}*clamp((dd-${TUNE.vignette.inner.toFixed(3)})/(1.-${TUNE.vignette.inner.toFixed(3)}),0.,1.);
 col+=uFlash;
 vec2 q=abs(p-(uRect.xy+uRect.zw*.5))-(uRect.zw*.5-uRad);float sd=length(max(q,0.))+min(max(q.x,q.y),0.)-uRad;
 float a=clamp(.5-sd,0.,1.)*uAlpha;
 gl_FragColor=vec4(col*a,a);
}`;

let imgPromise = null;
/** Bild einmal laden (für Intro, Kachel-Übergang und Prüfung) */
export function loadSilk() {
  if (!imgPromise) imgPromise = new Promise((ok, no) => { const im = new Image(); im.decoding = 'async'; im.onload = () => ok(im); im.onerror = no; im.src = TUNE.silkUrl; });
  return imgPromise;
}

/** Vollbild-Canvas mit dem Seiden-Shader. Gibt null zurück, wenn es kein WebGL gibt (dann CSS-Ersatz). */
export function createSilkGL(img) {
  const cv = document.createElement('canvas');
  cv.className = 'silk-gl';
  const gl = cv.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false, powerPreference: 'high-performance' });
  if (!gl) return null;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  let prog;
  try {
    prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  } catch (e) { return null; }
  gl.useProgram(prog);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
  for (const [k, v] of [[gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE], [gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
  const U = {}; for (const n of ['uTex', 'uRes', 'uImg', 'uTime', 'uRect', 'uRad', 'uDist', 'uBlur', 'uLayers', 'uOff0', 'uOff1', 'uOff2', 'uOff3', 'uVig', 'uAlpha', 'uFlash']) U[n] = gl.getUniformLocation(prog, n);
  gl.uniform1i(U.uTex, 0); gl.uniform2f(U.uImg, img.naturalWidth, img.naturalHeight);
  let dpr = 1, W = 0, H = 0;
  const size = () => {
    dpr = Math.min(TUNE.maxDpr, window.devicePixelRatio || 1);
    W = Math.round(innerWidth * dpr); H = Math.round(innerHeight * dpr);
    cv.width = W; cv.height = H; gl.viewport(0, 0, W, H); gl.uniform2f(U.uRes, W, H);
  };
  size();
  return {
    canvas: cv,
    resize: size,
    /** s: { time, rect:{x,y,w,h,r} in CSS-px, dist, blur, layers, off:[[x,y]×4], vig, alpha, flash } */
    draw(s) {
      const r = s.rect;
      gl.uniform1f(U.uTime, s.time || 0);
      gl.uniform4f(U.uRect, r.x * dpr, r.y * dpr, r.w * dpr, r.h * dpr); gl.uniform1f(U.uRad, (r.r || 0) * dpr);
      gl.uniform1f(U.uDist, s.dist || 0); gl.uniform1f(U.uBlur, s.blur || 0); gl.uniform1f(U.uLayers, s.layers || 0);
      const o = s.off || [];
      ['uOff0', 'uOff1', 'uOff2', 'uOff3'].forEach((n, i) => gl.uniform2f(U[n], o[i]?.[0] || 0, o[i]?.[1] || 0));
      gl.uniform1f(U.uVig, s.vig ?? 1); gl.uniform1f(U.uAlpha, s.alpha ?? 1); gl.uniform1f(U.uFlash, s.flash || 0);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    destroy() { cv.remove(); gl.getExtension('WEBGL_lose_context')?.loseContext(); },
  };
}
