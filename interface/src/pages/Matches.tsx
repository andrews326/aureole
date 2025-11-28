// src/pages/Matches.tsx
import { useEffect, useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle, Sparkles } from "lucide-react";
import CosmicBackground from "@/components/CosmicBackground";
import { getAvatar } from "@/utils/avatar";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@/redux/store";
import { fetchMatches } from "@/redux/slices/friendSlice";
import { useAppSelector } from "@/redux/hooks";
import AvatarCosmic from "@/components/AvatarCosmic";
import { blockMatchUser } from "@/services/sessionService";

const Matches = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useAppSelector((state: RootState) => state.auth);
  const [starburstMatch, setStarburstMatch] = useState<string | null>(null);

  // matches slice kept as friends.matches or similar
  const { matches, loading, error } = useAppSelector((state: RootState) => state.friends);

  useEffect(() => {
    dispatch(fetchMatches());
  }, [dispatch]);

  // Deduplicate by user_id (server should already be one-per-match, but just in case)
  const uniqueMatches = useMemo(() => {
    const map = new Map<string, typeof matches[0]>();
    (matches || []).forEach((m) => {
      if (!m) return;
      map.set(m.user_id, m);
    });
    return Array.from(map.values());
  }, [matches]);

  const handleStartConversation = (partnerId: string) => {
    if (partnerId === user?.id) {
      console.error("❌ Cannot start conversation with yourself!");
      return;
    }
    setStarburstMatch(partnerId);
    setTimeout(() => {
      setStarburstMatch(null);
      navigate(`/chat/${partnerId}`);
    }, 800);
  };

    // 🔹 NEW: Block handler
    const handleBlockUser = async (partnerId: string) => {
      // optional confirmation
      const ok = window.confirm(
        "Are you sure you want to block and unmatch this user? You won't be able to chat until you unblock them."
      );
      if (!ok) return;
  
      try {
        await blockMatchUser(partnerId);
        // refresh matches so blocked user disappears
        dispatch(fetchMatches());
      } catch (err) {
        console.error("Failed to block user:", err);
        // you can show a toast here if you have a system
      }
    };
  

  return (
    <div className="pb-24 min-h-screen relative overflow-hidden">
      <CosmicBackground />

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-2 text-cosmic">
            <Sparkles className="inline-block w-8 h-8 mr-2 star-glow" />
            Matches
          </h1>
          <p className="text-muted-foreground">Souls aligned by the stars</p>
        </div>

        {loading && <p className="text-center text-muted-foreground">Loading matches...</p>}
        {error && <p className="text-center text-red-500">{error}</p>}

        <div className="space-y-6">
        {uniqueMatches.length > 0 &&
  uniqueMatches.map((match) => {
    // 🔥 FIXED: Use last_message_preview instead of conversation_starter
    const lastMessagePreview = match.last_message_preview || match.conversation_starter || "The stars haven't aligned in conversation yet ✨";
    const subtitle = (match.mini_traits && match.mini_traits.length > 0)
      ? match.mini_traits.slice(0, 2).join(", ")
      : "Cosmic compatibility";

    return (
      <Card
        key={match.user_id}
        className="!bg-white/5 !border-white/10 rounded-2xl cosmic-glow p-4 
                   hover:scale-[1.015] transition-all duration-300 overflow-hidden relative"
      >
        {starburstMatch === match.user_id && (
          <div className="absolute inset-0 animate-particle-burst pointer-events-none z-20" />
        )}

        <div className="flex gap-4">
          <div className="relative w-20 h-20 shrink-0">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br 
                from-cyan-400 via-blue-500 to-purple-500 blur-md opacity-40" />

            <AvatarCosmic
              src={getAvatar(match)}
              online={!!match.is_online}
              verified={false}
              size={90}
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-2xl font-bold text-cosmic">
                {match.full_name}, <span className="text-neutral-300">{match.age ?? ""}</span>
              </h3>

              <div className={`w-3 h-3 rounded-full ${match.is_online ? "bg-green-400" : "bg-gray-400"}`} />
            </div>

            <p className="text-sm text-gray-300 line-clamp-1">{match.ai_summary}</p>

            <p className="text-xs text-purple-300 mt-1 line-clamp-1">
              ✨ {subtitle}
            </p>

            <p className="text-sm text-blue-300 mt-1 line-clamp-1">
              💬 {lastMessagePreview}
            </p>

            <p className="text-xs text-gray-400 italic mt-1 line-clamp-1">
              {match.last_active ? new Date(match.last_active).toLocaleString() : "Last active unknown"}
            </p>

            <div className="flex gap-3 mt-3">
              <Button
                onClick={() => handleStartConversation(match.user_id)}
                size="sm"
                className="bg-cyan-600/20 text-cyan-300 hover:bg-cyan-600/30 px-3 py-1.5 rounded-full"
              >
                <MessageCircle className="w-4 h-4 mr-1" />
                Chat
              </Button>

              <Button
                onClick={() => navigate(`/profile/${match.user_id}`)}
                variant="outline"
                size="sm"
                className="text-white border-white/20 hover:bg-white/10 px-3 py-1.5 rounded-full"
              >
                View
              </Button>

              {/* 🔹 NEW BLOCK BUTTON */}
              <Button onClick={() => handleBlockUser(match.user_id)}
                      variant="outline"
                      size="sm"
                      className="border-red-500/50 text-red-300 hover:bg-red-500/10 px-3 py-1.5 rounded-full"
              >
              Block
              </Button>
            </div>
          </div>
        </div>
      </Card>
    );
  })}

          {/* EMPTY STATE */}
          {uniqueMatches.length === 0 && !loading && (
            <Card className="glass-card p-12 text-center rounded-2xl">
              <Sparkles className="w-16 h-16 mx-auto mb-4 text-muted-foreground animate-twinkle" />
              <h3 className="text-xl font-semibold mb-2">No matches yet</h3>
              <p className="text-muted-foreground mb-6">
                Keep swiping to find your cosmic connection
              </p>
              <Button onClick={() => navigate('/discovery')} variant="outline">
                Go to Discovery
              </Button>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Matches;



// import { useState } from "react";
// import { Card } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { MessageCircle, Sparkles } from "lucide-react";
// import CosmicBackground from "@/components/CosmicBackground";
// import { useNavigate } from "react-router-dom";

// interface Match {
//   id: number;
//   name: string;
//   age: number;
//   image: string;
//   compatibility: number;
//   mutualInterests: string[];
//   conversationStarters: string[];
// }

// const mockMatches: Match[] = [
//   {
//     id: 1,
//     name: "Luna",
//     age: 26,
//     image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop",
//     compatibility: 94,
//     mutualInterests: ["Stargazing", "Music", "Travel"],
//     conversationStarters: [
//       "What's your favorite constellation?",
//       "Dream travel destination?",
//       "Last concert you attended?",
//     ],
//   },
//   {
//     id: 2,
//     name: "Nova",
//     age: 24,
//     image: "https://images.unsplash.com/photo-1488716820095-cbe80883c496?w=400&h=400&fit=crop",
//     compatibility: 89,
//     mutualInterests: ["Yoga", "Art", "Coffee"],
//     conversationStarters: [
//       "Favorite yoga pose?",
//       "What art style inspires you?",
//       "Coffee order of choice?",
//     ],
//   },
//   {
//     id: 3,
//     name: "Stella",
//     age: 27,
//     image: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=400&fit=crop",
//     compatibility: 86,
//     mutualInterests: ["Reading", "Hiking", "Photography"],
//     conversationStarters: [
//       "Last book that changed your life?",
//       "Best hiking trail you've discovered?",
//       "Film or digital photography?",
//     ],
//   },
// ];

// const Matches = () => {
//   const navigate = useNavigate();
//   const [starburstMatch, setStarburstMatch] = useState<number | null>(null);

//   const handleStartConversation = (matchId: number) => {
//     setStarburstMatch(matchId);
//     setTimeout(() => {
//       setStarburstMatch(null);
//       navigate("/chat");
//     }, 800);
//   };

//   return (
//     <div className="min-h-screen relative overflow-hidden">
//       <CosmicBackground />
      
//       <div className="relative z-10 container mx-auto px-4 py-8 max-w-4xl">
//         <div className="mb-8 text-center">
//           <h1 className="text-4xl font-bold mb-2 text-cosmic">
//             <Sparkles className="inline-block w-8 h-8 mr-2 star-glow" />
//             Your Cosmic Matches
//           </h1>
//           <p className="text-muted-foreground">Souls aligned by the stars</p>
//         </div>

//         <div className="space-y-6">
//           {mockMatches.map((match) => (
//             <Card
//               key={match.id}
//               className="glass-card cosmic-glow p-6 relative overflow-hidden group hover:scale-[1.02] transition-all duration-300"
//             >
//               {starburstMatch === match.id && (
//                 <div className="absolute inset-0 animate-particle-burst pointer-events-none z-20" />
//               )}
              
//               <div className="flex flex-col md:flex-row gap-6">
//                 {/* Profile Image */}
//                 <div className="relative">
//                   <div className="w-32 h-32 rounded-full overflow-hidden ring-4 ring-primary/30 star-glow">
//                     <img
//                       src={match.image}
//                       alt={match.name}
//                       className="w-full h-full object-cover"
//                     />
//                   </div>
                  
//                   {/* Compatibility Score */}
//                   <div className="absolute -bottom-2 -right-2 w-16 h-16 rounded-full bg-gradient-cosmic flex items-center justify-center cosmic-glow font-bold text-lg">
//                     {match.compatibility}%
//                   </div>
//                 </div>

//                 {/* Match Info */}
//                 <div className="flex-1 space-y-4">
//                   <div>
//                     <h3 className="text-2xl font-bold text-cosmic mb-1">
//                       {match.name}, {match.age}
//                     </h3>
//                     <div className="flex flex-wrap gap-2">
//                       {match.mutualInterests.map((interest) => (
//                         <span
//                           key={interest}
//                           className="px-3 py-1 rounded-full text-xs bg-primary/20 text-primary border border-primary/30 star-glow"
//                         >
//                           {interest}
//                         </span>
//                       ))}
//                     </div>
//                   </div>

//                   {/* Conversation Starters */}
//                   <div className="space-y-2">
//                     <p className="text-sm font-semibold text-muted-foreground">
//                       Conversation Starters:
//                     </p>
//                     <div className="space-y-2">
//                       {match.conversationStarters.map((starter, idx) => (
//                         <div
//                           key={idx}
//                           className="text-sm p-2 rounded-lg bg-gradient-to-r from-primary/10 to-transparent border border-primary/20 hover:border-primary/40 transition-colors cursor-pointer group/starter"
//                         >
//                           <span className="group-hover/starter:text-primary transition-colors">
//                             💫 {starter}
//                           </span>
//                         </div>
//                       ))}
//                     </div>
//                   </div>

//                   {/* Action Button */}
//                   <Button
//                     onClick={() => handleStartConversation(match.id)}
//                     className="w-full md:w-auto bg-gradient-cosmic hover:opacity-90 cosmic-glow"
//                     size="lg"
//                   >
//                     <MessageCircle className="w-4 h-4 mr-2" />
//                     Start Conversation
//                   </Button>
//                 </div>
//               </div>
//             </Card>
//           ))}
//         </div>

//         {mockMatches.length === 0 && (
//           <Card className="glass-card p-12 text-center">
//             <Sparkles className="w-16 h-16 mx-auto mb-4 text-muted-foreground animate-twinkle" />
//             <h3 className="text-xl font-semibold mb-2">No matches yet</h3>
//             <p className="text-muted-foreground mb-6">
//               Keep swiping to find your cosmic connection
//             </p>
//             <Button onClick={() => navigate("/discovery")} variant="outline">
//               Go to Discovery
//             </Button>
//           </Card>
//         )}
//       </div>
//     </div>
//   );
// };

// export default Matches;
