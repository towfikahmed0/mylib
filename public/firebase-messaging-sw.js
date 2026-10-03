/* Firebase Cloud Messaging service worker. The app passes the (public) Firebase
 * config through the registration query string, so no secrets live in this file. */
importScripts('https://www.gstatic.com/firebasejs/12.19.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/12.19.0/firebase-messaging-compat.js')

var config = {}
try {
  var params = new URL(self.location).searchParams
  config = JSON.parse(decodeURIComponent(params.get('config') || '{}'))
} catch (error) {
  config = {}
}

if (config.projectId) {
  firebase.initializeApp(config)
  var messaging = firebase.messaging()

  messaging.onBackgroundMessage(function (payload) {
    var notification = payload.notification || {}
    self.registration.showNotification(notification.title || 'MyLib', {
      body: notification.body || '',
      icon: '/logo.png',
      data: payload.data || {},
    })
  })
}

self.addEventListener('notificationclick', function (event) {
  event.notification.close()
  var link = (event.notification.data && event.notification.data.actionLink) || '/'
  event.waitUntil(self.clients.openWindow(link))
})
