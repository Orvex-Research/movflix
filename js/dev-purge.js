/**
 * MOVFLIX — Dev cache purge (localhost only)
 * Forces stale service workers/caches out on development servers.
 */
(function() {
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(function(regs) {
        regs.forEach(function(r) { r.unregister(); });
      });
    }
    if ('caches' in window) {
      caches.keys().then(function(names) {
        names.forEach(function(name) { caches.delete(name); });
      });
    }
  }
})();
