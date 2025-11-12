// src/pages/Matches.tsx

import { useEffect, useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle, Sparkles } from "lucide-react";
import CosmicBackground from "@/components/CosmicBackground";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@/redux/store";
import { fetchMatches } from "@/redux/slices/friendSlice";
import { useAppSelector } from '@/redux/hooks';


const Matches = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useAppSelector((state: RootState) => state.auth);
  const [starburstMatch, setStarburstMatch] = useState<string | null>(null);

  const { matches, loading, error } = useSelector((state: RootState) => state.friends);

  useEffect(() => {
    dispatch(fetchMatches());
  }, [dispatch]);

  // Deduplicate matches by partner_id
  const uniqueMatches = useMemo(() => {
    const map = new Map<string, typeof matches[0]>();
    matches.forEach((m) => map.set(m.partner_id, m));
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

  return (
    <div className="min-h-screen relative overflow-hidden">
      <CosmicBackground />

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-2 text-cosmic">
            <Sparkles className="inline-block w-8 h-8 mr-2 star-glow" />
            Your Cosmic Matches
          </h1>
          <p className="text-muted-foreground">Souls aligned by the stars</p>
        </div>

        {loading && <p className="text-center text-muted-foreground">Loading matches...</p>}
        {error && <p className="text-center text-red-500">{error}</p>}

        <div className="space-y-6">
          {uniqueMatches.map((match) => (
            <Card
              key={match.partner_id}
              className="glass-card cosmic-glow p-6 relative overflow-hidden group hover:scale-[1.02] transition-all duration-300"
            >
              {starburstMatch === match.partner_id && (
                <div className="absolute inset-0 animate-particle-burst pointer-events-none z-20" />
              )}

              <div className="flex flex-col md:flex-row gap-6">
                {/* Profile Image */}
                <div className="relative">
                  <div className="w-32 h-32 rounded-full overflow-hidden ring-4 ring-primary/30 star-glow">
                    <img
                      src={match.imageUrl || "/default-avatar.png"}
                      alt={match.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Verified Badge */}
                  {match.is_verified && (
                    <div className="absolute top-0 right-0 w-6 h-6 rounded-full bg-gradient-to-tr from-yellow-400 to-purple-500 flex items-center justify-center animate-pulse">
                      <Sparkles className="w-3 h-3 text-white" />
                    </div>
                  )}

                  {/* Online/Offline Indicator */}
                  <div
                    className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white ${
                      match.is_active ? "bg-green-400" : "bg-gray-400"
                    }`}
                  />

                  {/* Compatibility Circle */}
                  <div className="absolute -bottom-2 -left-2 w-16 h-16 rounded-full bg-gradient-cosmic flex items-center justify-center cosmic-glow font-bold text-lg">
                    {Math.round(match.compatibility * 100)}%
                  </div>
                </div>

                {/* Match Info */}
                <div className="flex-1 space-y-4">
                  <div>
                    <h3 className="text-2xl font-bold text-cosmic mb-1">
                      {match.name}, {match.age}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-2">{match.bio}</p>

                    {/* Interests & Values */}
                    <div className="flex flex-wrap gap-2 mb-2">
                      {match.mutual_interests.map((interest) => (
                        <span
                          key={interest}
                          className="px-3 py-1 rounded-full text-xs bg-primary/20 text-primary border border-primary/30 star-glow"
                        >
                          {interest}
                        </span>
                      ))}
                      {match.common_values.map((value) => (
                        <span
                          key={value}
                          className="px-3 py-1 rounded-full text-xs bg-secondary/20 text-secondary border border-secondary/30 star-glow"
                        >
                          {value}
                        </span>
                      ))}
                    </div>

                    {/* Last Message */}
                    <p className="text-sm italic text-muted-foreground">
                      {match.last_message_preview
                        ? match.last_message_preview
                        : "The stars haven’t aligned in conversation yet ✨"}
                    </p>
                  </div>

                  {/* Conversation Starters */}
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-muted-foreground">
                      Conversation Starters:
                    </p>
                    <div className="space-y-2">
                      {match.conversation_starters.map((starter, idx) => (
                        <div
                          key={idx}
                          className="text-sm p-2 rounded-lg bg-gradient-to-r from-primary/10 to-transparent border border-primary/20 hover:border-primary/40 transition-colors cursor-pointer group/starter"
                        >
                          <span className="group-hover/starter:text-primary transition-colors">
                            💫 {starter}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Button */}
                  <Button
                    onClick={() => handleStartConversation(match.partner_id)}
                    className="w-full md:w-auto bg-gradient-cosmic hover:opacity-90 cosmic-glow"
                    size="lg"
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Start Conversation
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {uniqueMatches.length === 0 && !loading && (
          <Card className="glass-card p-12 text-center">
            <Sparkles className="w-16 h-16 mx-auto mb-4 text-muted-foreground animate-twinkle" />
            <h3 className="text-xl font-semibold mb-2">No matches yet</h3>
            <p className="text-muted-foreground mb-6">
              Keep swiping to find your cosmic connection
            </p>
            <Button onClick={() => navigate("/discovery")} variant="outline">
              Go to Discovery
            </Button>
          </Card>
        )}
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
