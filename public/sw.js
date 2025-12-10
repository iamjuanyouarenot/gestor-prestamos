self.addEventListener('install', function (event) {
    self.skipWaiting()
})

self.addEventListener('activate', function (event) {
    event.waitUntil(self.clients.claim())
})

self.addEventListener('push', function (event) {
    if (event.data) {
        const data = event.data.json()
        const options = {
            body: data.body,
            icon: '/icon.png', // Ensure this exists or use a placeholder
            badge: '/badge.png', // Ensure this exists or use a placeholder
            vibrate: [100, 50, 100],
            data: {
                dateOfArrival: Date.now(),
                primaryKey: '2'
            }
        }
        event.waitUntil(
            self.registration.showNotification(data.title || 'Gestor de Préstamos', options)
        )
    }
})
