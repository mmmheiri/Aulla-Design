import {randomUUID} from 'node:crypto';
import {one,run,transaction} from './db.mjs';
import {fail,testOnly} from './security.mjs';
// No real recipient delivery supported. Capture is local; Mailtrap uses its sandbox API only.
export async function sandboxEmail(payload,key,fetcher=fetch){testOnly();const provider=process.env.EMAIL_PROVIDER||'capture';if(provider==='capture')return;
 if(provider!=='mailtrap_sandbox')fail('Only capture or Mailtrap sandbox is allowed',503);
 if(process.env.MAILTRAP_FORWARDING_DISABLED!=='true')fail('Confirm sandbox forwarding is disabled first',503);
 const inbox=process.env.MAILTRAP_INBOX_ID,token=process.env.MAILTRAP_API_TOKEN;if(!/^\d+$/.test(inbox||'')||!token||!process.env.OWNER_NOTIFICATION_EMAIL)fail('Sandbox email setup required',503);
 const to=payload.recipients.map(r=>({email:r==='owner'?process.env.OWNER_NOTIFICATION_EMAIL:payload.customer}));
 const res=await fetcher('https://sandbox.api.mailtrap.io/api/send/'+inbox,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({from:{email:'test@aulla.example',name:'Aulla TEST'},to,subject:'[TEST] '+payload.event,text:'Test order '+payload.order+' — '+payload.event,headers:{'X-Aulla-Event-Key':key}}),signal:AbortSignal.timeout(10000)});if(!res.ok)fail('Sandbox email provider unavailable',502);
}
export async function drainOutbox(db,send=sandboxEmail){let processed=0;
 for(let i=0;i<50;i++){
 const item=await transaction(db,async tx=>{const r=await one(tx,"SELECT * FROM notifications_outbox WHERE status<>'sent' AND attempts<8 AND next_attempt<=? AND lease_until<=? ORDER BY next_attempt LIMIT 1",[Date.now(),Date.now()]);if(!r)return null;const lease=randomUUID();await run(tx,'UPDATE notifications_outbox SET lease_until=?,lease_token=?,attempts=attempts+1 WHERE id=?',[Date.now()+60000,lease,r.id]);return {...r,lease};});if(!item)break;
 try{await send(JSON.parse(item.payload),item.order_id+':'+item.event);await run(db,"UPDATE notifications_outbox SET status='sent',lease_until=0,last_error=NULL WHERE id=? AND lease_token=?",[item.id,item.lease]);}catch{await run(db,"UPDATE notifications_outbox SET status='failed',lease_until=0,last_error='sandbox_provider_unavailable',next_attempt=? WHERE id=? AND lease_token=?",[Date.now()+Math.min(3600000,30000*2**Number(item.attempts)),item.id,item.lease]);}processed++;
 }return processed;
}
