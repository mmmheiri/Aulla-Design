import './env.mjs';
import {testOnly} from '../../lib/server/security.mjs';
import {readFile} from 'node:fs/promises';
import {database,migrate,run,transaction} from '../../lib/server/db.mjs';
import {tailoringSizes,isTailoredSize} from '../../lib/tailoring.mjs';
testOnly();const db=database();await migrate(db);
const {products}=JSON.parse(await readFile('docs/source-import/products.json','utf8'));
const {samples}=JSON.parse(await readFile('docs/source-import/fabric-colours.json','utf8'));
await transaction(db,async tx=>{for(const p of products){
 const choices=[...p.optionGroups.filter(g=>g.name!=='Size').map(g=>({id:g.id,required:true,options:g.values.map(value=>({value,price_fils:0}))})),...p.addonGroups.map(g=>({id:g.id,required:!!g.required,options:g.id==='sgsgty6umuqzu2p8'?samples.map(c=>({value:String(c.code),price_fils:0})):g.options.map(o=>({value:o.name,price_fils:Math.round((o.price||0)*100)}))}))];
 await run(tx,'INSERT OR IGNORE INTO products(id,name,choices) VALUES(?,?,?)',[p.id,p.name,JSON.stringify(choices)]);
 const sizes=tailoringSizes(p.optionGroups.find(g=>g.name==='Size')?.values||['—']);
 for(const size of sizes)for(const kind of isTailoredSize(size)?['made_to_order']:['ready','made_to_order']){const id=p.id+':'+size+':'+kind;await run(tx,'INSERT OR IGNORE INTO variants VALUES(?,?,?,?,?,?)',[id,p.id,size,kind,Math.round((p.offers.lowPrice??p.offers.price??p.price)*100),kind==='ready'?3:21]);await run(tx,'INSERT OR IGNORE INTO stock VALUES(?,?)',[id,kind==='ready'?5:0]);}
 }
 // Six fictional products remain orderable in the test catalogue.
 for(let i=1;i<=6;i++){const id='demo-0'+i;await run(tx,'INSERT OR IGNORE INTO products(id,name) VALUES(?,?)',[id,'TEST '+id]);for(const size of ['50','52','54','56','58','60'])for(const kind of ['ready','made_to_order']){const v=id+':'+size+':'+kind;await run(tx,'INSERT OR IGNORE INTO variants VALUES(?,?,?,?,?,?)',[v,id,size,kind,[33000,38000,26000,28000,35000,31000][i-1],kind==='ready'?3:21]);await run(tx,'INSERT OR IGNORE INTO stock VALUES(?,?)',[v,i===4?0:5]);}}
});console.log('Test catalogue seeded; stock and lead times are fictional placeholders.');db.close();
