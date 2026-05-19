/**
 * 🚀 Horizontal Service Worker for Browser Push & Background Messages
 */

self.addEventListener("push", (event) => {
  try {
    const data = event.data ? event.data.json() : { title: "New Message", body: "You received a new alert!" };

    const options = {
      body: data.body,
      icon: "/default-avatar.png",
      badge: "/default-avatar.png",
      vibrate: [100, 50, 100],
      data: {
        url: data.actionUrl || "/"
      }
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  } catch (err) {
    console.error("Push notification display failed:", err);
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  // Navigate to action URL instantly
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === event.notification.data.url && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.url);
      }
    })
  );
});
