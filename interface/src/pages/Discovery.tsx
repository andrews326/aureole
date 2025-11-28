// src/pages/Discovery.tsx


import { useState, useEffect, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDispatch } from "react-redux";
import { AppDispatch } from "@/redux/store";
import { sendSwipe, sendSuperLike } from "@/redux/slices/swipeSlice";
import CosmicBackground from "@/components/CosmicBackground";
import SwipeCard from "@/components/SwipeCard";
import { Heart, X, Star, SlidersHorizontal } from "lucide-react";
import { Profile } from "@/types/types";
import {
  getRecommendations,
  getProximityMatches,
  getCompatibilityMatches,
  getFreshRecommendations,
  getAgeFilteredMatches,
} from "@/services/matchService";
import FilterPanel from "@/components/FilterPanel";

const Discovery = () => {
  const [activeTab, setActiveTab] = useState<string>("nearby"); 
  const [profiles, setProfiles] = useState<Record<string, Profile[]>>({
    nearby: [],
    soulmates: [],
    fresh: [],
    age: [],
  });
  const currentProfiles = profiles[activeTab] || [];
  const visible = currentProfiles.slice(-3);

  const [ageRange, setAgeRange] = useState<[number, number]>([20, 35]);
  const [loading, setLoading] = useState(true);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const dispatch = useDispatch<AppDispatch>();
  const cardRefs = useRef<Record<string, any>>({});

  // ------------------------------------------
  // LOAD ONLY "NEARBY" ON PAGE OPEN
  // ------------------------------------------
  useEffect(() => {
    const loadNearby = async () => {
      try {
        setLoading(true);
        const data = await getRecommendations();
        setProfiles(prev => ({
          ...prev,
          nearby: mapProfiles(data),
        }));
      } finally {
        setLoading(false);
      }
    };
    loadNearby();
  }, []);

  // ------------------------------------------
  // HANDLE TAB CHANGES
  // ------------------------------------------
  const handleTabChange = async (tab: string) => {
    setActiveTab(tab);

    if (tab === "age") {
      // ✅ don't call API automatically
      return;
    }

    if (tab === "soulmates" && profiles.soulmates.length === 0) {
      setLoading(true);
      const data = await getCompatibilityMatches();
      setProfiles(prev => ({ ...prev, soulmates: mapProfiles(data) }));
      setLoading(false);
      return;
    }

    if (tab === "fresh" && profiles.fresh.length === 0) {
      setLoading(true);
      const data = await getFreshRecommendations();
      setProfiles(prev => ({ ...prev, fresh: mapProfiles(data) }));
      setLoading(false);
      return;
    }

    if (tab === "nearby" && profiles.nearby.length === 0) {
      setLoading(true);
      const data = await getProximityMatches();
      setProfiles(prev => ({ ...prev, nearby: mapProfiles(data) }));
      setLoading(false);
      return;
    }
  };

  // ------------------------------------------
  // NORMALIZATION
  // ------------------------------------------
  const mapProfiles = (list: any[]): Profile[] =>
    list.map(p => ({
      id: p.user_id,
      name: p.full_name,
      age: p.age,
      bio: p.bio,
      compatibility: p.match_score,
      distance: p.distance_km ? `${p.distance_km.toFixed(1)} km` : undefined,
      photos: p.photos || [],
    }));

  // ------------------------------------------
  // SWIPE ACTIONS
  // ------------------------------------------
  const handleLike = (tab: string, id: string) => {
    dispatch(sendSwipe({ targetId: id, liked: true }));
    setProfiles(p => ({ ...p, [tab]: p[tab].filter(x => x.id !== id) }));
  };
  const handlePass = (tab: string, id: string) => {
    dispatch(sendSwipe({ targetId: id, liked: false }));
    setProfiles(p => ({ ...p, [tab]: p[tab].filter(x => x.id !== id) }));
  };
  const handleSuperLike = (tab: string, id: string) => {
    dispatch(sendSuperLike(id));
    setProfiles(p => ({ ...p, [tab]: p[tab].filter(x => x.id !== id) }));
  };

  // ------------------------------------------
  // UI
  // ------------------------------------------
  return (
    <div className="min-h-screen relative">
      <CosmicBackground />
      <div className="relative z-10 container mx-auto px-4 pt-4 pb-20 max-w-lg">

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="glass-card w-full grid grid-cols-4 mb-4">
            <TabsTrigger value="nearby">Nearby</TabsTrigger>
            <TabsTrigger value="soulmates">
              <Heart className="w-4 h-4 mr-1" /> Soulmates
            </TabsTrigger>
            <TabsTrigger value="fresh">Fresh</TabsTrigger>
            <TabsTrigger value="age">
              <SlidersHorizontal className="w-4 h-4 mr-1" /> Age
            </TabsTrigger>
          </TabsList>

          {(["nearby", "soulmates", "fresh", "age"] as const).map(tab => (
            <TabsContent key={tab} value={tab}>
              {tab === "age" && (
                <div className="text-center my-8">
                  <button
                    onClick={() => setIsFilterOpen(true)}
                    className="px-6 py-2 rounded-full text-sm font-semibold
                               bg-gradient-to-r from-blue-500 to-purple-500 text-white
                               shadow-[0_0_18px_rgba(80,150,255,0.5)] hover:shadow-[0_0_25px_rgba(80,150,255,0.7)]
                               transition-all"
                  >
                    Open Filters
                  </button>
                </div>
              )}

              <div className="relative h-[580px] mt-10">
                {loading && profiles[tab].length === 0 ? (
                  <div className="glass-card rounded-3xl p-10 text-center">
                    Loading...
                  </div>
                ) : profiles[tab].length === 0 ? (
                  <div className="glass-card rounded-3xl p-10 text-center">
                    No more profiles
                  </div>
                ) : (
                  <div className="relative w-full h-full">
                    {visible.map((p, i) => (
                      <SwipeCard
                        key={p.id}
                        ref={el => (cardRefs.current[p.id] = { current: el })}
                        profile={p}
                        index={i}
                        total={visible.length}
                        onLike={() => handleLike(activeTab, p.id)}
                        onPass={() => handlePass(activeTab, p.id)}
                        onSuperLike={() => handleSuperLike(activeTab, p.id)}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-center gap-6 mt-6">
                <button
                  onClick={() => {
                    const top = profiles[tab].at(-1);
                    top?.id &&
                      cardRefs.current[top.id]?.current?.triggerAnimation("pass");
                  }}
                  className="glass-card w-14 h-14 flex items-center justify-center rounded-full"
                >
                  <X className="w-7 h-7 text-red-400" />
                </button>

                <button
                  onClick={() => {
                    const top = profiles[tab].at(-1);
                    top?.id &&
                      cardRefs.current[top.id]?.current?.triggerAnimation("superlike");
                  }}
                  className="glass-card w-14 h-14 flex items-center justify-center rounded-full bg-gradient-to-t from-indigo-500 via-sky-400 to-pink-400"
                >
                  <Star className="w-7 h-7 text-white" />
                </button>

                <button
                  onClick={() => {
                    const top = profiles[tab].at(-1);
                    top?.id &&
                      cardRefs.current[top.id]?.current?.triggerAnimation("like");
                  }}
                  className="glass-card w-16 h-16 flex items-center justify-center rounded-full cosmic-glow"
                >
                  <Heart className="w-8 h-8 text-primary" />
                </button>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* 🌌 Modal Overlay for Filter */}
      {isFilterOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
          <div className="relative w-[90%] max-w-md">
            <FilterPanel
              initialRange={ageRange}
              onApply={async (min, max, gender) => {
                setLoading(true);
                const data = await getAgeFilteredMatches(min, max, gender);
                setProfiles(prev => ({
                  ...prev,
                  age: mapProfiles(data),
                }));
                setAgeRange([min, max]);
                setLoading(false);
                setIsFilterOpen(false); // ✅ close after applying
              }}
              onClose={() => setIsFilterOpen(false)} // ✅ close on cancel
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Discovery;