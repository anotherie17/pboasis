// Service worker MabarKas — sederhana & aman.
// Hanya menyimpan (cache) aset app (HTML, JS, ikon, jspdf) di perangkat,
// supaya app bisa terbuka cepat / saat sinyal jelek. Data Supabase (supabase.co)
// SENGAJA tidak di-cache supaya angka selalu fresh dari server.
const CACHE = 'mabarkas-v1'

self.addEventListener('install', (e) => { self.skipWaiting() })

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys()
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    await self.clients.claim()
  })())
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  // Lewati semua yang bukan dari domain app (mis. API Supabase, font).
  if (url.origin !== self.location.origin) return

  // Navigasi halaman: coba jaringan dulu, kalau gagal pakai cache index.
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        const fresh = await fetch(req)
        const c = await caches.open(CACHE); c.put('/', fresh.clone())
        return fresh
      } catch {
        return (await caches.match('/')) || (await caches.match(req)) || Response.error()
      }
    })())
    return
  }

  // Aset statis: jaringan dulu, simpan ke cache; kalau offline pakai cache.
  e.respondWith((async () => {
    try {
      const fresh = await fetch(req)
      if (fresh && fresh.status === 200) { const c = await caches.open(CACHE); c.put(req, fresh.clone()) }
      return fresh
    } catch {
      const cached = await caches.match(req)
      return cached || Response.error()
    }
  })())
})
