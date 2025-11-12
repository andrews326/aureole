// src/components/onboarding/SummaryStep.tsx


import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { useNavigate } from "react-router-dom";
import { getAuth } from "@/utils/auth";

interface Props {
  profileData: any; // merged object from previous steps
}

const SummaryStep: React.FC<Props> = ({ profileData }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);

  const generateSummary = async () => {
    const { token } = getAuth();
    if (!token) {
      toast.error("Session expired — please log in again.");
      navigate("/auth");
      return;
    }

    setLoading(true);
    toast.message("✨ Crafting your cosmic profile...");

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/profile/setup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(profileData),
      });

      if (!res.ok) throw new Error("Profile setup failed");
      const data = await res.json();

      setSummary(data.summary);
      confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });

      toast.success("Profile created successfully! 🌟");
    } catch (err) {
      toast.error("Something went wrong. Please retry.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const finish = () => {
    navigate("/discovery");
  };

  return (
    <div className="flex flex-col items-center space-y-6 text-center animate-fadeIn">
      <h2 className="text-2xl font-bold text-cosmic">
        Ready for your AI-powered cosmic summary?
      </h2>
      <p className="text-muted-foreground max-w-sm">
        Our AI will analyze your details and craft an authentic, magnetic bio for your dating profile.
      </p>

      {!summary ? (
        <>
          <div className="glass-card p-8 rounded-3xl w-full max-w-md border border-white/10">
            {loading ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-cosmic" />
                <p className="text-sm text-muted-foreground">
                  Summoning your cosmic energy...
                </p>
              </div>
            ) : (
              <Button
                onClick={generateSummary}
                className="cosmic-glow px-8 flex items-center gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Generate My AI Summary
              </Button>
            )}
          </div>
        </>
      ) : (
        <div className="glass-card p-8 rounded-3xl w-full max-w-md border border-white/10 text-left">
          <h3 className="text-lg font-semibold text-cosmic mb-2">
            ✨ Your AI Summary
          </h3>
          <p className="text-sm text-white/80 leading-relaxed mb-4">
            {summary}
          </p>
          <Button onClick={finish} className="cosmic-glow w-full">
            Continue to Discovery →
          </Button>
        </div>
      )}
    </div>
  );
};

export default SummaryStep;