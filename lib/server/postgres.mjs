/** SQL comes only from repository constants. Values always stay parameterized. */
export function postgresSQL(input){
 let sql=input.trim(),ignore=/^INSERT OR IGNORE INTO /i.test(sql);
 sql=sql.replace(/^INSERT OR IGNORE INTO /i,'INSERT INTO ');
 if(/^INSERT OR REPLACE INTO rate_limits /i.test(sql))sql=sql.replace(/^INSERT OR REPLACE INTO /i,'INSERT INTO ')+' ON CONFLICT(key) DO UPDATE SET window_start=EXCLUDED.window_start,count=EXCLUDED.count';
 if(ignore)sql+=' ON CONFLICT DO NOTHING';
 let quoted=false,number=0,result='';
 for(let i=0;i<sql.length;i++){
  const c=sql[i];if(c==="'"){if(quoted&&sql[i+1]==="'"){result+="''";i++;continue;}quoted=!quoted;}
  result+=c==='?'&&!quoted?'$'+(++number):c;
 }
 return result;
}
export function postgresAdapter(pool){
 const wrap=client=>({dialect:'postgres',async execute(query){
  const sql=typeof query==='string'?query:query.sql,args=typeof query==='string'?[]:query.args||[];
  const result=await client.query(postgresSQL(sql),args.map(value=>value instanceof Uint8Array?Buffer.from(value):value));
  // pg returns bigint aggregates/timestamps as strings; convert only typed integer columns.
  const bigint=result.fields?.filter(field=>field.dataTypeID===20).map(field=>field.name)||[];
  for(const row of result.rows)for(const key of bigint){if(row[key]!==null){const n=Number(row[key]);if(!Number.isSafeInteger(n))throw new Error('Integer out of supported range');row[key]=n;}}
  return {rows:result.rows,rowsAffected:result.rowCount||0};
 }});
 return {...wrap(pool),async executeMultiple(sql){return pool.query(sql);},async transaction(){
  const client=await pool.connect();try{await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');}catch(e){client.release();throw e;}
  return {...wrap(client),commit:()=>client.query('COMMIT'),rollback:()=>client.query('ROLLBACK'),close:()=>client.release()};
 },close:()=>pool.end()};
}
