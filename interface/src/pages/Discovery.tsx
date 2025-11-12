// src/pages/Discovery.tsx

// import { useState, useRef } from "react";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { useDispatch } from "react-redux";
// import { AppDispatch } from "@/redux/store";
// import { sendSwipe, sendSuperLike } from "@/redux/slices/swipeSlice";
// import CosmicBackground from "@/components/CosmicBackground";
// import SwipeCard from "@/components/SwipeCard";
// import { Heart, X, Sparkles, Flame, Star } from "lucide-react";

// interface Profile {
//   id: string;
//   name: string;
//   age: number;
//   bio: string;
//   imageUrl: string;
//   distance?: string;
//   compatibility?: number;
// }

// const mockProfiles: Record<string, Profile[]> = {
//   nearby: [
//     {
//       id: "1",
//       name: "Luna",
//       age: 28,
//       bio: "Stargazer, cosmic dreamer, seeking deep connections",
//       imageUrl:
//         "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400",
//       distance: "2 km",
//     },
//     {
//       id: "2",
//       name: "Nova",
//       age: 26,
//       bio: "Artist, explorer, lover of midnight conversations",
//       imageUrl:
//         "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400",
//       distance: "5 km",
//     },
//     {
//       id: "3",
//       name: "Stella",
//       age: 29,
//       bio: "Wanderlust soul, finding magic in the mundane",
//       imageUrl:
//         "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400",
//       distance: "8 km",
//     },
//   ],
//   soulmates: [
//     {
//       id: "4",
//       name: "Aurora",
//       age: 27,
//       bio: "Dancing through galaxies, seeking cosmic harmony",
//       imageUrl:
//         "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400",
//       compatibility: 98,
//     },
//     {
//       id: "5",
//       name: "Celeste",
//       age: 30,
//       bio: "Philosopher, dreamer, believer in destiny",
//       imageUrl:
//         "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400",
//       compatibility: 95,
//     },
//   ],
//   fresh: [
//     {
//       id: "6",
//       name: "Lyra",
//       age: 25,
//       bio: "New to the cosmic journey, open to adventures",
//       imageUrl:
//         "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=400",
//     },
//     {
//       id: "7",
//       name: "Vega",
//       age: 28,
//       bio: "Coffee addict, bookworm, moonlight dancer",
//       imageUrl:
//         "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=400",
//     },
//   ],
//   premium: [
//     {
//       id: "8",
//       name: "Astra",
//       age: 31,
//       bio: "Verified cosmic soul, entrepreneur, world traveler",
//       imageUrl:
//         "https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?w=400",
//       compatibility: 92,
//     },
//   ],
// };

// const Discovery = () => {
//   const [activeTab, setActiveTab] = useState("nearby");
//   const [profiles, setProfiles] = useState(mockProfiles);
//   const cardRefs = useRef<Record<string, any>>({});

//   const dispatch = useDispatch<AppDispatch>();

//   const handleLike = (tabKey: string, profileId: string) => {
//     dispatch(sendSwipe({ targetId: profileId, liked: true }));
//     setTimeout(() => {
//       setProfiles((prev) => ({
//         ...prev,
//         [tabKey]: prev[tabKey].filter((p) => p.id !== profileId),
//       }));
//     }, 400);
//   };
  
//   const handlePass = (tabKey: string, profileId: string) => {
//     dispatch(sendSwipe({ targetId: profileId, liked: false }));
//     setTimeout(() => {
//       setProfiles((prev) => ({
//         ...prev,
//         [tabKey]: prev[tabKey].filter((p) => p.id !== profileId),
//       }));
//     }, 400);
//   };
  
//   const handleSuperLike = (tabKey: string, profileId: string) => {
//     dispatch(sendSuperLike(profileId));
//     setTimeout(() => {
//       setProfiles((prev) => ({
//         ...prev,
//         [tabKey]: prev[tabKey].filter((p) => p.id !== profileId),
//       }));
//     }, 500);
//   };
  

//   return (
//     <div className="min-h-screen relative">
//       <CosmicBackground />

//       <div className="relative z-10 container mx-auto px-4 py-8 max-w-lg">
//         <h1 className="text-4xl font-bold text-center mb-8 text-cosmic">
//           <Sparkles className="inline-block mr-2 animate-glow" />
//           Discovery Hub
//         </h1>

//         <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
//           <TabsList className="glass-card w-full grid grid-cols-4 mb-8">
//             <TabsTrigger
//               value="nearby"
//               className="data-[state=active]:bg-primary/20"
//             >
//               Nearby
//             </TabsTrigger>
//             <TabsTrigger
//               value="soulmates"
//               className="data-[state=active]:bg-primary/20"
//             >
//               <Heart className="w-4 h-4 mr-1 inline" />
//               Soulmates
//             </TabsTrigger>
//             <TabsTrigger
//               value="fresh"
//               className="data-[state=active]:bg-primary/20"
//             >
//               Fresh
//             </TabsTrigger>
//             <TabsTrigger
//               value="premium"
//               className="data-[state=active]:bg-primary/20"
//             >
//               <Flame className="w-4 h-4 mr-1 inline" />
//               Premium
//             </TabsTrigger>
//           </TabsList>

//           {(["nearby", "soulmates", "fresh", "premium"] as const).map(
//             (tabKey) => (
//               <TabsContent key={tabKey} value={tabKey} className="mt-0">
//                 <div className="relative h-[600px]">
//                   {profiles[tabKey].length === 0 ? (
//                     <div className="glass-card rounded-3xl p-12 text-center">
//                       <p className="text-muted-foreground text-lg">
//                         No more profiles to show
//                       </p>
//                       <p className="text-sm text-muted-foreground mt-2">
//                         Check back later for new cosmic connections
//                       </p>
//                     </div>
//                   ) : (
//                     <div className="relative w-full h-full">
//                       {profiles[tabKey].map((profile, index) => {
//                         if (!cardRefs.current[profile.id]) {
//                           cardRefs.current[profile.id] = { current: null };
//                         }

//                         return (
//                           <SwipeCard
//                             key={profile.id}
//                             ref={(el) =>
//                               (cardRefs.current[profile.id].current = el)
//                             }
//                             profile={profile}
//                             index={index}
//                             total={profiles[tabKey].length}
//                             onLike={() => handleLike(tabKey, profile.id)}
//                             onPass={() => handlePass(tabKey, profile.id)}
//                             onSuperLike={() =>
//                               handleSuperLike(tabKey, profile.id)
//                             }
//                           />
//                         );
//                       })}
//                     </div>
//                   )}
//                 </div>

//                 {/* Buttons Section */}
//                 <div className="flex justify-center gap-6 mt-8">
//                   {/* Pass */}
//                   <button
//                     onClick={() => {
//                       const top =
//                         profiles[tabKey][profiles[tabKey].length - 1];
//                       if (top)
//                         cardRefs.current[top.id]?.current?.triggerAnimation(
//                           "pass"
//                         );
//                     }}
//                     className="glass-card w-16 h-16 rounded-full flex items-center justify-center hover:scale-110 transition-transform active:scale-95 group"
//                     disabled={profiles[tabKey].length === 0}
//                   >
//                     <X className="w-8 h-8 text-destructive group-hover:animate-pulse" />
//                   </button>

//                   {/* Super Like */}
//                   <button
//                     onClick={() => {
//                       const top =
//                         profiles[tabKey][profiles[tabKey].length - 1];
//                       if (top)
//                         cardRefs.current[top.id]?.current?.triggerAnimation(
//                           "superlike"
//                         );
//                     }}
//                     className="glass-card w-16 h-16 rounded-full flex items-center justify-center hover:scale-125 transition-transform active:scale-95 group bg-gradient-to-t from-indigo-500 via-sky-400 to-pink-400 shadow-[0_0_20px_rgba(99,102,241,0.6)]"
//                     disabled={profiles[tabKey].length === 0}
//                   >
//                     <Star className="w-8 h-8 text-white group-hover:animate-spin-slow" />
//                   </button>

//                   {/* Like */}
//                   <button
//                     onClick={() => {
//                       const top =
//                         profiles[tabKey][profiles[tabKey].length - 1];
//                       if (top)
//                         cardRefs.current[top.id]?.current?.triggerAnimation(
//                           "like"
//                         );
//                     }}
//                     className="glass-card w-20 h-20 rounded-full flex items-center justify-center hover:scale-110 transition-transform active:scale-95 group cosmic-glow"
//                     disabled={profiles[tabKey].length === 0}
//                   >
//                     <Heart className="w-10 h-10 text-primary group-hover:fill-primary group-hover:animate-pulse" />
//                   </button>
//                 </div>
//               </TabsContent>
//             )
//           )}
//         </Tabs>
//       </div>
//     </div>
//   );
// };

// export default Discovery;



// src/pages/Discovery.tsx
import { useState, useEffect, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDispatch } from "react-redux";
import { AppDispatch } from "@/redux/store";
import { sendSwipe, sendSuperLike } from "@/redux/slices/swipeSlice";
import CosmicBackground from "@/components/CosmicBackground";
import SwipeCard from "@/components/SwipeCard";
import { Heart, X, Sparkles, Star, SlidersHorizontal } from "lucide-react";
import { Profile } from "@/types/types";
import {
  getRecommendations,
  getProximityMatches,
  getCompatibilityMatches,
  getFreshRecommendations,
  getAgeFilteredMatches,
} from "@/services/matchService";
import { Slider } from "@/components/ui/slider"; // assuming shadcn-style slider

const Discovery = () => {
  const [activeTab, setActiveTab] = useState("nearby");
  const [profiles, setProfiles] = useState<Record<string, Profile[]>>({
    nearby: [],
    soulmates: [],
    fresh: [],
    age: [],
  });
  const [ageRange, setAgeRange] = useState<[number, number]>([20, 35]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cardRefs = useRef<Record<string, any>>({});
  const dispatch = useDispatch<AppDispatch>();

  // Fetch base recommendations on mount
  useEffect(() => {
    const fetchInitial = async () => {
      try {
        setLoading(true);
        const base = await getRecommendations();
        setProfiles((prev) => ({ ...prev, nearby: mapProfiles(base) }));
      } catch (err: any) {
        console.error("Failed to load base profiles:", err);
        setError(err.response?.data?.detail || "Failed to load profiles");
      } finally {
        setLoading(false);
      }
    };
    fetchInitial();
  }, []);

  // Fetch data on tab change (lazy loading)
  useEffect(() => {
    const loadTabData = async () => {
      if (profiles[activeTab].length > 0) return; // already loaded

      try {
        setLoading(true);
        let data = [];
        if (activeTab === "soulmates") data = await getCompatibilityMatches();
        else if (activeTab === "fresh") data = await getFreshRecommendations();
        else if (activeTab === "nearby") data = await getProximityMatches();
        else if (activeTab === "age") {
          const [min, max] = ageRange;
          data = await getAgeFilteredMatches(min, max);
        }

        setProfiles((prev) => ({
          ...prev,
          [activeTab]: mapProfiles(data),
        }));
      } catch (err: any) {
        setError("Failed to load profiles");
      } finally {
        setLoading(false);
      }
    };
    loadTabData();
  }, [activeTab]);

  const mapProfiles = (data: any[]): Profile[] =>
    data.map((p) => ({
      id: p.user_id,
      name: p.full_name,
      age: p.age,
      bio: p.bio,
      compatibility: p.match_score,
      distance: p.distance_km ? `${p.distance_km.toFixed(1)} km` : undefined,
      imageUrl:
        "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400",
    }));

  const handleLike = (tabKey: string, profileId: string) => {
    dispatch(sendSwipe({ targetId: profileId, liked: true }));
    setProfiles((prev) => ({
      ...prev,
      [tabKey]: prev[tabKey].filter((p) => p.id !== profileId),
    }));
  };

  const handlePass = (tabKey: string, profileId: string) => {
    dispatch(sendSwipe({ targetId: profileId, liked: false }));
    setProfiles((prev) => ({
      ...prev,
      [tabKey]: prev[tabKey].filter((p) => p.id !== profileId),
    }));
  };

  const handleSuperLike = (tabKey: string, profileId: string) => {
    dispatch(sendSuperLike(profileId));
    setProfiles((prev) => ({
      ...prev,
      [tabKey]: prev[tabKey].filter((p) => p.id !== profileId),
    }));
  };

  return (
    <div className="min-h-screen relative">
      <CosmicBackground />
      <div className="relative z-10 container mx-auto px-4 pt-4 pb-20 max-w-lg">
        {loading && (
          <p className="text-center text-muted-foreground">Loading profiles...</p>
        )}
        {error && <p className="text-center text-destructive">{error}</p>}

        {!loading && !error && (
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full mt-2"
          >
            <TabsList className="glass-card w-full grid grid-cols-4 mb-4">
              <TabsTrigger value="nearby">Nearby</TabsTrigger>
              <TabsTrigger value="soulmates">
                <Heart className="w-4 h-4 mr-1 inline" /> Soulmates
              </TabsTrigger>
              <TabsTrigger value="fresh">Fresh</TabsTrigger>
              <TabsTrigger value="age">
                <SlidersHorizontal className="w-4 h-4 mr-1 inline" /> Age
              </TabsTrigger>
            </TabsList>

            {(["nearby", "soulmates", "fresh", "age"] as const).map((tabKey) => (
              <TabsContent key={tabKey} value={tabKey}>
                {/* AGE FILTER UI */}
                {tabKey === "age" && (
                  <div className="glass-card mb-4 p-4 rounded-2xl text-center">
                    <p className="text-sm text-muted-foreground mb-2">
                      Select age range
                    </p>
                    <Slider
                      min={18}
                      max={60}
                      step={1}
                      value={ageRange}
                      onValueChange={(v) => setAgeRange(v as [number, number])}
                      className="w-full accent-primary"
                    />
                    <p className="text-primary mt-2 font-semibold">
                      {ageRange[0]} - {ageRange[1]} yrs
                    </p>
                    <button
                      onClick={async () => {
                        setLoading(true);
                        const data = await getAgeFilteredMatches(
                          ageRange[0],
                          ageRange[1]
                        );
                        setProfiles((prev) => ({
                          ...prev,
                          age: mapProfiles(data),
                        }));
                        setLoading(false);
                      }}
                      className="mt-3 px-4 py-2 rounded-full bg-primary/80 hover:bg-primary text-white text-sm"
                    >
                      Refresh Matches
                    </button>
                  </div>
                )}

                <div className="relative h-[580px] mt-10">
                  {profiles[tabKey].length === 0 ? (
                    <div className="glass-card rounded-3xl p-15 text-center">
                      <p className="text-muted-foreground">No more profiles</p>
                    </div>
                  ) : (
                    <div className="relative w-full h-full">
                      {profiles[tabKey].map((profile, index) => {
                        if (!cardRefs.current[profile.id]) {
                          cardRefs.current[profile.id] = { current: null };
                        }
                        return (
                          <SwipeCard
                            key={profile.id}
                            ref={(el) =>
                              (cardRefs.current[profile.id].current = el)
                            }
                            profile={profile}
                            index={index}
                            total={profiles[tabKey].length}
                            onLike={() => handleLike(tabKey, profile.id)}
                            onPass={() => handlePass(tabKey, profile.id)}
                            onSuperLike={() => handleSuperLike(tabKey, profile.id)}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Control buttons */}
                <div className="flex justify-center gap-6 mt-6">
                  <button
                    onClick={() => {
                      const top = profiles[tabKey][profiles[tabKey].length - 1];
                      if (top)
                        cardRefs.current[top.id]?.current?.triggerAnimation("pass");
                    }}
                    className="glass-card w-14 h-14 rounded-full flex items-center justify-center hover:scale-110 transition-transform"
                  >
                    <X className="w-7 h-7 text-destructive" />
                  </button>
                  <button
                    onClick={() => {
                      const top = profiles[tabKey][profiles[tabKey].length - 1];
                      if (top)
                        cardRefs.current[top.id]?.current?.triggerAnimation("superlike");
                    }}
                    className="glass-card w-14 h-14 rounded-full flex items-center justify-center bg-gradient-to-t from-indigo-500 via-sky-400 to-pink-400 shadow-lg"
                  >
                    <Star className="w-7 h-7 text-white" />
                  </button>
                  <button
                    onClick={() => {
                      const top = profiles[tabKey][profiles[tabKey].length - 1];
                      if (top)
                        cardRefs.current[top.id]?.current?.triggerAnimation("like");
                    }}
                    className="glass-card w-16 h-16 rounded-full flex items-center justify-center hover:scale-110 transition-transform cosmic-glow"
                  >
                    <Heart className="w-8 h-8 text-primary" />
                  </button>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>
    </div>
  );
};

export default Discovery;
