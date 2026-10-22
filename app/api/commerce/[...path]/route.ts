import {after} from 'next/server';
import {database} from '../../../../lib/server/db.mjs';
import {drainOwnerPush} from '../../../../lib/server/push.mjs';
import {handle} from '../../../../lib/server/http.mjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
type Context={params:Promise<{path:string[]}>};
export async function GET(request:Request,{params}:Context){return handle(request,(await params).path.join('/'));}
export async function POST(request:Request,{params}:Context){const path=(await params).path.join('/'),response=await handle(request,path);if(path==='orders'&&response.ok)after(async()=>{try{await drainOwnerPush(database());}catch{console.error('Order alert delivery deferred; retry worker required');}});return response;}
