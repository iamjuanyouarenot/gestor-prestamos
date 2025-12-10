self.addEventListener('install', function (event) {
    self.skipWaiting()
})

self.addEventListener('activate', function (event) {
    event.waitUntil(self.clients.claim())
})

self.addEventListener('push', function (event) {
    if (event.data) {
        let data;
        let title = 'Gestor de Préstamos';
        let body = 'Tienes una notificación nueva.';

        try {
            // Intenta analizar el payload como JSON
            data = event.data.json();
            title = data.title || title;
            body = data.body || body;
        } catch (e) {
            // Si falla (no es JSON), usa el texto sin procesar como cuerpo.
            body = event.data.text();
            console.warn('Push payload no era JSON. Usando texto sin formato.', body);
        }

        const options = {
            body: body,
            icon: '/icon.png',
            badge: '/badge.png',
            vibrate: [100, 50, 100],
            data: {
                dateOfArrival: Date.now(),
                primaryKey: '2'
            }
        }

        event.waitUntil(
            self.registration.showNotification(title, options)
        )
    }
})
