import {database,one} from '../../../../../lib/server/db.mjs';
export const runtime='nodejs';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;if(!/^[a-f0-9-]{36}$/.test(id))return new Response(null,{status:404});
 const row=await one(database(),'SELECT mime,bytes FROM catalogue_images WHERE id=?',[id]);
 if(!row)return new Response(null,{status:404});
 return new Response(row.bytes as BodyInit,{headers:{'Content-Type':String(row.mime),'X-Content-Type-Options':'nosniff','Cache-Control':'public, max-age=31536000, immutable'}});
}
