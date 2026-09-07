import { useState, useEffect } from 'react';

interface LocationState {
  lat: number | null;
  lon: number | null;
  error: string | null;
  loading: boolean;
}

export function useGeolocation() {
  const [state, setState] = useState<LocationState>({
    lat: null,
    lon: null,
    error: null,
    loading: true,
  });

  useEffect(() => {
    if (!navigator.geolocation) {
      setState((s) => ({ ...s, error: 'Geolocation is not supported by your browser', loading: false }));
      return;
    }

    const success = (position: GeolocationPosition) => {
      setState({
        lat: position.coords.latitude,
        lon: position.coords.longitude,
        error: null,
        loading: false,
      });
    };

    const error = (err: GeolocationPositionError) => {
      setState((s) => ({ ...s, error: err.message, loading: false }));
    };

    // Watch position gives real-time updates as the user moves
    const watcher = navigator.geolocation.watchPosition(success, error, {
      enableHighAccuracy: true,
      maximumAge: 10000,
      timeout: 10000,
    });

    // Also get the initial position immediately to be responsive
    navigator.geolocation.getCurrentPosition(success, error, {
      enableHighAccuracy: true,
      maximumAge: 10000,
      timeout: 10000,
    });

    return () => navigator.geolocation.clearWatch(watcher);
  }, []);

  return state;
}
