import {readFile,writeFile,rename,unlink} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {validateSizeCharts} from '../lib/size-chart-validation.ts';

const [mode,file,...extra]=process.argv.slice(2);
if(!['check','import'].includes(mode)||!file||extra.length){
 console.error('Usage: npm run sizes:check -- chart.json OR npm run sizes:import -- chart.json');process.exitCode=1;
}else{
 try{
  const {products}=JSON.parse(await readFile(new URL('../docs/source-import/products.json',import.meta.url),'utf8'));
  const input=JSON.parse(await readFile(file,'utf8'));
  const result=validateSizeCharts(input,products);
  if(!result.ok)throw new Error(result.errors.join('\n'));
  const count=Object.keys(result.charts).length;
  if(mode==='import'){
   if(!count)throw new Error('No approved charts supplied. Existing charts were not changed.');
   const destination=new URL('../lib/size-charts.json',import.meta.url);
   const existing=validateSizeCharts(JSON.parse(await readFile(destination,'utf8')),products);
   if(!existing.ok)throw new Error('Current chart file is invalid. Repair it before importing.');
   const merged={...existing.charts,...result.charts};
   const temporary=fileURLToPath(destination)+`.${process.pid}.tmp`;
   try{
    await writeFile(temporary,JSON.stringify(merged,null,2)+'\n',{flag:'wx'});
    await rename(temporary,destination);
   }finally{await unlink(temporary).catch(()=>{});}
   console.log(`Imported ${count} approved Aulla chart(s); other product charts preserved. Local source updated. Rebuild before release.`);
  }else console.log(`Valid: ${count} approved chart(s). No files changed.`);
 }catch(error){console.error(error.message);process.exitCode=1;}
}
