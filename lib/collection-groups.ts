import type {SourceProduct} from './source-catalogue';
export const collectionGroups = [
 {id:'all',ar:'كل العبايات',en:'All abayas'},
 {id:'lace',ar:'الدانتيل',en:'Lace'},
 {id:'embroidery',ar:'التطريز',en:'Embroidery'},
 {id:'colours',ar:'ألوان متعددة',en:'Colour choices'},
] as const;
export type CollectionGroup=typeof collectionGroups[number]['id'];
export const validGroup=(v:string|null):CollectionGroup=>collectionGroups.find(g=>g.id===v)?.id??'all';
// These editorial groups use seller text/options, not inferred fabric or stock.
export function inGroup(p:SourceProduct,group:CollectionGroup){
 if(group==='lace')return /دانتيل/.test(p.description);
 if(group==='embroidery')return /مطرز/.test(p.description);
 if(group==='colours')return p.addonGroups.some(g=>g.id==='sgsgty6umuqzu2p8'||g.id==='h5lv7eefmutwa2g4');
 return true;
}
export function relatedPieces(p:SourceProduct,all:SourceProduct[]){
 const groups=collectionGroups.filter(g=>g.id!=='all'&&inGroup(p,g.id));
 return all.filter(x=>x.id!==p.id).map((x,i)=>({x,i,score:groups.filter(g=>inGroup(x,g.id)).length})).sort((a,b)=>b.score-a.score||a.i-b.i).slice(0,4).map(v=>v.x);
}
