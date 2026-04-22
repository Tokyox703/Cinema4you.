// سينما فور يو | Cinema4You - Service Worker
// لتخزين الملفات مؤقتاً والعمل دون اتصال بالإنترنت

const CACHE_NAME = 'cinema4you-v1.0.0';
const OFFLINE_URL = '/';

// الملفات التي سيتم تخزينها مؤقتاً عند التثبيت
const urlsToCache = [
  '/',
  '/index.html'
];

// تثبيت Service Worker وتخزين الملفات الأساسية
self.addEventListener('install', event => {
  console.log('[SW] جارٍ التثبيت...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] تم فتح التخزين، جارٍ حفظ الملفات');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('[SW] تم التثبيت بنجاح');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('[SW] فشل التثبيت:', error);
      })
  );
});

// تفعيل Service Worker وتنظيف التخزين القديم
self.addEventListener('activate', event => {
  console.log('[SW] جارٍ التفعيل...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] حذف التخزين القديم:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[SW] تم التفعيل وجاهز للعمل');
      return self.clients.claim();
    })
  );
});

// اعتراض طلبات الشبكة وإرجاع الملفات من التخزين المؤقت أولاً
self.addEventListener('fetch', event => {
  // تجاهل طلبات التحليلات والإعلانات
  const url = event.request.url;
  if (url.includes('google-analytics') || 
      url.includes('profitablecpmratenetwork') ||
      url.includes('doubleclick')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // إذا كان الملف موجوداً في التخزين، أرجعه فوراً
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // إذا لم يكن موجوداً، حمله من الشبكة
        return fetch(event.request)
          .then(response => {
            // لا تخزن الطلبات التي فشلت
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // تخزين الملف الجديد للاستخدام المستقبلي
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          })
          .catch(() => {
            // إذا كان المستخدم دون اتصال وأراد صفحة فيلم، يمكن إظهار صفحة خاصة
            if (event.request.mode === 'navigate') {
              return caches.match(OFFLINE_URL);
            }
            return new Response('لا يوجد اتصال بالإنترنت', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
      })
  );
});

// استقبال إشعارات من التطبيق (للإصدارات المستقبلية)
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// عرض إشعار عند تحديث التطبيق
self.addEventListener('push', event => {
  const title = 'سينما فور يو';
  const options = {
    body: 'أفلام جديدة أُضيفت! تفضل بمشاهدتها الآن',
    icon: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" rx="20" fill="%23e50914"/%3E%3Ctext x="50" y="72" font-family="Arial" font-size="68" fill="white" text-anchor="middle"%3EC%3C/text%3E%3C/svg%3E',
    badge: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" rx="20" fill="%23e50914"/%3E%3C/svg%3E',
    vibrate: [200, 100, 200]
  };
  event.waitUntil(self.registration.showNotification(title, options));
});