import {createRequire} from 'node:module';
import {readFile,mkdir} from 'node:fs/promises';
import {mkdirSync} from 'node:fs';
import {getDatabase} from '@netlify/database';
import {postgresAdapter} from './postgres.mjs';
let singleton;
export function database(){
 if(!singleton){
  if(process.env.AULLA_DATABASE_PROVIDER==='netlify'){singleton=postgresAdapter(getDatabase({connectionString:process.env.NETLIFY_DB_URL}).pool);return singleton;}
  const url=process.env.DATABASE_URL||'file:.data/aulla-test.db';
  const hosted=process.env.NETLIFY==='true'||!!process.env.LAMBDA_TASK_ROOT||process.env.AULLA_REVIEW_READ_ONLY==='true';
  if(hosted&&!/^(libsql|https):\/\//.test(url))throw Object.assign(new Error('Persistent review database is not configured'),{status:503});
  if(url.startsWith('file:'))mkdirSync('.data',{recursive:true});
  // Load the local SQLite driver only on the local path; hosted Postgres must not load a Windows binary.
  const {createClient}=createRequire(import.meta.url)('@libsql/client');
  singleton=createClient({url,authToken:process.env.DATABASE_AUTH_TOKEN});}
 return singleton;
}
export async function migrate(db=database()){
 if(db.dialect==='postgres'){
  if(process.env.NETLIFY==='true')throw new Error('Hosted schema changes must use deploy migrations');
  const migration=await readFile(new URL('../../netlify/database/migrations/202610230001_test_commerce.sql',import.meta.url),'utf8');
  return db.executeMultiple(migration.split('-- Public Aulla catalogue only;')[0]);
 }
 await mkdir('.data',{recursive:true});
 const sql=await readFile(new URL('../../db/001.sql',import.meta.url),'utf8');
 await db.executeMultiple(sql);
}
export async function transaction(db,fn){for(let attempt=0;;attempt++){const tx=await db.transaction('write');try{const result=await fn(tx);await tx.commit();return result;}catch(e){await tx.rollback();if(db.dialect==='postgres'&&['40001','40P01'].includes(e.code)&&attempt<3)continue;throw e;}finally{tx.close();}}}
export async function one(db,sql,args=[]){return (await db.execute({sql,args})).rows[0];}
export async function run(db,sql,args=[]){return db.execute({sql,args});}
