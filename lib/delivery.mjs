import countries from './gulf-countries.json' with {type:'json'};
const clean=(value,max,required=true)=>{if(typeof value!=='string'||value.trim().length>(max)|| (required&&!value.trim()))throw new Error('Complete the delivery details');return value.trim();};
export function phoneDigits(value,dial,digits){let number=String(value).replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-1632)).replace(/[۰-۹]/g,c=>String(c.charCodeAt(0)-1776)).replace(/[^0-9]/g,'');if(number.startsWith('00'+dial))number=number.slice(dial.length+2);else if(number.length===digits+dial.length&&number.startsWith(dial))number=number.slice(dial.length);return number;}
export function validateDelivery(input){
 if(!input||typeof input!=='object')throw new Error('Complete the delivery details');
 const country=countries.find(c=>c.code===input.country),phoneCountry=countries.find(c=>c.code===input.phoneCountry);
 if(!country||!phoneCountry||!country.regions.some(r=>r[0]===input.region))throw new Error('Choose a Gulf country and its delivery region');
 const phone=phoneDigits(clean(input.phone,30),phoneCountry.dial,phoneCountry.digits).replace(/^0/,'');
 if(!new RegExp('^[1-9][0-9]{'+(phoneCountry.digits-1)+'}$').test(phone))throw new Error('Check the mobile number for the selected country');
 if(!['house','apartment','office'].includes(input.type))throw new Error('Choose the address type');
 const result={country:country.code,region:input.region,firstName:clean(input.firstName,70),lastName:clean(input.lastName||'',70,false),phoneCountry:phoneCountry.code,phone:'+'+phoneCountry.dial+phone,type:input.type,city:clean(input.city,80),area:clean(input.area,100),street:clean(input.street,120),building:clean(input.building,80),notes:clean(input.notes||'',200,false)};
 if(input.location!=null){const {lat,lng}=input.location;if(typeof lat!=='number'||typeof lng!=='number'||!Number.isFinite(lat)||!Number.isFinite(lng)||lat<12||lat>33.5||lng<34||lng>60)throw new Error('Choose a delivery location within the Gulf');result.location={lat:Math.round(lat*1e6)/1e6,lng:Math.round(lng*1e6)/1e6};}
 return result;
}
export function deliveryText(address,locale='en'){
 try{const value=JSON.parse(address),country=countries.find(c=>c.code===value.country),region=country?.regions.find(r=>r[0]===value.region);if(!country||!region)return address;return [value.firstName+' '+value.lastName,value.phone,country[locale==='ar'?'ar':'en'],region[locale==='ar'?1:2],value.city,value.area,value.street,value.building,value.notes,value.location?value.location.lat+', '+value.location.lng:''].filter(Boolean).join('\n');}catch{return address;}
}
