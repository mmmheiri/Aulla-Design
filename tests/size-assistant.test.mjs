import {test} from 'node:test';
import assert from 'node:assert/strict';
import {chartIsReady,checkKnownSize,compareGarmentSize} from '../lib/size-assistant.ts';
import {validateSizeCharts} from '../lib/size-chart-validation.ts';
import {mkdtemp,writeFile,readFile,unlink,rmdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';

// Fictional test ranges only; none are loaded into the storefront config.
const chart={approved:true,approvedBy:'QA fixture',version:'fixture-v1',unit:'cm',basis:'flat-garment',rows:[
 {size:'54',ranges:{length:{min:130,max:140},chest:{min:50,max:55},sleeve:{min:55,max:60},forearm:{min:18,max:22}}},
 {size:'56',ranges:{length:{min:140,max:150},chest:{min:53,max:58},sleeve:{min:58,max:63},forearm:{min:20,max:24}}}
]};
const measurements={length:135,chest:52,sleeve:56,forearm:19};
test('unapproved, missing or incomplete charts cannot produce a recommendation',()=>{
 for(const c of [undefined,{...chart,approved:false},{...chart,unit:null},{...chart,approvedBy:''},{...chart,rows:[]},{...chart,rows:[{size:'54',ranges:{}}]}]){
  assert.equal(chartIsReady(c),false);assert.equal(compareGarmentSize(c,['54'],measurements,'cm').status,'unavailable');
 }
});
test('all four garment dimensions and product availability must match',()=>{
 assert.deepEqual(compareGarmentSize(chart,['54','56'],measurements,'cm'),{status:'matches',sizes:['54']});
 assert.equal(compareGarmentSize(chart,['56'],measurements,'cm').status,'no-match');
 assert.equal(compareGarmentSize(chart,['54'],{...measurements,forearm:30},'cm').status,'no-match');
 assert.equal(compareGarmentSize(chart,['54'],{...measurements,length:100},'cm').status,'no-match');
});
test('unit conversion preserves matches in either direction',()=>{
 const inches=Object.fromEntries(Object.entries(measurements).map(([k,v])=>[k,v/2.54]));
 assert.deepEqual(compareGarmentSize(chart,['54'],inches,'inch').sizes,['54']);
 const inchChart={...chart,unit:'inch',rows:chart.rows.map(r=>({...r,ranges:Object.fromEntries(Object.entries(r.ranges).map(([k,v])=>[k,{min:v.min/2.54,max:v.max/2.54}]))}))};
 assert.deepEqual(compareGarmentSize(inchChart,['54'],measurements,'cm').sizes,['54']);
});
test('invalid measurements and units cannot yield a size',()=>{
 for(const v of [0,-1,NaN,Infinity,undefined])assert.equal(compareGarmentSize(chart,['54'],{...measurements,length:v},'cm').status,'invalid');
 assert.equal(compareGarmentSize(chart,['54'],measurements,'unknown').status,'invalid');
});
test('ambiguous boundary matches stay explicit rather than forcing a size',()=>{
 assert.deepEqual(compareGarmentSize(chart,['54','56'],{length:140,chest:54,sleeve:59,forearm:21},'cm').sizes,['54','56']);
});
test('malformed chart ranges and duplicate sizes fail closed',()=>{
 assert.equal(chartIsReady({...chart,rows:[chart.rows[0],chart.rows[0]]}),false);
 assert.equal(chartIsReady({...chart,rows:[{...chart.rows[0],ranges:{...chart.rows[0].ranges,length:{min:200,max:100}}}]}),false);
});
test('known-size checking is exact availability, with no inferred adjacent size',()=>{
 assert.equal(checkKnownSize(['52','54'],'54'),'available');
 assert.equal(checkKnownSize(['52','54'],'56'),'unavailable');
 assert.equal(checkKnownSize(['52','54'],''),'empty');
});
test('untrusted chart JSON is rejected without throwing or producing a recommendation',()=>{
 for(const invalid of [null,5,[],{}, {...chart,approvedBy:4},{...chart,rows:[null]},{...chart,rows:[{size:54,ranges:{}}]}]){
  assert.equal(chartIsReady(invalid),false);
  assert.equal(compareGarmentSize(invalid,['54'],measurements,'cm').status,'unavailable');
 }
});
const products=[{id:'qa-piece',optionGroups:[{name:'Size',values:['54','56']}]}];
test('native chart activation validates product and offered sizes; an invalid batch activates nothing',()=>{
 assert.deepEqual(validateSizeCharts({'qa-piece':chart},products),{ok:true,errors:[],charts:{'qa-piece':chart}});
 for(const batch of [null,[],{'unknown':chart},{'qa-piece':{...chart,approved:false}},{'qa-piece':{...chart,rows:[{...chart.rows[0],size:'60'}]}},{'qa-piece':chart,'unknown':chart}]){
  const result=validateSizeCharts(batch,products);assert.equal(result.ok,false);assert.deepEqual(result.charts,{});assert.ok(result.errors.length);
 }
});
test('chart CLI validates a reviewed fixture without writes and rejects incomplete activation',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'aulla-size-chart-'));
 const fixture=join(directory,'chart.json'),active=new URL('../lib/size-charts.json',import.meta.url);
 const before=await readFile(active,'utf8');
 try{
  await writeFile(fixture,JSON.stringify({AgSCVfoKPto5gvZLaIXS:chart}));
  const valid=spawnSync(process.execPath,['--experimental-strip-types','scripts/size-charts.mjs','check',fixture],{encoding:'utf8'});
  assert.equal(valid.status,0,valid.stderr);assert.match(valid.stdout,/Valid: 1 approved chart/);
  await writeFile(fixture,JSON.stringify({AgSCVfoKPto5gvZLaIXS:{...chart,approved:false}}));
  const invalid=spawnSync(process.execPath,['--experimental-strip-types','scripts/size-charts.mjs','import',fixture],{encoding:'utf8'});
  assert.equal(invalid.status,1);assert.match(invalid.stderr,/explicit approval/);
  assert.equal(await readFile(active,'utf8'),before);
 }finally{await unlink(fixture).catch(()=>{});await rmdir(directory);}
});
