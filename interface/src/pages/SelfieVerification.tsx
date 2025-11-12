// src/pages/SelfieVerification.tsx

import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import CosmicBackground from "@/components/CosmicBackground";
import { useToast } from "@/hooks/use-toast";
import { useDispatch, useSelector } from "react-redux";
import { uploadVerification } from "@/redux/slices/profileSlice";
import { RootState, AppDispatch } from "@/redux/store";

interface SelfieVerificationProps {
  onVerified?: () => void; // <-- add optional callback prop
}

const dataURLtoBlob = (dataurl: string) => {
  const arr = dataurl.split(",");
  const mime = arr[0].match(/:(.*?);/)?.[1] || "image/jpeg";
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) u8arr[n] = bstr.charCodeAt(n);
  return new Blob([u8arr], { type: mime });
};

const SelfieVerification = ({ onVerified }: SelfieVerificationProps) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [captured, setCaptured] = useState(false);
  const [loadingLocal, setLoadingLocal] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const dispatch = useDispatch<AppDispatch>();
  const profileState = useSelector((s: RootState) => s.profile);

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) videoRef.current.srcObject = mediaStream;
    } catch (err) {
      toast({
        title: "Camera access denied",
        description: "Allow camera to verify your identity",
        variant: "destructive",
      });
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    setCaptured(true);
  };

  const retake = () => setCaptured(false);

  const verify = async () => {
    if (!canvasRef.current) return;
    setLoadingLocal(true);

    try {
      const dataUrl = canvasRef.current.toDataURL("image/jpeg", 0.9);
      const blob = dataURLtoBlob(dataUrl);

      const result = await dispatch(uploadVerification({ file: blob, filename: "selfie.jpg" })).unwrap();

      if (stream) stream.getTracks().forEach((t) => t.stop());

      toast({
        title: "Photo uploaded",
        description: result.is_verified ? "Photo verified ✅" : "Verification submitted — result pending",
      });

      // ✅ Call the callback if provided
      if (onVerified) onVerified();

      // Navigate to next onboarding step
      navigate("/onboarding", { state: { showAiConfetti: true } });
    } catch (err: any) {
      toast({
        title: "Verification failed",
        description: err?.detail || err?.message || "Try again",
        variant: "destructive",
      });
    } finally {
      setLoadingLocal(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4">
      <CosmicBackground />
      <div className="relative z-10 w-full max-w-2xl">
        <div className="glass-card p-8 rounded-2xl border border-white/10">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-cosmic mb-2">Let's make sure you're really you 🌟</h1>
            <p className="text-muted-foreground">Take a live selfie to verify your identity</p>
          </div>

          <div className="relative aspect-[4/3] rounded-xl overflow-hidden mb-6 bg-black/50">
            <video ref={videoRef} autoPlay playsInline muted className={`w-full h-full object-cover ${captured ? "hidden" : "block"}`} />
            <canvas ref={canvasRef} className={`w-full h-full object-cover ${captured ? "block" : "hidden"}`} />
            {!captured && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-64 h-64 border-2 border-primary/50 rounded-full"></div>
              </div>
            )}
          </div>

          {!captured && (
            <div className="text-center mb-6 space-y-2">
              <p className="text-sm text-muted-foreground">• Center your face in the circle</p>
              <p className="text-sm text-muted-foreground">• Make sure you're well-lit</p>
              <p className="text-sm text-muted-foreground">• Look directly at the camera</p>
            </div>
          )}

          <div className="flex gap-3">
            {!captured ? (
              <>
                <Button variant="outline" className="flex-1" onClick={() => navigate("/auth")}>Back</Button>
                <Button className="flex-1 cosmic-glow" onClick={capturePhoto} disabled={!stream}>Capture Photo</Button>
              </>
            ) : (
              <>
                <Button variant="outline" className="flex-1" onClick={retake} disabled={loadingLocal}>Retake</Button>
                <Button className="flex-1 cosmic-glow" onClick={verify} disabled={loadingLocal}>
                  {loadingLocal ? "Uploading..." : "Verify & Continue"}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SelfieVerification;


// import { useState, useRef, useEffect } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { Button } from '@/components/ui/button';
// import CosmicBackground from '@/components/CosmicBackground';
// import { getAuth, saveAuth } from '@/utils/auth';
// import { useToast } from '@/hooks/use-toast';

// const SelfieVerification = () => {
//   const [stream, setStream] = useState<MediaStream | null>(null);
//   const [captured, setCaptured] = useState(false);
//   const [loading, setLoading] = useState(false);
//   const videoRef = useRef<HTMLVideoElement>(null);
//   const canvasRef = useRef<HTMLCanvasElement>(null);
//   const navigate = useNavigate();
//   const { toast } = useToast();

//   useEffect(() => {
//     const { token } = getAuth();
//     if (!token) {
//       navigate('/auth');
//       return;
//     }

//     startCamera();
//     return () => {
//       if (stream) {
//         stream.getTracks().forEach(track => track.stop());
//       }
//     };
//   }, []);

//   const startCamera = async () => {
//     try {
//       const mediaStream = await navigator.mediaDevices.getUserMedia({ 
//         video: { facingMode: 'user' },
//         audio: false 
//       });
//       setStream(mediaStream);
//       if (videoRef.current) {
//         videoRef.current.srcObject = mediaStream;
//       }
//     } catch (error) {
//       toast({
//         title: "Camera access denied",
//         description: "Please allow camera access to verify your identity",
//         variant: "destructive",
//       });
//     }
//   };

//   const capturePhoto = () => {
//     if (!videoRef.current || !canvasRef.current) return;

//     const video = videoRef.current;
//     const canvas = canvasRef.current;
//     canvas.width = video.videoWidth;
//     canvas.height = video.videoHeight;
    
//     const ctx = canvas.getContext('2d');
//     if (ctx) {
//       ctx.drawImage(video, 0, 0);
//       setCaptured(true);
//     }
//   };

//   const retake = () => {
//     setCaptured(false);
//   };

//   const verify = async () => {
//     setLoading(true);
    
//     // Simulate verification delay
//     await new Promise(resolve => setTimeout(resolve, 2000));
    
//     const { user, token } = getAuth();
//     if (user && token) {
//       const selfieUrl = canvasRef.current?.toDataURL();
//       const updatedUser = { ...user, verified: true, selfieUrl };
//       saveAuth(token, updatedUser);
//     }

//     if (stream) {
//       stream.getTracks().forEach(track => track.stop());
//     }

//     toast({
//       title: "Verification successful! ✨",
//       description: "Welcome to Aureole",
//     });

//     navigate('/onboarding');
//   };

//   return (
//     <div className="min-h-screen relative flex items-center justify-center p-4">
//       <CosmicBackground />
      
//       <div className="relative z-10 w-full max-w-2xl">
//         <div className="glass-card p-8 rounded-2xl border border-white/10">
//           {/* Header */}
//           <div className="text-center mb-6">
//             <h1 className="text-3xl font-bold text-cosmic mb-2">Let's make sure you're really you 🌟</h1>
//             <p className="text-muted-foreground">Take a live selfie to verify your identity</p>
//           </div>

//           {/* Camera View */}
//           <div className="relative aspect-[4/3] rounded-xl overflow-hidden mb-6 bg-black/50">
//             <video
//               ref={videoRef}
//               autoPlay
//               playsInline
//               muted
//               className={`w-full h-full object-cover ${captured ? 'hidden' : 'block'}`}
//             />
//             <canvas
//               ref={canvasRef}
//               className={`w-full h-full object-cover ${captured ? 'block' : 'hidden'}`}
//             />
            
//             {/* Starfield Overlay */}
//             <div className="absolute inset-0 pointer-events-none">
//               <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/30"></div>
//               {[...Array(20)].map((_, i) => (
//                 <div
//                   key={i}
//                   className="absolute w-1 h-1 bg-white rounded-full animate-twinkle"
//                   style={{
//                     left: `${Math.random() * 100}%`,
//                     top: `${Math.random() * 100}%`,
//                     animationDelay: `${Math.random() * 3}s`,
//                     opacity: Math.random() * 0.7 + 0.3,
//                   }}
//                 />
//               ))}
//             </div>

//             {/* Guide Frame */}
//             {!captured && (
//               <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
//                 <div className="w-64 h-64 border-2 border-primary/50 rounded-full"></div>
//               </div>
//             )}
//           </div>

//           {/* Instructions */}
//           {!captured && (
//             <div className="text-center mb-6 space-y-2">
//               <p className="text-sm text-muted-foreground">• Center your face in the circle</p>
//               <p className="text-sm text-muted-foreground">• Make sure you're well-lit</p>
//               <p className="text-sm text-muted-foreground">• Look directly at the camera</p>
//             </div>
//           )}

//           {/* Actions */}
//           <div className="flex gap-3">
//             {!captured ? (
//               <>
//                 <Button
//                   variant="outline"
//                   className="flex-1"
//                   onClick={() => navigate('/auth')}
//                 >
//                   Back
//                 </Button>
//                 <Button
//                   className="flex-1 cosmic-glow"
//                   onClick={capturePhoto}
//                   disabled={!stream}
//                 >
//                   Capture Photo
//                 </Button>
//               </>
//             ) : (
//               <>
//                 <Button
//                   variant="outline"
//                   className="flex-1"
//                   onClick={retake}
//                   disabled={loading}
//                 >
//                   Retake
//                 </Button>
//                 <Button
//                   className="flex-1 cosmic-glow"
//                   onClick={verify}
//                   disabled={loading}
//                 >
//                   {loading ? 'Verifying...' : 'Verify & Continue'}
//                 </Button>
//               </>
//             )}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default SelfieVerification;
