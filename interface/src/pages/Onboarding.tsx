// src/pages/Onboarding.tsx
// src/pages/Onboarding.tsx

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import CosmicBackground from "@/components/CosmicBackground";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { setupProfile, updateLocation } from "@/services/profileService";

// ✅ New Onboarding Components
import GenderSelection from "@/components/onboarding/GenderSelection";
import PersonalityTags from "@/components/onboarding/PersonalityTags";
import PersonalityForm from "@/components/onboarding/PersonalityForm";
import SelfieVerification from "@/pages/SelfieVerification";
import AILoadingScreen from "@/components/onboarding/AILoadingScreen";
import AnimatedAISummary from "@/components/onboarding/AnimatedAISummary";
import LocationStep from "@/components/onboarding/LocationStep";

const STEPS = [
  "Gender Selection",
  "Personality Tags",
  "Personality Details",
  "Selfie Verification",
  "AI Summary",
  "Location",
];
const TOTAL_STEPS = STEPS.length;

const Onboarding = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { token } = useSelector((state: RootState) => state.auth);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [aiData, setAiData] = useState<any>(null);

  const [formData, setFormData] = useState({
    full_name: "",
    age: "",
    gender: "",
    bio: "",
    preference: "",
    relationship_status: "",
    about: "",
    looking_for: "",
    interests: [] as string[],
    dealbreakers: [] as string[],
    latitude: null as number | null,
    longitude: null as number | null,
    share_location: true,
  });

  const updateData = (updates: Partial<typeof formData>) =>
    setFormData((prev) => ({ ...prev, ...updates }));

  const handleNext = async () => {
    // Validation per step
    if (step === 1 && !formData.gender)
      return toast({ title: "Please select your gender" });

    if (step === 2 && formData.interests.length < 1)
      return toast({ title: "Select at least one interest" });

    if (step === 3 && !formData.about.trim())
      return toast({ title: "Fill in your personality details" });

    if (step === 5) {
      // Submit profile data to backend
      setLoading(true);
      try {
        const response = await setupProfile(formData); // token auto-injected
        setAiData(response);
        toast({ title: "Profile AI summary created ✨" });
      } catch {
        toast({ title: "Failed to generate AI summary", variant: "destructive" });
      } finally {
        setLoading(false);
      }
      setStep(step + 1);
      return;
    }

    if (step === 6) {
      // Final step completed
      navigate("/discovery");
      return;
    }

    setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleLocationCaptured = async (data: {
    latitude: number;
    longitude: number;
    share_location: boolean;
  }) => {
    updateData(data);

    try {
      await updateLocation(data);
      toast({ title: "Location shared successfully 🌍" });
    } catch {
      toast({ title: "Failed to update location", variant: "destructive" });
    }
  };

  const progress = (step / TOTAL_STEPS) * 100;

  return (
    <div className="min-h-screen relative">
      <CosmicBackground />
      <div className="relative z-10 container mx-auto px-4 py-10 max-w-3xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <h1 className="text-3xl font-bold text-cosmic">
              Create Your Cosmic Profile
            </h1>
            <span className="text-muted-foreground">
              Step {step} of {TOTAL_STEPS}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step Content */}
        <div className="glass-card rounded-3xl p-8 mb-6 min-h-[520px] flex flex-col justify-center">
          {step === 1 && (
            <GenderSelection
              selected={formData.gender}
              onSelect={(gender) => updateData({ gender })}
            />
          )}

          {step === 2 && (
            <PersonalityTags
              selected={formData.interests}
              onUpdate={(interests) => updateData({ interests })}
            />
          )}

          {step === 3 && (
            <PersonalityForm
              data={formData}
              updateData={updateData}
            />
          )}

          {step === 4 && (
            <SelfieVerification
              onVerified={() => {
                toast({ title: "Verification completed ✅" });
                setStep(5);
              }}
            />
          )}

          {step === 5 &&
            (loading ? <AILoadingScreen /> : <AnimatedAISummary aiData={aiData} />)}

          {step === 6 && (
            <LocationStep onLocationCaptured={handleLocationCaptured} />
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center mt-4">
          <Button variant="ghost" onClick={handleBack} disabled={step === 1}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <Button
            onClick={handleNext}
            className="cosmic-glow"
            size="lg"
            disabled={loading}
          >
            {step === TOTAL_STEPS ? "Finish" : "Continue"}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;


// import { useState } from 'react';
// import { useNavigate } from 'react-router-dom';
// import CosmicBackground from '@/components/CosmicBackground';
// import GenderSelection from '@/components/onboarding/GenderSelection';
// import PersonalityTags from '@/components/onboarding/PersonalityTags';
// import BioSuggestions from '@/components/onboarding/BioSuggestions';
// import { Button } from '@/components/ui/button';
// import { Progress } from '@/components/ui/progress';
// import { ArrowRight, ArrowLeft } from 'lucide-react';

// export interface OnboardingData {
//   gender?: string;
//   interests?: string[];
//   bio?: string;
// }

// const Onboarding = () => {
//   const navigate = useNavigate();
//   const [step, setStep] = useState(1);
//   const [data, setData] = useState<OnboardingData>({});

//   const updateData = (updates: Partial<OnboardingData>) => {
//     setData(prev => ({ ...prev, ...updates }));
//   };

//   const canProceed = () => {
//     if (step === 1) return !!data.gender;
//     if (step === 2) return data.interests && data.interests.length > 0;
//     if (step === 3) return !!data.bio;
//     return false;
//   };

//   const handleNext = () => {
//     if (step < 3) {
//       setStep(step + 1);
//     } else {
//       // Save onboarding data and navigate
//       localStorage.setItem('onboardingCompleted', 'true');
//       localStorage.setItem('onboardingData', JSON.stringify(data));
//       navigate('/discovery');
//     }
//   };

//   const handleBack = () => {
//     if (step > 1) {
//       setStep(step - 1);
//     }
//   };

//   const progress = (step / 3) * 100;

//   return (
//     <div className="min-h-screen relative">
//       <CosmicBackground />
      
//       <div className="relative z-10 container mx-auto px-4 py-8 max-w-2xl">
//         <div className="mb-8">
//           <div className="flex justify-between items-center mb-4">
//             <h1 className="text-3xl font-bold text-cosmic">Create Your Cosmic Profile</h1>
//             <span className="text-muted-foreground">Step {step} of 3</span>
//           </div>
//           <Progress value={progress} className="h-2" />
//         </div>

//         <div className="glass-card rounded-3xl p-8 mb-6 min-h-[500px]">
//           {step === 1 && (
//             <GenderSelection
//               selected={data.gender}
//               onSelect={(gender) => updateData({ gender })}
//             />
//           )}
          
//           {step === 2 && (
//             <PersonalityTags
//               selected={data.interests || []}
//               onUpdate={(interests) => updateData({ interests })}
//             />
//           )}
          
//           {step === 3 && (
//             <BioSuggestions
//               interests={data.interests || []}
//               gender={data.gender}
//               bio={data.bio || ''}
//               onUpdate={(bio) => updateData({ bio })}
//             />
//           )}
//         </div>

//         <div className="flex justify-between items-center">
//           <Button
//             variant="ghost"
//             onClick={handleBack}
//             disabled={step === 1}
//             className="glass-card"
//           >
//             <ArrowLeft className="w-4 h-4 mr-2" />
//             Back
//           </Button>

//           <Button
//             onClick={handleNext}
//             disabled={!canProceed()}
//             className="cosmic-glow"
//             size="lg"
//           >
//             {step === 3 ? 'Complete' : 'Continue'}
//             <ArrowRight className="w-4 h-4 ml-2" />
//           </Button>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default Onboarding;
