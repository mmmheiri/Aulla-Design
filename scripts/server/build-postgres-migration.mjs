// Generate the initial, not-yet-applied migration from repository-owned test fixtures.
// After first hosted deployment, add a NEW migration instead of running this again.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {tailoringSizes,isTailoredSize} from '../../lib/tailoring.mjs';
const products=JSON.parse(await readFile('docs/source-import/products.json','utf8')).products;
const samples=JSON.parse(await readFile('docs/source-import/fabric-colours.json','utf8')).samples;
let schema=(await readFile('db/001.sql','utf8')).replace('PRAGMA foreign_keys=ON;','').replaceAll(' BLOB ',' BYTEA ').replace(/\b(created_at|ship_at|reservation_expires|expires_at|last_checked|next_attempt|lease_until|blocked_until|window_start|updated_at) INTEGER/g,'$1 BIGINT');
const q=value=>typeof value==='number'?String(value):"'"+String(value).replaceAll("'","''")+"'";
const lines=[schema,'-- Public Aulla catalogue only; quantities and lead times are test placeholders.'];
for(const p of products){
 const choices=[...p.optionGroups.filter(g=>g.name!=='Size').map(g=>({id:g.id,required:true,options:g.values.map(value=>({value,price_fils:0}))})),...p.addonGroups.map(g=>({id:g.id,required:!!g.required,options:g.id==='sgsgty6umuqzu2p8'?samples.map(c=>({value:String(c.code),price_fils:0})):g.options.map(o=>({value:o.name,price_fils:Math.round((o.price||0)*100)}))}))];
 lines.push(`INSERT INTO products(id,name,choices) VALUES(${[p.id,p.name,JSON.stringify(choices)].map(q).join(',')}) ON CONFLICT DO NOTHING;`);
 for(const size of tailoringSizes(p.optionGroups.find(g=>g.name==='Size')?.values||['—']))for(const kind of isTailoredSize(size)?['made_to_order']:['ready','made_to_order']){const id=p.id+':'+size+':'+kind;lines.push(`INSERT INTO variants VALUES(${[id,p.id,size,kind,Math.round((p.offers.lowPrice??p.offers.price??p.price)*100),kind==='ready'?3:21].map(q).join(',')}) ON CONFLICT DO NOTHING;`,`INSERT INTO stock VALUES(${q(id)},${kind==='ready'?5:0}) ON CONFLICT DO NOTHING;`);}
}
await mkdir('netlify/database/migrations',{recursive:true});await writeFile('netlify/database/migrations/202610230001_test_commerce.sql',lines.join('\n'));
