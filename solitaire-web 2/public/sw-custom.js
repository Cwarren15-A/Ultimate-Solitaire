// Custom service worker additions
// This file is imported by the generated service worker

// Cache names
const GAME_CACHE = 'solitaire-game-v1';
const STATIC_CACHE = 'solitaire-static-v1';

// Game-specific caching logic
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Cache game state API calls
  if (url.pathname.includes('/api/hint')) {
    event.respondWith(
      caches.open(GAME_CACHE).then(cache => {
        return cache.match(event.request).then(response => {
          if (response) {
            // Return cached response and fetch fresh data in background
            fetch(event.request).then(fetchResponse => {
              cache.put(event.request, fetchResponse.clone());
            }).catch(() => {
              // Network error, keep using cache
            });
            return response;
          }
          
          // No cache, try network
          return fetch(event.request).then(fetchResponse => {
            cache.put(event.request, fetchResponse.clone());
            return fetchResponse;
          }).catch(() => {
            // Return fallback for offline hints
            return new Response(JSON.stringify({
              move: "Try moving cards from the tableau to the foundation piles, or draw more cards from the stock.",
              offline: true
            }), {
              headers: { 'Content-Type': 'application/json' }
            });
          });
        });
      })
    );
  }
});

// Background sync for game statistics
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync-stats') {
    event.waitUntil(syncGameStats());
  }
});

async function syncGameStats() {
  try {
    // Get pending stats from IndexedDB
    const stats = await getPendingStats();
    
    if (stats.length > 0) {
      // Send to analytics or cloud storage
      await fetch('/api/stats/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stats)
      });
      
      // Clear pending stats
      await clearPendingStats();
    }
  } catch (error) {
    console.error('Failed to sync stats:', error);
  }
}

// IndexedDB helpers (mock implementation)
async function getPendingStats() {
  // Implementation would use IndexedDB to get pending stats
  return [];
}

async function clearPendingStats() {
  // Implementation would clear pending stats from IndexedDB
}
