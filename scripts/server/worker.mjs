import './env.mjs';
import {database,migrate} from '../../lib/server/db.mjs';
import {reconcile} from '../../lib/server/payments.mjs';
import {housekeeping} from '../../lib/server/commerce.mjs';
import {drainOutbox} from '../../lib/server/notifications.mjs';
import {drainOwnerPush} from '../../lib/server/push.mjs';
import {testOnly} from '../../lib/server/security.mjs';
testOnly();const db=database();await migrate(db);await housekeeping(db);const checked=await reconcile(db);const notifications=await drainOutbox(db);const push=await drainOwnerPush(db);console.log({checked,notifications,push,mode:'test'});db.close();
