import {job} from '../../../../lib/server/http.mjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request:Request){return job(request);}
