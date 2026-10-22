import {createHash,createHmac,randomBytes,scryptSync,timingSafeEqual} from 'node:crypto';
import {one,run,transaction} from './db.mjs';
export const hash=value=>createHash('sha256').update(value).digest('hex');
export const token=()=>randomBytes(32).toString('hex');
export function equal(a,b){const x=Buffer.from(String(a)),y=Buffer.from(String(b));return x.length===y.length&&timingSafeEqual(x,y);}
export function fail(message,status=400){throw Object.assign(new Error(message),{status});}
export function testOnly(){if(process.env.AULLA_MODE&&process.env.AULLA_MODE!=='test')fail('Live mode is disabled',503);}
export function originCheck(req){if(req.headers.get('origin')!==new URL(process.env.AULLA_PUBLIC_ORIGIN||'http://127.0.0.1:8826').origin)fail('Invalid origin',403);}
export async function body(req){const reader=req.body?.getReader();if(!reader)return '';let size=0;const chunks=[];for(;;){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>65536){await reader.cancel();fail('Request too large',413);}chunks.push(Buffer.from(value));}return Buffer.concat(chunks).toString('utf8');}
export function json(text){try{return JSON.parse(text);}catch{fail('Invalid JSON');}}
export function passwordHash(password,salt=randomBytes(16).toString('hex')){if(password.length<16)fail('Password must contain at least 16 characters');return salt+':'+scryptSync(password,salt,64).toString('hex');}
function verifyPassword(password,stored){if(typeof password!=='string'||password.length>256||!stored)return false;const [salt,value]=stored.split(':');return !!salt&&!!value&&equal(scryptSync(password,salt,64).toString('hex'),value);}
export function totp(secret,step=Math.floor(Date.now()/30000)){
 if(!/^[A-Z2-7]{32,}$/.test(secret||''))fail('Admin 2FA is not configured',503);
 const bits=[...secret].map(x=>'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'.indexOf(x).toString(2).padStart(5,'0')).join('');const key=Buffer.from((bits.match(/.{8}/g)||[]).map(x=>parseInt(x,2)));const counter=Buffer.alloc(8);counter.writeBigUInt64BE(BigInt(step));const digest=createHmac('sha1',key).update(counter).digest();const offset=digest[19]&15;return String((digest.readUInt32BE(offset)&0x7fffffff)%1000000).padStart(6,'0');
}
export async function login(db,password,code){
 const stored=process.env.ADMIN_PASSWORD_HASH,secret=process.env.ADMIN_TOTP_SECRET;if(!stored||!secret)fail('Admin setup required',503);
 const now=Date.now();
 const result=await transaction(db,async tx=>{await run(tx,"INSERT OR IGNORE INTO auth_state(id) VALUES('owner')");const state=await one(tx,"SELECT * FROM auth_state WHERE id='owner'");if(Number(state.blocked_until)>now)return null;
 const step=Math.floor(now/30000),matched=[step-1,step,step+1].find(s=>s>Number(state.last_totp)&&equal(totp(secret,s),code));
 if(!verifyPassword(password,stored)||matched===undefined){const failures=Number(state.failures)+1;await run(tx,"UPDATE auth_state SET failures=?,blocked_until=? WHERE id='owner'",[failures,failures>=5?now+900000:0]);return null;}
 const value=token();await run(tx,"UPDATE auth_state SET failures=0,blocked_until=0,last_totp=? WHERE id='owner'",[matched]);await run(tx,'INSERT INTO admin_sessions VALUES(?,?,?)',[hash(value),now+3600000,now]);return value;});if(!result)fail('Invalid credentials or temporarily locked',401);return result;
}
export async function requireAdmin(db,req){const value=req.headers.get('cookie')?.match(/(?:^|;\s*)aulla_admin=([a-f0-9]{64})(?:;|$)/)?.[1];if(!value||!await one(db,'SELECT token_hash FROM admin_sessions WHERE token_hash=? AND expires_at>?',[hash(value),Date.now()]))fail('Authentication required',401);return 'owner';}
export async function rateLimit(db,key,limit=30){await transaction(db,async tx=>{const now=Date.now(),r=await one(tx,'SELECT * FROM rate_limits WHERE key=?',[key]);if(!r||now-Number(r.window_start)>60000)await run(tx,'INSERT OR REPLACE INTO rate_limits VALUES(?,?,1)',[key,now]);else {if(Number(r.count)>=limit)fail('Try again later',429);await run(tx,'UPDATE rate_limits SET count=count+1 WHERE key=?',[key]);}});}
export function verifyWebhook(raw,signature,ip,secret=process.env.ZIINA_WEBHOOK_SECRET){
 if(!['3.29.184.186','3.29.190.95','20.233.47.127','13.202.161.181'].includes(ip))fail('Webhook source rejected',403);
 if(!secret||! /^[a-f0-9]{64}$/i.test(signature||'')||!equal(createHmac('sha256',secret).update(raw).digest('hex'),signature.toLowerCase()))fail('Webhook signature rejected',401);
}
// The reverse proxy must strip client-supplied versions and inject both headers.
// Disabled until the owner configures and validates that private proxy boundary.
export function webhookIP(req){const secret=process.env.WEBHOOK_PROXY_SECRET;if(!secret||secret.length<32||!equal(req.headers.get('x-aulla-proxy-key')||'',secret))fail('Trusted webhook proxy not configured',403);return req.headers.get('x-aulla-client-ip')||'';}
