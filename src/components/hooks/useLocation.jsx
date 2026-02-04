import { useEffect, useState } from "react";

export default function useGeolocation() {
  const [location, setLocation] = useState({
    coords: null,
    error: null,
    loading: true,
  });

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocation((prev) => ({
        ...prev,
        error: "Geolocation not supported",
        loading: false,
      }));
      return;
    }

    const handleSuccess = (position) => {
      setLocation({
        coords: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        },
        error: null,
        loading: false,
      });
    };

    const handleError = (error) => {
      let errorMessage = "An unknown error occurred";
      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMessage = "Permission denied. Please enable location access.";
          break;
        case error.POSITION_UNAVAILABLE:
          errorMessage = "Location information is unavailable.";
          break;
        case error.TIMEOUT:
          errorMessage = "The request to get user location timed out.";
          break;
      }
      setLocation((prev) => ({ ...prev, error: errorMessage, loading: false }));
    };

    const watcher = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );

    return () => navigator.geolocation.clearWatch(watcher);
  }, []);

  return location;
}
