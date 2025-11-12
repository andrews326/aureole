// src/pages/Auth.tsx


// src/pages/Auth.tsx
import { useState } from "react";
import { jwtDecode } from "jwt-decode";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useDispatch } from "react-redux";
import { setAuth } from "@/redux/slices/authSlice";
import axios from "axios";
import { motion } from "framer-motion";
import LiquidPlasma from "@/components/ui/LiquidEther"; // <-- use your saved component

const BASE_URL = "http://127.0.0.1:8000/api/v1";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const dispatch = useDispatch();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const params = new URLSearchParams();
        params.append("username", email);
        params.append("password", password);

        const res = await axios.post(`${BASE_URL}/login`, params, {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        });

        const { access_token } = res.data;
        const decoded: any = jwtDecode(access_token);
        const user = { id: decoded.user_id };
        dispatch(setAuth({ token: access_token, user }));

        const profileRes = await axios.get(`${BASE_URL}/profile/me`, {
          headers: { Authorization: `Bearer ${access_token}` },
        });

        if (profileRes.data.exists) {
          toast({
            title: "Welcome back 🌟",
            description: "Redirecting to discovery...",
          });
          navigate("/discovery");
        } else {
          toast({
            title: "Welcome!",
            description: "Redirecting to profile setup...",
          });
          navigate("/onboarding");
        }
      } else {
        const res = await axios.post(`${BASE_URL}/signup`, {
          email,
          phone,
          password,
        });

        const { user_id } = res.data;
        const user = { id: user_id };
        dispatch(setAuth({ token: "", user }));

        toast({
          title: "Welcome to Aureole ✨",
          description: "Redirecting to profile setup...",
        });

        navigate("/profile/setup");
      }
    } catch (err: any) {
      toast({
        title: "Authentication failed",
        description: err.response?.data?.detail || "Please try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden bg-[#050014] text-white">
      {/* Liquid Ether background */}
      <div className="absolute inset-0 -z-10">
      <LiquidPlasma colors={["#5227FF", "#FF9FFC", "#B19EEF"]} speed={0.4} />
      </div>

      {/* Form container */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 shadow-2xl rounded-3xl px-8 py-10">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center mb-10"
          >
            <h1 className="text-5xl font-extrabold tracking-tight mb-2 text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
              Aureole
            </h1>
            <p className="text-sm text-white/60">
              Where souls connect under the same sky ✨
            </p>
          </motion.div>

          {/* Login / Sign Up toggle */}
          <div className="flex mb-8 bg-white/10 rounded-full p-1 backdrop-blur-sm">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 rounded-full text-sm font-semibold transition-all ${
                isLogin
                  ? "bg-gradient-to-r from-indigo-500 to-sky-500 text-white shadow-md"
                  : "text-white/70 hover:text-white"
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 rounded-full text-sm font-semibold transition-all ${
                !isLogin
                  ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-md"
                  : "text-white/70 hover:text-white"
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label htmlFor="email" className="text-white/80">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:ring-2 focus:ring-sky-400"
              />
            </div>

            {!isLogin && (
              <div>
                <Label htmlFor="phone" className="text-white/80">
                  Phone
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+91 9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:ring-2 focus:ring-pink-400"
                />
              </div>
            )}

            <div>
              <Label htmlFor="password" className="text-white/80">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:ring-2 focus:ring-indigo-400"
              />
            </div>

            <motion.div whileTap={{ scale: 0.97 }}>
              <Button
                type="submit"
                disabled={loading}
                className="w-full mt-2 bg-gradient-to-r from-indigo-500 to-sky-500 hover:from-indigo-400 hover:to-sky-400 text-white font-semibold rounded-full py-2 shadow-lg"
              >
                {loading
                  ? "Connecting..."
                  : isLogin
                  ? "Sign In"
                  : "Create Account"}
              </Button>
            </motion.div>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;


// import { useState } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input';
// import { Label } from '@/components/ui/label';
// import CosmicBackground from '@/components/CosmicBackground';
// import { mockLogin, mockSignup, mockSocialLogin, saveAuth } from '@/utils/auth';
// import { useToast } from '@/hooks/use-toast';

// const Auth = () => {
//   const [isLogin, setIsLogin] = useState(true);
//   const [email, setEmail] = useState('');
//   const [password, setPassword] = useState('');
//   const [loading, setLoading] = useState(false);
//   const navigate = useNavigate();
//   const { toast } = useToast();

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setLoading(true);

//     try {
//       const { user, token } = isLogin 
//         ? await mockLogin(email, password)
//         : await mockSignup(email, password);
      
//       saveAuth(token, user);
      
//       toast({
//         title: isLogin ? "Welcome back! 🌟" : "Welcome to Aureole! ✨",
//         description: "Redirecting to verification...",
//       });
      
//       navigate('/verify-selfie');
//     } catch (error) {
//       toast({
//         title: "Authentication failed",
//         description: "Please try again",
//         variant: "destructive",
//       });
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleSocialLogin = async (provider: 'google' | 'apple') => {
//     setLoading(true);
//     try {
//       const { user, token } = await mockSocialLogin(provider);
//       saveAuth(token, user);
      
//       toast({
//         title: `Connected with ${provider === 'google' ? 'Google' : 'Apple'}! 🌟`,
//         description: "Redirecting to verification...",
//       });
      
//       navigate('/verify-selfie');
//     } catch (error) {
//       toast({
//         title: "Connection failed",
//         description: "Please try again",
//         variant: "destructive",
//       });
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="min-h-screen relative flex items-center justify-center p-4">
//       <CosmicBackground />
      
//       <div className="relative z-10 w-full max-w-md">
//         <div className="glass-card p-8 rounded-2xl border border-white/10">
//           {/* Header */}
//           <div className="text-center mb-8">
//             <h1 className="text-4xl font-bold text-cosmic mb-2">Aureole</h1>
//             <p className="text-muted-foreground">Where souls connect under the same sky</p>
//           </div>

//           {/* Tab Switcher */}
//           <div className="flex gap-2 mb-6 p-1 glass-card rounded-lg">
//             <button
//               onClick={() => setIsLogin(true)}
//               className={`flex-1 py-2 px-4 rounded-md transition-all ${
//                 isLogin 
//                   ? 'bg-primary text-primary-foreground' 
//                   : 'text-muted-foreground hover:text-foreground'
//               }`}
//             >
//               Login
//             </button>
//             <button
//               onClick={() => setIsLogin(false)}
//               className={`flex-1 py-2 px-4 rounded-md transition-all ${
//                 !isLogin 
//                   ? 'bg-primary text-primary-foreground' 
//                   : 'text-muted-foreground hover:text-foreground'
//               }`}
//             >
//               Sign Up
//             </button>
//           </div>

//           {/* Form */}
//           <form onSubmit={handleSubmit} className="space-y-4 mb-6">
//             <div className="space-y-2">
//               <Label htmlFor="email">Email</Label>
//               <Input
//                 id="email"
//                 type="email"
//                 placeholder="you@example.com"
//                 value={email}
//                 onChange={(e) => setEmail(e.target.value)}
//                 required
//                 className="glass-input"
//               />
//             </div>

//             <div className="space-y-2">
//               <Label htmlFor="password">Password</Label>
//               <Input
//                 id="password"
//                 type="password"
//                 placeholder="••••••••"
//                 value={password}
//                 onChange={(e) => setPassword(e.target.value)}
//                 required
//                 className="glass-input"
//               />
//             </div>

//             <Button 
//               type="submit" 
//               className="w-full cosmic-glow"
//               disabled={loading}
//             >
//               {loading ? 'Connecting...' : (isLogin ? 'Sign In' : 'Create Account')}
//             </Button>
//           </form>

//           {/* Divider */}
//           <div className="relative mb-6">
//             <div className="absolute inset-0 flex items-center">
//               <div className="w-full border-t border-white/10"></div>
//             </div>
//             <div className="relative flex justify-center text-xs uppercase">
//               <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
//             </div>
//           </div>

//           {/* Social Login */}
//           <div className="space-y-3">
//             <Button
//               type="button"
//               variant="outline"
//               className="w-full"
//               onClick={() => handleSocialLogin('google')}
//               disabled={loading}
//             >
//               <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
//                 <path
//                   fill="currentColor"
//                   d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
//                 />
//                 <path
//                   fill="currentColor"
//                   d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
//                 />
//                 <path
//                   fill="currentColor"
//                   d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
//                 />
//                 <path
//                   fill="currentColor"
//                   d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
//                 />
//               </svg>
//               Continue with Google
//             </Button>

//             <Button
//               type="button"
//               variant="outline"
//               className="w-full"
//               onClick={() => handleSocialLogin('apple')}
//               disabled={loading}
//             >
//               <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
//                 <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
//               </svg>
//               Continue with Apple
//             </Button>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default Auth;
