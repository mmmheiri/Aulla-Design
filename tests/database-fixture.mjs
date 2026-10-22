import {createClient} from '@libsql/client';
import {getDatabase} from '@netlify/database';
import {postgresAdapter} from '../lib/server/postgres.mjs';
export async function testDatabase(t){
 if(process.env.TEST_DATABASE_PROVIDER!=='postgres'){const db=createClient({url:':memory:'});t.after(()=>db.close());return db;}
 const {NetlifyDB}=await import('@netlify/database-dev');const server=new NetlifyDB();const connectionString=await server.start();// PGlite has a single backend session. Never interleave transactions through its wire multiplexer.
 const pool=getDatabase({connectionString}).pool;pool.options.max=1;const db=postgresAdapter(pool);t.after(async()=>{await db.close();await server.stop();});return db;
}
