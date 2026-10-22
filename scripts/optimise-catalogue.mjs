import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {createHash} from 'node:crypto';
const products=JSON.parse(await fs.readFile('docs/source-import/products.json','utf8')).products;
const corrected={
PclIvJotHUeGUOjqk7G5:'/catalogue-2d/PclIvJotHUeGUOjqk7G5-v6-pose.png',
kKLpmOxZspGNMmQFbaYJ:'/catalogue-2d/kKLpmOxZspGNMmQFbaYJ-v6-cuffs.png',
SoQvVUKJ4KX4igEPHaq4:'/catalogue-2d/SoQvVUKJ4KX4igEPHaq4-v7-reference.png',
lnPglpYAhuumNm2wHhtA:'/catalogue-2d/lnPglpYAhuumNm2wHhtA-v7-wrap.png',
AgSCVfoKPto5gvZLaIXS:'/catalogue-2d/AgSCVfoKPto5gvZLaIXS-v6-inner.png',
afW0h6iCRpPhAA77FwpR:'/catalogue-2d/afW0h6iCRpPhAA77FwpR-v8-wrap.png'};
await fs.mkdir('public/media/catalogue',{recursive:true});
const manifest={};
for(const p of products){
 const sourceOriginal=corrected[p.id]??'/catalogue-2d/'+p.id+'-v5-pose.webp';
 const cutout='/catalogue-transparent/'+p.id+(p.id==='kKLpmOxZspGNMmQFbaYJ'?'-v8-wrapped-shayla':p.id==='SoQvVUKJ4KX4igEPHaq4'?'-v2-colour':p.id==='lnPglpYAhuumNm2wHhtA'?'-v2-no-shayla':p.id==='afW0h6iCRpPhAA77FwpR'?'-v2-original-cuffs':'-v1')+'.png';
 const original=await fs.access('public'+cutout).then(()=>cutout).catch(()=>sourceOriginal);
 const raw=await fs.readFile('public'+original), hash=createHash('sha256').update(raw).update('detail-v3-lossless').digest('hex').slice(0,12);
 const renditions=[];
 const nativeWidth=(await sharp(raw).metadata()).width;
 for(const width of [...new Set([320,640,960,nativeWidth])].sort((a,b)=>a-b)){
  const local='/media/catalogue/'+p.id+'-'+hash+'-'+width+'.webp';
  const result=await sharp(raw).resize({width,withoutEnlargement:true}).webp({lossless:true,effort:5}).toFile('public'+local);
  renditions.push({src:local,width:result.width,height:result.height,bytes:result.size});
 }
 const heroOriginal='/arc-cutouts/'+p.id+(p.id==='kKLpmOxZspGNMmQFbaYJ'?'-v7-no-shayla':p.id==='AgSCVfoKPto5gvZLaIXS'?'-v2-inner':'')+'.png';
 const heroRaw=await fs.readFile('public'+heroOriginal),heroHash=createHash('sha256').update(heroRaw).update('png-alpha-960').digest('hex').slice(0,12);
 const hero='/media/catalogue/'+p.id+'-hero-'+heroHash+'.png';
 await sharp(heroRaw).resize({width:960,withoutEnlargement:true}).png({compressionLevel:9}).toFile('public'+hero);
 manifest[p.id]={original,sourceOriginal,transparent:original===cutout,originalBytes:raw.length,revision:hash,renditions,hero,heroOriginal,heroRevision:heroHash,heroApproved:false};
}
await fs.writeFile('lib/media-manifest.json',JSON.stringify(manifest,null,2));
const rows=Object.values(manifest);
console.log(JSON.stringify({pieces:rows.length,originalBytes:rows.reduce((s,r)=>s+r.originalBytes,0),card640Bytes:rows.reduce((s,r)=>s+r.renditions[1].bytes,0)}));







