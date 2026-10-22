"use client";
import {useEffect,useRef,useState} from 'react';
/** A small 2D texture mesh: the hanger is pinned and the hem responds with damping.
 * This is image deformation, not a fabric/material physics simulation. */
export function ClothImage({src,alt,active,transitionKey,direction=1,priority,onError}:{src:string;alt:string;active:boolean;transitionKey:number;direction?:number;priority:boolean;onError:()=>void}){
 const canvas=useRef<HTMLCanvasElement>(null),[ready,setReady]=useState(false);
 const kick=useRef(()=>{});
 useEffect(()=>{kick.current();},[transitionKey]);
 useEffect(()=>{
  const target=canvas.current,reduce=matchMedia('(prefers-reduced-motion: reduce)');
  if(!target||!active||reduce.matches)return;
  let disposed=false,frame=0,visible=true,last=0,rendered=false,start=performance.now();const textureImage=new Image();
  let gl:WebGLRenderingContext|null=null,program:WebGLProgram|null=null,buffer:WebGLBuffer|null=null,texture:WebGLTexture|null=null;
  const shaders:WebGLShader[]=[];
  const stop=()=>{cancelAnimationFrame(frame);frame=0;};
  function render(now:number){
   if(disposed||!gl||!program||!visible||document.hidden||reduce.matches){stop();return;}
   frame=requestAnimationFrame(render);if(now-last<33)return;last=now;if(!start)start=now;
   const t=(now-start)/1000;gl.uniform1f(gl.getUniformLocation(program,'u_time'),t);
   gl.clear(gl.COLOR_BUFFER_BIT);gl.drawArrays(gl.TRIANGLES,0,10*36*6);if(!rendered){rendered=true;setReady(true);}if(t>2.4)stop();
  }
  const resume=()=>{if(reduce.matches){setReady(false);stop();}else if(gl&&program&&!frame&&visible&&!document.hidden)frame=requestAnimationFrame(render);};
  kick.current=()=>{start=performance.now();resume();};
  const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;if(visible)resume();else stop();},{threshold:.05});observer.observe(target);
  textureImage.onload=()=>{
   if(disposed)return;
   try{
    gl=target!.getContext('webgl',{alpha:true,premultipliedAlpha:false,antialias:true,powerPreference:'low-power'});if(!gl)return;
    const w=target!.clientWidth,h=target!.clientHeight,dpr=Math.min(devicePixelRatio,2);target!.width=Math.round(w*dpr);target!.height=Math.round(h*dpr);gl.viewport(0,0,target!.width,target!.height);
    program=gl.createProgram();if(!program)return;
    const vertex=`attribute vec2 a_position;attribute vec2 a_uv;varying vec2 v_uv;uniform float u_time;void main(){v_uv=a_uv;vec2 p=a_position;float hem=pow(1.0-a_uv.y,2.2);float decay=exp(-u_time*1.9);float wave=sin(u_time*10.0-a_uv.y*5.0+a_uv.x*2.0);p.x+=wave*decay*0.085*hem*${direction.toFixed(1)};p.y+=sin(u_time*8.0+a_uv.x*4.0)*decay*0.012*hem;gl_Position=vec4(p,0.0,1.0);}`;
    const fragment=`precision mediump float;varying vec2 v_uv;uniform sampler2D u_image;void main(){gl_FragColor=texture2D(u_image,v_uv);}`;
    for(const [type,source] of [[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,fragment]] as const){const shader=gl.createShader(type)!;shaders.push(shader);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error('Shader unavailable');gl.attachShader(program,shader);}
    gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error('Renderer unavailable');gl.useProgram(program);
    const fit=Math.min(w/textureImage.naturalWidth,h/textureImage.naturalHeight),sx=textureImage.naturalWidth*fit/w,sy=textureImage.naturalHeight*fit/h;
    const vertices:number[]=[];const add=(x:number,y:number)=>vertices.push((x/10*2-1)*sx,(y/36*2-1)*sy,x/10,y/36);
    for(let y=0;y<36;y++)for(let x=0;x<10;x++){add(x,y);add(x+1,y);add(x,y+1);add(x+1,y);add(x+1,y+1);add(x,y+1);}
    buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.STATIC_DRAW);
    for(const [name,offset] of [['a_position',0],['a_uv',8]] as const){const location=gl.getAttribLocation(program,name);gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,2,gl.FLOAT,false,16,offset);}
    texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,textureImage);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.clearColor(0,0,0,0);start=performance.now();resume();
   }catch{setReady(false);stop();}
  };
  textureImage.src=src;
  const resize=new ResizeObserver(()=>{if(gl){const dpr=Math.min(devicePixelRatio,2);target.width=Math.round(target.clientWidth*dpr);target.height=Math.round(target.clientHeight*dpr);gl.viewport(0,0,target.width,target.height);resume();}});resize.observe(target);
  const lost=(event:Event)=>{event.preventDefault();stop();setReady(false);};target.addEventListener('webglcontextlost',lost);document.addEventListener('visibilitychange',resume);reduce.addEventListener('change',resume);
  return()=>{disposed=true;kick.current=()=>{};stop();observer.disconnect();resize.disconnect();target.removeEventListener('webglcontextlost',lost);document.removeEventListener('visibilitychange',resume);reduce.removeEventListener('change',resume);if(gl){if(texture)gl.deleteTexture(texture);if(buffer)gl.deleteBuffer(buffer);if(program)gl.deleteProgram(program);shaders.forEach(shader=>gl!.deleteShader(shader));gl.getExtension('WEBGL_lose_context')?.loseContext();}setReady(false);};
 },[src,active]);
 return <span className="aulla-hero-garment cloth-image" data-rendered={ready}><img src={src} alt={alt} width="640" height="800" draggable="false" fetchPriority={priority?'high':'auto'} loading={active?'eager':'lazy'} onError={onError}/>{active&&<canvas ref={canvas} aria-hidden="true"/>}</span>;
}
