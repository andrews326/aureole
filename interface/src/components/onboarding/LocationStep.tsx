// src/components/onboarding/LocationStep.tsx


import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, Crosshair, XCircle } from "lucide-react";
import { toast } from "sonner";

interface Props {
  onLocationCaptured: (data: {
    latitude: number;
    longitude: number;
    share_location: boolean;
  }) => void;
}

const LocationStep: React.FC<Props> = ({ onLocationCaptured }) => {
  const [location, setLocation] = useState<{
    latitude: number | null;
    longitude: number | null;
  }>({ latitude: null, longitude: null });

  const [shareLocation, setShareLocation] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const getLocation = async () => {
    setLoading(true);
    setErrorMsg(null);

    if (!navigator.geolocation) {
      setErrorMsg("Geolocation is not supported by your browser.");
      toast.error("Geolocation not supported.");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setLocation({ latitude, longitude });
        setLoading(false);
        toast.success("Location captured successfully 🌍");
      },
      (err) => {
        setErrorMsg("Unable to fetch your location.");
        setLoading(false);
        toast.error("Failed to get location. Please try again.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  useEffect(() => {
    // Auto-fetch on mount for better UX
    getLocation();
  }, []);

  const handleConfirm = () => {
    if (!location.latitude || !location.longitude) {
      toast.error("Please enable location or enter manually.");
      return;
    }
    onLocationCaptured({
      latitude: location.latitude,
      longitude: location.longitude,
      share_location: shareLocation,
    });
  };

  return (
    <div className="flex flex-col items-center space-y-6 animate-fadeIn">
      <h2 className="text-2xl font-semibold text-center text-cosmic">
        Share your location 📍
      </h2>
      <p className="text-muted-foreground text-center max-w-sm">
        We use your approximate location to suggest nearby matches.
      </p>

      <div className="glass-card p-6 rounded-2xl w-full max-w-md text-center border border-white/10">
        {loading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-cosmic" />
            <p className="text-sm text-muted-foreground">Fetching location...</p>
          </div>
        ) : errorMsg ? (
          <div className="flex flex-col items-center gap-3">
            <XCircle className="h-6 w-6 text-red-500" />
            <p className="text-sm text-red-400">{errorMsg}</p>
            <Button variant="outline" onClick={getLocation} className="mt-2">
              Retry
            </Button>
          </div>
        ) : location.latitude ? (
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2 text-green-400 font-semibold">
              <MapPin className="h-5 w-5" />
              <span>Location found</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Latitude: {location.latitude.toFixed(4)} <br />
              Longitude: {location.longitude.toFixed(4)}
            </p>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            Tap below to fetch your location.
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 mt-4">
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={shareLocation}
            onChange={() => setShareLocation((prev) => !prev)}
            className="h-4 w-4 rounded border border-white/20"
          />
          <span className="text-sm text-muted-foreground">
            Allow sharing my location with matches
          </span>
        </label>
      </div>

      <div className="flex gap-4 mt-6">
        <Button variant="outline" onClick={getLocation} className="flex items-center">
          <Crosshair className="mr-2 h-4 w-4" /> Retry
        </Button>

        <Button
          onClick={handleConfirm}
          className="cosmic-glow px-8"
          disabled={!location.latitude}
        >
          Confirm
        </Button>
      </div>
    </div>
  );
};

export default LocationStep;