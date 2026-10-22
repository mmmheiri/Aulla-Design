// Run locally. Writes only a gitignored file; never prints credentials.
import {mkdir,writeFile} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {passwordHash} from '../../lib/server/security.mjs';
const password=randomBytes(24).toString('base64url');
const secret=Array.from(randomBytes(32),b=>'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'[b%32]).join('');
await mkdir('.data',{recursive:true});
await writeFile('.data/admin-setup.env',`# Private local setup. Keep outside version control. Copy hash/secret to .env.local.\n# Enrol secret in your authenticator, then store password in your password manager.\nADMIN_PASSWORD_HASH=${passwordHash(password)}\nADMIN_TOTP_SECRET=${secret}\n# Initial password: ${password}\n`,{flag:'wx',mode:0o600});
console.log('Created private .data/admin-setup.env. Existing setup is never overwritten.');
