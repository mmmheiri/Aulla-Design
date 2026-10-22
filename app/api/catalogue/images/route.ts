import {randomUUID} from 'node:crypto';
import {database,run} from '../../../../lib/server/db.mjs';
import {guarded,response} from '../../../../lib/server/http.mjs';
import {requireAdmin,originCheck,rateLimit,fail} from '../../../../lib/server/security.mjs';
export const runtime='nodejs';
export async function POST(request:Request){return guarded(async()=>{
 const db=database();originCheck(request);await requireAdmin(db,request);await rateLimit(db,'image-upload',30);
 const reader=request.body?.getReader();if(!reader)fail('Choose an image');
 const chunks:Uint8Array[]=[];let length=0;
 for(;;){const {done,value}=await reader!.read();if(done)break;length+=value.byteLength;if(length>4*1024*1024){await reader!.cancel();fail('Image must be 4 MB or smaller',413);}chunks.push(value);}
 const bytes=Buffer.concat(chunks),hex=bytes.subarray(0,12).toString('hex');
 const mime=hex.startsWith('ffd8ff')?'image/jpeg':hex.startsWith('89504e470d0a1a0a')?'image/png':bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP'?'image/webp':null;
 if(!mime||bytes.length<32)fail('Only JPG, PNG and WebP images are supported');
 const id=randomUUID();await run(db,'INSERT INTO catalogue_images VALUES(?,?,?,?)',[id,mime,new Uint8Array(bytes),Date.now()]);
 return response({url:'/api/catalogue/images/'+id+'/'},201);
});}
