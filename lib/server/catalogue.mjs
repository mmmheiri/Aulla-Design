import {randomUUID} from 'node:crypto';
import snapshot from '../../docs/source-import/products.json' with {type:'json'};
import media from '../media-manifest.json' with {type:'json'};
import adjustments from '../catalogue-adjustments.json' with {type:'json'};
import {run,one,transaction} from './db.mjs';
import {fail} from './security.mjs';
import {audit} from './commerce.mjs';
import {tailoringSizes,isTailoredSize} from '../tailoring.mjs';

const badges=new Set(['popular','bestseller','new']);
const text=(value,max)=>typeof value==='string'&&value.trim().length>0&&value.length<=max;
export function validateCatalogue(input){
 if(!input||!text(input.nameAr,100)||!text(input.nameEn,100)||typeof input.description!=='string'||input.description.length>3000)fail('Enter Arabic and English names and a short description');
 if(!Number.isSafeInteger(input.priceFils)||input.priceFils<200||input.priceFils>10000000)fail('Invalid price');
 if(!Array.isArray(input.sizes)||input.sizes.length>12||!input.sizes.every(s=>typeof s==='string'&&/^\d{2,3}$/.test(s))||new Set(input.sizes).size!==input.sizes.length)fail('Invalid sizes');
 if(!Array.isArray(input.images)||input.images.length<1||input.images.length>8||!input.images.every(url=>typeof url==='string'&&/^\/(?:api\/catalogue\/images\/[a-f0-9-]{36}\/|(?:media|source-images|source-import|catalogue-2d|catalogue-transparent)\/[a-zA-Z0-9_./-]+)$/.test(url)&&!url.includes('..')))fail('Choose uploaded or existing local product images');
 if(!Array.isArray(input.badges)||input.badges.length>2||!input.badges.every(b=>badges.has(b))||new Set(input.badges).size!==input.badges.length)fail('Invalid badges');
 if(typeof input.published!=='boolean'||!Number.isSafeInteger(input.readyLead)||input.readyLead<0||input.readyLead>180||!Number.isSafeInteger(input.customLead)||input.customLead<1||input.customLead>180)fail('Invalid publication or lead time');
 if(!Array.isArray(input.inventory)||input.inventory.length>24||!input.inventory.every(v=>input.sizes.includes(v.size)&&Number.isSafeInteger(v.quantity)&&v.quantity>=0&&v.quantity<=100000))fail('Invalid inventory');
 if(new Set(input.inventory.map(v=>v.size)).size!==input.inventory.length||input.sizes.some(s=>!input.inventory.some(v=>v.size===s)))fail('Set inventory for every size');
 if(!Number.isSafeInteger(input.lowStockThreshold)||input.lowStockThreshold<0||input.lowStockThreshold>100)fail('Invalid low stock threshold');
 const compareAtFils=input.compareAtFils||0;if(!Number.isSafeInteger(compareAtFils)||compareAtFils<0||compareAtFils>10000000||(compareAtFils&&compareAtFils<=input.priceFils)||input.soldOut!==undefined&&typeof input.soldOut!=='boolean')fail('Invalid availability or comparison price');
 return {nameAr:input.nameAr.trim(),nameEn:input.nameEn.trim(),description:input.description.trim(),priceFils:input.priceFils,compareAtFils,soldOut:input.soldOut===true,sizes:input.sizes,images:input.images,badges:input.badges,published:input.published,readyLead:input.readyLead,customLead:input.customLead,inventory:input.inventory.map(v=>({size:v.size,quantity:v.quantity})),lowStockThreshold:input.lowStockThreshold};
}
export async function catalogueRecords(db,admin=false){
 const entries=(await run(db,'SELECT * FROM catalogue_entries')).rows;
 const variants=(await run(db,"SELECT v.*,s.quantity,COALESCE((SELECT SUM(r.quantity) FROM reservations r WHERE r.variant_id=v.id AND r.expires_at>?),0) AS reserved FROM variants v LEFT JOIN stock s ON s.variant_id=v.id",[Date.now()])).rows;
 const index=new Map(entries.map(e=>[e.product_id,e]));
 const ids=[...entries.map(e=>e.product_id).filter(id=>!snapshot.products.some(p=>p.id===id)),...snapshot.products.map(p=>p.id)];
 const result=[];
 for(const id of ids){
  const raw=snapshot.products.find(p=>p.id===id),adjustment=adjustments[id],original=raw&&adjustment?{...raw,price:adjustment.price,offers:{price:adjustment.price},soldOut:adjustment.soldOut,compareAtPrice:adjustment.compareAtPrice}:raw,entry=index.get(id),data=entry?JSON.parse(entry.payload):null;
  if(!admin&&entry&&!Number(entry.published))continue;
  const rows=variants.filter(v=>v.product_id===id),ready=rows.filter(v=>v.kind==='ready');
  const sizes=data?.sizes||original?.optionGroups.find(g=>g.name==='Size')?.values.filter(v=>/^\d+$/.test(v))||[];
  const inventory=sizes.map(size=>{const v=ready.find(v=>v.size===size);return {size,quantity:Number(v?.quantity||0),reserved:Number(v?.reserved||0),available:Math.max(0,Number(v?.quantity||0)-Number(v?.reserved||0))};});
  const totalAvailable=inventory.reduce((n,v)=>n+v.available,0),threshold=data?.lowStockThreshold||0;
  const base=original||{id,url:'/collection/'+id+'/',name:'',description:'',price:0,offers:{},images:[],optionGroups:[],addonGroups:[],warnings:[]};
  const custom=base.optionGroups.find(g=>g.name==='Size')?.values.filter(isTailoredSize)||[];
  const product={...base,...(data?{managed:true,name:data.nameAr+' | '+data.nameEn,description:data.description,price:data.priceFils/100,offers:{price:data.priceFils/100},warnings:[],images:data.images.map(url=>({url,local:url})),optionGroups:[...base.optionGroups.filter(g=>g.name!=='Size'),{id:base.optionGroups.find(g=>g.name==='Size')?.id||'managed-size',name:'Size',values:tailoringSizes([...data.sizes,...custom])}]}:{}),catalogueBadges:[...(data?.badges||[]),...(threshold>0&&totalAvailable>0&&totalAvailable<=threshold?['low-stock']:[])],inventory};
  product.soldOut=data?.soldOut??base.soldOut??false;product.compareAtPrice=data?(data.compareAtFils?data.compareAtFils/100:undefined):base.compareAtPrice;
  result.push(admin?{product,revision:Number(entry?.revision||0),published:entry?!!Number(entry.published):true,form:{...(data||{nameAr:base.name.split('|')[0].trim(),nameEn:(base.name.split('|')[1]||base.name).trim(),description:base.description,priceFils:Number(rows[0]?.price_fils||Math.round((base.offers?.lowPrice??base.offers?.price??base.price)*100)),sizes,images:[media[id]?.renditions[1]?.src,...base.images.map(i=>i.local)].filter(Boolean).slice(0,8),badges:[],published:true,readyLead:Number(ready[0]?.lead_days??3),customLead:Number(rows.find(v=>v.kind==='made_to_order')?.lead_days??21),lowStockThreshold:0,soldOut:base.soldOut??false,compareAtFils:Math.round((base.compareAtPrice||0)*100)}),inventory:inventory.map(v=>({size:v.size,quantity:v.quantity}))}}:product);
 }
 return result;
}
export async function saveCatalogue(db,input){
 const value=validateCatalogue(input),id=input.id||'abaya-'+randomUUID();
 if(!/^(?:[a-zA-Z0-9]{10,40}|abaya-[a-f0-9-]{36})$/.test(id)||!Number.isSafeInteger(input.revision)||input.revision<0)fail('Invalid product reference');
 return transaction(db,async tx=>{
  const current=await one(tx,'SELECT * FROM catalogue_entries WHERE product_id=?',[id]);
  if(Number(current?.revision||0)!==input.revision)fail('This piece changed. Reload before saving',409);
  const base=await one(tx,'SELECT * FROM products WHERE id=?',[id]);
  if(!base&&input.id)fail('Product not found',404);
  for(const url of value.images.filter(url=>url.startsWith('/api/catalogue/images/'))){if(!await one(tx,'SELECT id FROM catalogue_images WHERE id=?',[url.split('/')[4]]))fail('Image not found');}
  if(!base)await run(tx,'INSERT INTO products(id,name,choices) VALUES(?,?,?)',[id,value.nameAr+' | '+value.nameEn,'[]']);
  else await run(tx,'UPDATE products SET name=? WHERE id=?',[value.nameAr+' | '+value.nameEn,id]);
  const legacy=snapshot.products.find(p=>p.id===id)?.optionGroups.find(g=>g.name==='Size')?.values.filter(isTailoredSize)||[];
  for(const size of tailoringSizes([...value.sizes,...legacy]))for(const kind of isTailoredSize(size)?['made_to_order']:['ready','made_to_order']){
   const variant=id+':'+size+':'+kind,lead=kind==='ready'?value.readyLead:value.customLead;
   const exists=await one(tx,'SELECT id FROM variants WHERE id=?',[variant]);
   if(!exists){await run(tx,'INSERT INTO variants VALUES(?,?,?,?,?,?)',[variant,id,size,kind,value.priceFils,lead]);await run(tx,'INSERT INTO stock VALUES(?,?)',[variant,0]);}
   else await run(tx,'UPDATE variants SET price_fils=?,lead_days=? WHERE id=?',[value.priceFils,lead,variant]);
   if(kind==='ready'){
    const quantity=value.inventory.find(v=>v.size===size)?.quantity||0;
    const held=await one(tx,'SELECT COALESCE(SUM(quantity),0) AS held FROM reservations WHERE variant_id=? AND expires_at>?',[variant,Date.now()]);
    if(quantity<Number(held.held))fail('Stock cannot be lower than active reservations',409);
    await run(tx,'UPDATE stock SET quantity=? WHERE variant_id=?',[quantity,variant]);
   }
  }
  const revision=input.revision+1;
  if(current)await run(tx,'UPDATE catalogue_entries SET payload=?,published=?,revision=?,updated_at=? WHERE product_id=?',[JSON.stringify(value),value.published?1:0,revision,Date.now(),id]);
  else await run(tx,'INSERT INTO catalogue_entries VALUES(?,?,?,?,?)',[id,JSON.stringify(value),value.published?1:0,revision,Date.now()]);
  await audit(tx,null,base?'catalogue_updated':'catalogue_created',{product:id,revision,published:value.published},'owner');
  return {id,revision};
 });
}
