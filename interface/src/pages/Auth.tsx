// src/pages/Auth.tsx

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { login as loginService, signup as signupService, checkProfileStatus } from "@/services/authService";
import { jwtDecode } from "jwt-decode";
import { useDispatch } from "react-redux";
import { setAuth } from "@/redux/slices/authSlice";


const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
  
    try {
      if (isLogin) {
        // 1) LOGIN
        const res = await loginService(email, password);
        const { access_token } = res;
        if (!access_token) throw new Error("No access token returned");
  
        const decoded: any = jwtDecode(access_token);
        const user = { id: decoded.user_id, email };
        console.log("LOGIN TOKEN:", access_token);
        console.log("LOGIN USER:", user);
  
        // 2) Save to Redux
        dispatch(setAuth({ token: access_token, user }));
  
        // 3) Check profile status (LIGHTWEIGHT)
        const status = await checkProfileStatus(access_token);
  
        if (status.exists) {
          toast({
            title: "Welcome back 🌟",
            description: "Redirecting...",
          });
          navigate("/discovery");
        } else {
          toast({
            title: "Let's set up your profile",
            description: "Redirecting...",
          });
          navigate("/onboarding");
        }
      } else {
        // SIGNUP
        const res = await signupService(email, phone, password);
        const { user_id } = res;
  
        toast({
          title: "Account created",
          description: "Please sign in to continue.",
        });
  
        setIsLogin(true);
        setPassword("");
        setEmail(email);
      }
    } catch (err: any) {
      toast({
        title: "Authentication failed",
        description: err.response?.data?.detail || err.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black text-white">

      {/* CYAN / AQUA Aurora Background */}
      <div className="
        absolute inset-0 
        bg-[radial-gradient(circle_at_20%_20%,rgba(0,255,255,0.3),transparent),
            radial-gradient(circle_at_80%_60%,rgba(0,150,255,0.28),transparent),
            radial-gradient(circle_at_50%_90%,rgba(0,200,255,0.22),transparent)]
        animate-cyanMesh
      " />

      {/* Aurora Waves */}
      <motion.div
        className="absolute inset-0 opacity-40"
        animate={{
          backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{
          backgroundImage:
            "linear-gradient(115deg, rgba(0,255,255,0.25), rgba(0,80,255,0.2), rgba(0,255,200,0.25))",
          backgroundSize: "200% 200%",
        }}
      />

      {/* Floating Cyan Particles */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {[...Array(45)].map((_, i) => (
          <motion.span
            key={i}
            className="absolute rounded-full bg-cyan-300/20 blur-xl"
            style={{
              width: Math.random() * 45 + 10,
              height: Math.random() * 45 + 10,
              top: Math.random() * 100 + "%",
              left: Math.random() * 100 + "%",
            }}
            animate={{
              y: ["0px", "-80px", "0px"],
              opacity: [0.25, 0.9, 0.25],
              scale: [1, 1.4, 1],
            }}
            transition={{
              duration: Math.random() * 8 + 6,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* Main Panel */}
      <div className="relative z-10 flex items-center justify-center h-full px-4">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="w-full max-w-md backdrop-blur-2xl bg-white/10 border border-white/20 rounded-3xl p-10 shadow-[0_0_50px_rgba(0,255,255,0.15)]"
        >
          {/* Branding */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="text-center mb-10"
          >
            <h1 className="text-6xl font-black bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(0,255,255,0.4)]">
              Aureole
            </h1>
            <p className="text-white/70 text-sm">Where real connections begin 💫</p>
          </motion.div>

          {/* Toggle */}
          <div className="flex mb-8 bg-white/10 rounded-full p-1 backdrop-blur-md">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 rounded-full font-semibold transition-all ${
                isLogin
                  ? "bg-gradient-to-r from-cyan-400 to-blue-500 text-white shadow-lg"
                  : "text-white/60 hover:text-white"
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 rounded-full font-semibold transition-all ${
                !isLogin
                  ? "bg-gradient-to-r from-blue-400 to-cyan-500 text-white shadow-lg"
                  : "text-white/60 hover:text-white"
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label htmlFor="email" className="text-white/90">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                placeholder="you@example.com"
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white/10 text-white border-white/20 placeholder:text-white/40"
                required
              />
            </div>

            {!isLogin && (
              <div>
                <Label htmlFor="phone" className="text-white/90">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  placeholder="+91 9876543210"
                  onChange={(e) => setPhone(e.target.value)}
                  className="bg-white/10 text-white border-white/20 placeholder:text-white/40"
                  required
                />
              </div>
            )}

            <div>
              <Label htmlFor="password" className="text-white/90">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                placeholder="••••••••"
                onChange={(e) => setPassword(e.target.value)}
                className="bg-white/10 text-white border-white/20 placeholder:text-white/40"
                required
              />
            </div>

            <motion.div whileTap={{ scale: 0.97 }}>
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-black font-semibold rounded-full py-3 shadow-[0_0_20px_rgba(0,255,255,0.45)]"
              >
                {loading ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}
              </Button>
            </motion.div>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default Auth;