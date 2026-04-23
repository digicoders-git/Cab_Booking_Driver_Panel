// src/utils/mapUtils.js
let isGoogleMapsLoaded = false;
let googleMapsPromise = null;
let scriptLoadAttempts = 0;
const MAX_ATTEMPTS = 3;

// Single instance Google Maps loader with caching
export const loadGoogleMaps = () => {
  // ✅ Check if already loaded
  if (isGoogleMapsLoaded && window.google?.maps) {
    console.log('✅ Google Maps already loaded');
    return Promise.resolve();
  }

  // ✅ Return existing promise if loading
  if (googleMapsPromise) {
    console.log('⏳ Google Maps loading in progress...');
    return googleMapsPromise;
  }

  googleMapsPromise = new Promise((resolve, reject) => {
    // ✅ Double check if loaded
    if (window.google?.maps) {
      isGoogleMapsLoaded = true;
      console.log('✅ Google Maps already available');
      return resolve();
    }

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      console.warn('⚠️ VITE_GOOGLE_MAPS_API_KEY not configured');
      googleMapsPromise = null;
      reject(new Error('Google Maps API key not configured'));
      return;
    }

    // ✅ Check if script already exists
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      console.log('✅ Google Maps script already in DOM');
      // Wait for it to load
      if (window.google?.maps) {
        isGoogleMapsLoaded = true;
        googleMapsPromise = null;
        return resolve();
      }
      // If not loaded yet, wait a bit
      const checkInterval = setInterval(() => {
        if (window.google?.maps) {
          clearInterval(checkInterval);
          isGoogleMapsLoaded = true;
          googleMapsPromise = null;
          resolve();
        }
      }, 100);
      
      setTimeout(() => {
        clearInterval(checkInterval);
        if (!window.google?.maps) {
          googleMapsPromise = null;
          reject(new Error('Google Maps script exists but not loaded'));
        }
      }, 5000);
      return;
    }

    // ✅ Create new script
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry,places&loading=async`;
    script.async = true;
    script.defer = true;
    script.type = 'text/javascript';

    const timeout = setTimeout(() => {
      console.error('❌ Google Maps script load timeout');
      googleMapsPromise = null;
      scriptLoadAttempts++;
      
      // ✅ Retry logic
      if (scriptLoadAttempts < MAX_ATTEMPTS) {
        console.log(`🔄 Retrying... (Attempt ${scriptLoadAttempts}/${MAX_ATTEMPTS})`);
        script.remove();
        loadGoogleMaps().then(resolve).catch(reject);
      } else {
        reject(new Error('Google Maps script load timeout after retries'));
      }
    }, 10000);

    script.onload = () => {
      clearTimeout(timeout);
      
      // ✅ Wait for google.maps to be available
      const checkGoogle = setInterval(() => {
        if (window.google?.maps) {
          clearInterval(checkGoogle);
          isGoogleMapsLoaded = true;
          scriptLoadAttempts = 0;
          console.log('✅ Google Maps loaded successfully');
          resolve();
        }
      }, 100);

      // ✅ Timeout if google.maps not available
      setTimeout(() => {
        clearInterval(checkGoogle);
        if (!window.google?.maps) {
          console.error('❌ Google Maps script loaded but google.maps not available');
          googleMapsPromise = null;
          reject(new Error('Google Maps script loaded but google.maps not available'));
        }
      }, 3000);
    };

    script.onerror = (error) => {
      clearTimeout(timeout);
      console.error('❌ Google Maps script failed to load:', error);
      googleMapsPromise = null;
      scriptLoadAttempts++;
      
      // ✅ Retry logic
      if (scriptLoadAttempts < MAX_ATTEMPTS) {
        console.log(`🔄 Retrying... (Attempt ${scriptLoadAttempts}/${MAX_ATTEMPTS})`);
        script.remove();
        loadGoogleMaps().then(resolve).catch(reject);
      } else {
        reject(new Error('Google Maps failed to load after retries'));
      }
    };

    document.head.appendChild(script);
    console.log('📝 Google Maps script added to DOM');
  });

  return googleMapsPromise;
};

// Optimized map styles (lighter rendering)
export const optimizedMapStyles = [
  {
    featureType: 'poi',
    elementType: 'labels',
    stylers: [{ visibility: 'off' }]
  },
  {
    featureType: 'transit',
    elementType: 'labels',
    stylers: [{ visibility: 'off' }]
  },
  {
    featureType: 'administrative',
    elementType: 'labels.text.fill',
    stylers: [{ visibility: 'simplified' }]
  }
];

// Throttle function for GPS updates
export const throttle = (func, delay) => {
  let timeoutId;
  let lastExecTime = 0;
  
  return function (...args) {
    const currentTime = Date.now();
    
    if (currentTime - lastExecTime > delay) {
      func.apply(this, args);
      lastExecTime = currentTime;
    } else {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        func.apply(this, args);
        lastExecTime = Date.now();
      }, delay - (currentTime - lastExecTime));
    }
  };
};

// Distance calculation (avoid API calls)
export const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in km
};

// Custom markers - with car image support
export const createCarMarker = (color = '#3B82F6', carImageUrl = null) => {
  // Agar car image URL hai toh use karo
  if (carImageUrl) {
    return {
      url: carImageUrl,
      scaledSize: new window.google.maps.Size(48, 48),
      anchor: new window.google.maps.Point(24, 24),
      origin: new window.google.maps.Point(0, 0)
    };
  }
  
  // Fallback: SVG marker
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
      <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="14" fill="${color}" stroke="white" stroke-width="3"/>
        <circle cx="16" cy="16" r="8" fill="white"/>
        <polygon points="16,10 20,16 16,22 12,16" fill="${color}"/>
      </svg>
    `)}`,
    scaledSize: new window.google.maps.Size(32, 32),
    anchor: new window.google.maps.Point(16, 16)
  };
};

export const createLocationMarker = (type = 'pickup') => {
  const color = type === 'pickup' ? '#10B981' : type === 'stop' ? '#F59E0B' : '#EF4444';
  const letter = type === 'pickup' ? 'P' : type === 'stop' ? 'S' : 'D';
  
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
      <svg width="24" height="32" viewBox="0 0 24 32" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 0C5.4 0 0 5.4 0 12c0 6.6 12 20 12 20s12-13.4 12-20C24 5.4 18.6 0 12 0z" fill="${color}"/>
        <circle cx="12" cy="12" r="6" fill="white"/>
        <text x="12" y="16" text-anchor="middle" fill="${color}" font-size="10" font-weight="bold">${letter}</text>
      </svg>
    `)}`,
    scaledSize: new window.google.maps.Size(24, 32),
    anchor: new window.google.maps.Point(12, 32)
  };
};
