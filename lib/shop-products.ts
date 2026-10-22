import {catalogue,type Product} from './catalog';
import {sourceProducts,sourceName,sourcePrice,type SourceProduct} from './source-catalogue';
import colours from '../docs/source-import/fabric-colours.json';
import {tailoringSizeGroup} from './tailoring.mjs';
// Stock is a local preview quantity cap, never a statement of live inventory.
export const mapShopProducts = (pieces:SourceProduct[]):Product[] => [...catalogue,...pieces.map(p=>({
  id:p.id,name:[sourceName(p,'ar'),sourceName(p,'en')] as [string,string],
  price:sourcePrice(p),stock:p.soldOut?0:10,soldOut:p.soldOut,tone:'ink',group:'daily' as const,source:true,
  ...(p.managed?{image:p.images[0]?.local||undefined}:{}),
  choicePrices:Object.fromEntries(p.addonGroups.map(g=>[g.id,Object.fromEntries(g.options.map(o=>[o.name,o.price||0]))])),
  // Keep old unstructured selections restorable; new PDPs require an explicit choice.
  sizes:[...(!p.optionGroups.some(g=>g.name==='Size')?['—']:[]),...tailoringSizeGroup(p).values],
  choices:[...p.optionGroups.filter(g=>g.name!=='Size').map(g=>({id:g.id,required:true,values:g.values})),...p.addonGroups.map(g=>({id:g.id,required:!!g.required,values:g.id==='sgsgty6umuqzu2p8'?colours.samples.map(s=>String(s.code)):g.options.map(o=>o.name)}))]
}))];
export const shopProducts=mapShopProducts(sourceProducts);
