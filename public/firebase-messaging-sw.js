/* Firebase Cloud Messaging service worker.
 * The app passes the (public) Firebase config through the registration query string.
 * This worker handles background messages sent from the Firebase Console.
 */
importScripts('https://www.gstatic.com/firebasejs/12.19.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/12.19.0/firebase-messaging-compat.js')

var config = {}
try {
  var params = new URL(self.location).searchParams
  config = JSON.parse(decodeURIComponent(params.get('config') || '{}'))
} catch {
  config = {}
}

if (config.projectId) {
  firebase.initializeApp(config)
  var messaging = firebase.messaging()

  messaging.onBackgroundMessage(function (payload) {
    var notification = payload.notification || {}
    var data = payload.data || {}
    var title = notification.title || data.title || 'MyLib'
    var body = notification.body || data.body || ''
    var icon = data.icon || '/logo.png'

    return self.registration.showNotification(title, {
      body: body,
      icon: icon,
      badge: '/logo.png',
      data: data,
    })
  })
}

self.addEventListener('notificationclick', function (event) {
  event.notification.close()

  // Use custom data attached in Firebase Console to route the user appropriately (e.g., deep link)
  var targetUrl = '/'
  if (event.notification.data) {
    targetUrl =
      event.notification.data.url ||
      event.notification.data.link ||
      event.notification.data.actionLink ||
      '/'
  }

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(function (clientList) {
        for (var i = 0; i < clientList.length; i++) {
          var client = clientList[i]
          if (client.url && 'focus' in client) {
            client.navigate(targetUrl)
            return client.focus()
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl)
        }
      }),
  )
})
