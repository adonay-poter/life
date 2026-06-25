'use client';

import { useEffect } from 'react';

export default function PWARegister() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      if (process.env.NODE_ENV !== 'production') {
        // In development mode, unregister any active service worker to prevent
        // cached HMR (Hot Module Replacement) chunk mismatches.
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          let hasUnregistered = false;
          const unregisterPromises = registrations.map((registration) =>
            registration.unregister().then((success) => {
              if (success) {
                console.log('Unregistered active service worker in development mode.');
                hasUnregistered = true;
              }
            })
          );

          Promise.all(unregisterPromises).then(() => {
            if (hasUnregistered) {
              // Reload page once to get fresh non-cached bundle chunks
              window.location.reload();
            }
          });
        });
        return;
      }

      const registerSW = () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((reg) => {
            console.log('Service worker registered successfully with scope:', reg.scope);
          })
          .catch((err) => {
            console.error('Service worker registration failed:', err);
          });
      };

      if (document.readyState === 'complete') {
        registerSW();
      } else {
        window.addEventListener('load', registerSW);
        return () => window.removeEventListener('load', registerSW);
      }
    }
  }, []);

  return null;
}
