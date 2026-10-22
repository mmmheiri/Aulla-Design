export type SocialVideo = {
  id: string;
  platform: 'instagram' | 'tiktok';
  postUrl: string;
  videoSrc: `/media/social/${string}.mp4`;
  poster: string;
  captionAr: string;
  captionEn: string;
};
export const instagramProfile='https://www.instagram.com/aulladesign/';
// Only publish a TikTok link after the owner confirms the official account.
export const tiktokProfile:string='';
// Populate only after owner supplies original, music-cleared clips + exact post URLs.
// Do not substitute generated films or scrape platform audio.
export const socialVideos: SocialVideo[] = [];
