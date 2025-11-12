// src/components/onboarding/LiveSelfieStep.tsx


import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Camera, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface Props {
  onVerified: (photoUrl: string) => void;
  apiUrl?: string; // default = /api/v1/verify-selfie
}

const LiveSelfieStep: React.FC<Props> = ({
  onVerified,
  apiUrl = "http://127.0.0.1:8000/api/v1/verify-selfie",
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [isUploading, setUploading] = useState(false);
  const [verified, setVerified] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Start camera stream
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setStreaming(true);
      }
    } catch (err) {
      toast.error("Camera access denied. Please allow camera permissions.");
    }
  };

  // Capture selfie frame
  const captureSelfie = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    context?.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const photoData = canvas.toDataURL("image/jpeg");
    setPhotoPreview(photoData);
    stopCamera();
  };

  // Stop camera stream
  const stopCamera = () => {
    const stream = videoRef.current?.srcObject as MediaStream;
    if (stream) stream.getTracks().forEach((track) => track.stop());
    setStreaming(false);
  };

  // Upload photo for verification
  const uploadForVerification = async () => {
    if (!photoPreview) return;
    try {
      setUploading(true);
      const blob = await (await fetch(photoPreview)).blob();
      const formData = new FormData();
      formData.append("file", blob, "selfie.jpg");

      const res = await fetch(apiUrl, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Verification failed");

      const data = await res.json();
      setVerified(true);
      toast.success("Verification successful ✅");
      onVerified(data.photo_url || photoPreview);
    } catch (err) {
      toast.error("Verification failed. Try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-6 animate-fadeIn">
      <h2 className="text-2xl font-semibold text-center text-cosmic">
        Verify your identity 🔒
      </h2>
      <p className="text-muted-foreground text-center max-w-sm">
        Please take a live selfie so our AI can confirm it’s really you.
      </p>

      <div className="relative w-full flex justify-center">
        {!photoPreview && (
          <div className="relative bg-black/20 rounded-xl overflow-hidden w-[320px] h-[400px] border border-white/10">
            {streaming ? (
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            ) : (
              <div className="flex items-center justify-center h-full">
                <Button onClick={startCamera} variant="secondary" className="flex items-center">
                  <Camera className="mr-2 h-4 w-4" /> Start Camera
                </Button>
              </div>
            )}
          </div>
        )}

        {photoPreview && (
          <div className="relative">
            <img
              src={photoPreview}
              alt="Selfie preview"
              className={`rounded-xl w-[320px] h-[400px] object-cover border ${
                verified ? "border-green-500 animate-glow" : "border-white/10"
              }`}
            />
            {!verified && (
              <Button
                onClick={() => setPhotoPreview(null)}
                variant="outline"
                className="absolute bottom-4 left-1/2 -translate-x-1/2"
              >
                Retake
              </Button>
            )}
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {!photoPreview && streaming && (
        <Button onClick={captureSelfie} className="cosmic-glow">
          Capture
        </Button>
      )}

      {photoPreview && !verified && (
        <Button
          onClick={uploadForVerification}
          disabled={isUploading}
          className="cosmic-glow w-40"
        >
          {isUploading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : "Verify"}
        </Button>
      )}

      {verified && (
        <div className="flex items-center gap-2 text-green-400 font-semibold mt-2">
          <CheckCircle className="w-5 h-5" /> Verified
        </div>
      )}
    </div>
  );
};

export default LiveSelfieStep;