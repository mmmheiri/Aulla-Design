/* Push only. Never cache checkout, admin, requests or customer information. */
self.addEventListener('push',event=>{
 let data={};try{data=event.data?.json()||{};}catch{}
 event.waitUntil(self.registration.showNotification(data.title||'Aulla Design',{body:data.body||'Open your workspace to review a new order.',icon:'/brand/aulla-app-192.png',badge:'/brand/aulla-app-192.png',tag:data.tag||'aulla-order',data:{url:'/admin/'}}));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();event.waitUntil((async()=>{const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});for(const client of windows){if(new URL(client.url).origin===self.location.origin){await client.navigate('/admin/');return client.focus();}}return self.clients.openWindow('/admin/');})());
});
