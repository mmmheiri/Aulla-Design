"use client";
import {useEffect,useRef,useState} from 'react';
import {socialVideos,instagramProfile,type SocialVideo} from '../lib/social-videos';
import {useShop} from './Shop';
import {SocialLinks} from './SocialLinks';

function SocialVideoCard({item,ar}:{item:SocialVideo;ar:boolean}){
 const ref=useRef<HTMLVideoElement>(null);
 const [playing,setPlaying]=useState(false),[paused,setPaused]=useState(false);
 useEffect(()=>{
  const video=ref.current;if(!video)return;
  const motion=matchMedia('(prefers-reduced-motion: reduce)');let visible=false,disposed=false;
  const update=()=>{if(visible&&!motion.matches&&!document.hidden&&!paused){video.muted=true;if(!video.getAttribute('src')){video.src=item.videoSrc;video.load();}void video.play().then(()=>{if(disposed||!visible||motion.matches||document.hidden||paused)video.pause();}).catch(()=>{});}else video.pause();};
  const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting&&entries[0].intersectionRatio>=.5;update();},{threshold:[0,.5]});observer.observe(video);
  const reduce=()=>{video.pause();if(motion.matches){video.removeAttribute('src');video.load();}update();};
  motion.addEventListener('change',reduce);document.addEventListener('visibilitychange',update);
  return()=>{disposed=true;observer.disconnect();motion.removeEventListener('change',reduce);document.removeEventListener('visibilitychange',update);video.pause();};
 },[item.videoSrc,paused]);
 const caption=ar?item.captionAr:item.captionEn;
 const togglePlayback=()=>{const video=ref.current;if(!video)return;if(playing){setPaused(true);video.pause();return;}if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;setPaused(false);video.muted=true;if(!video.getAttribute('src'))video.src=item.videoSrc;void video.play().catch(()=>setPaused(true));};
 return <article className="social-video-card"><div className="social-video-frame"><video ref={ref} poster={item.poster} muted playsInline loop preload="none" aria-label={caption} onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)}/><button type="button" className="social-pause" aria-label={ar?(playing?'إيقاف الفيديو':'تشغيل الفيديو'):(playing?'Pause video':'Play video')} onClick={togglePlayback}>{playing?'Ⅱ':'▷'}</button></div><p>{caption}</p><a href={item.postUrl} target="_blank" rel="noopener noreferrer">{ar?(item.platform==='instagram'?'شاهديه على إنستغرام':'شاهديه على تيك توك'):(item.platform==='instagram'?'Watch on Instagram':'Watch on TikTok')} ↗</a></article>;
}
export function SocialVideos(){const {locale}=useShop();const ar=locale==='ar';return <section className="container social-videos" aria-labelledby="social-videos-title"><div className="section-heading"><h2 id="social-videos-title">{ar?'من إنستغرام وتيك توك':'From our Instagram & TikTok'}</h2><SocialLinks/></div>{socialVideos.length?<div className="social-video-grid">{socialVideos.map(item=><SocialVideoCard key={item.id} item={item} ar={ar}/>)}</div>:<p className="social-empty">{ar?'تابعي إطلالات أولّا وكواليسها على إنستغرام.':'Explore Aulla looks and behind the scenes on Instagram.'}</p>}</section>;}
