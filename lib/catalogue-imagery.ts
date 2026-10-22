import media from "./media-manifest.json";
type Entry = {original:string;revision:string;renditions:{src:string;width:number;height:number;bytes:number}[];hero:string;heroApproved:boolean};
export const catalogueMedia = media as Record<string,Entry>;
export const catalogueOriginal = (id:string)=>catalogueMedia[id]?.original??"/catalogue-2d/"+id+"-v5-pose.webp";
export const catalogueImage = (id:string)=>catalogueMedia[id]?.renditions[1].src??catalogueOriginal(id);
export const catalogueDetailed = (id:string)=>catalogueMedia[id]?.renditions.at(-1)?.src??catalogueOriginal(id);
// Keep facial detail on low-DPR screens; the 320px export remains a thumbnail only.
export const catalogueSrcSet = (id:string)=>catalogueMedia[id]?.renditions.filter(r=>r.width>=640).map(r=>r.src+" "+r.width+"w").join(", ");
export const catalogueHero = (id:string)=>catalogueMedia[id]?.hero??"/arc-cutouts/"+id+".png";
