/* Lutz ärger dich nicht – Service Worker
   Spiel-Seite: immer zuerst aus dem Netz (→ Updates sofort), offline aus dem Speicher.
   Bilder/Icons/mqtt.js: aus dem Speicher, im Hintergrund aktualisiert. */
const CACHE='lutz-v1';
const CORE=['./','manifest.webmanifest','icon-192.png','icon-512.png','apple-touch-icon.png'];
self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).catch(()=>{}));
  self.skipWaiting();
});
self.addEventListener('activate',e=>{
  e.waitUntil((async()=>{
    for(const k of await caches.keys()) if(k!==CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});
self.addEventListener('fetch',e=>{
  const req=e.request; if(req.method!=='GET') return;
  const url=new URL(req.url);
  const same=url.origin===self.location.origin;
  const isPage=req.mode==='navigate'||(same&&(url.pathname.endsWith('/')||url.pathname.endsWith('/index.html')));
  if(isPage){
    // Netz zuerst – so kommt jede neue Version sofort an
    e.respondWith((async()=>{
      try{
        const r=await fetch(req,{cache:'no-store'});
        if(r&&r.ok&&req.mode==='navigate'){ const c=await caches.open(CACHE); c.put('./',r.clone()); }
        return r;
      }catch(err){
        const c=await caches.match('./'); if(c) return c;
        throw err;
      }
    })());
    return;
  }
  const lib=/\/mqtt@[\d.]+\/dist\/mqtt\.min\.js$/.test(url.pathname);
  if(same||lib){
    e.respondWith((async()=>{
      const c=await caches.open(CACHE);
      const hit=await c.match(req);
      const net=fetch(req).then(r=>{ if(r&&(r.ok||r.type==='opaque')) c.put(req,r.clone()); return r; }).catch(()=>null);
      return hit||(await net)||Response.error();
    })());
  }
  // alles andere (Statistik, Übersetzung, Server) normal durchlassen
});
