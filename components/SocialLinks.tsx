"use client";
import {instagramProfile,tiktokProfile} from '../lib/social-videos';
import {useShop} from './Shop';

export function SocialLinks(){
 const {locale}=useShop();
 return <nav className="social-account-links" aria-label={locale==='ar'?'حسابات أولّا':'Aulla social accounts'}>
  <a href={instagramProfile} target="_blank" rel="noopener noreferrer" aria-label="Aulla Instagram"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".8" fill="currentColor" stroke="none"/></svg><span>Instagram</span></a>
  {tiktokProfile&&<a href={tiktokProfile} target="_blank" rel="noopener noreferrer" aria-label="Aulla TikTok"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M15.5 2h-3v13.5a3.5 3.5 0 1 1-3-3.46V9a6.5 6.5 0 1 0 6 6.48V8.3A8.1 8.1 0 0 0 21 10V7a5.5 5.5 0 0 1-5.5-5Z"/></svg><span>TikTok</span></a>}
 </nav>;
}
