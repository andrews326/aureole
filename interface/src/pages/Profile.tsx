// ─────────────────────────────────────────────────────────────
//  PROFILE PAGE — Cosmic Aura Profile (with Circular Gallery)
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { useAppSelector } from "@/redux/hooks";
import { useDispatch } from "react-redux";
import { AppDispatch } from "@/redux/store";
import {
  fetchUser,
  uploadUserMedia,
  removeUserMedia,
  activateUserAura,
  editUser,
  setUserAvatar,
} from "@/redux/slices/userSlice";

import CosmicBackground from "@/components/CosmicBackground";
import AvatarGallery from "@/components/AvatarGallery";
import PhotoViewerModal from "@/components/PhotoViewerModal";
import UploadFloatingButton from "@/components/UploadFloatingButton";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Edit3, Check, X, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AvatarCosmic from "@/components/AvatarCosmic";
import { fetchBlockedUsers, unblockUser } from "@/services/sessionService";
import { ShieldX, Undo2 } from "lucide-react";


export default function Profile() {
  const dispatch = useDispatch<AppDispatch>();
  const { user, loading } = useAppSelector((state) => state.user);
  const { toast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [modalIndex, setModalIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    full_name: "",
    bio: "",
    interests: [] as string[],
  });
  const [newInterest, setNewInterest] = useState("");

  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [loadingBlocked, setLoadingBlocked] = useState(false);


  // ───────────────────────────────────────────────────
  //  LOAD USER
  // ───────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
  
    setFormData({
      full_name: user.full_name || "",
      bio: user.bio || user.raw_prompts?.about || "",
      interests:
        user.preferences?.interests ||
        user.raw_prompts?.interests ||
        [],
    });
  }, [user]);
  
  useEffect(() => {
    dispatch(fetchUser());
  }, [dispatch]);

  useEffect(() => {
    const loadBlocked = async () => {
      try {
        setLoadingBlocked(true);
        const res = await fetchBlockedUsers();
        setBlockedUsers(res.data.blocked || []);
      } catch (e) {
        console.error("Failed to load blocked users", e);
      } finally {
        setLoadingBlocked(false);
      }
    };
    loadBlocked();
  }, []);


  const handleUnblock = async (id: string) => {
    try {
      await unblockUser(id);
      setBlockedUsers((prev) => prev.filter((u) => u.id !== id));
  
      toast({
        title: "User unblocked",
        description: "You can now chat and interact again.",
      });
    } catch (e) {
      console.error("Unblock failed", e);
      toast({
        title: "Unblock failed",
        variant: "destructive",
      });
    }
  };
  
  

  // ───────────────────────────────────────────────────
  //  HANDLERS
  // ───────────────────────────────────────────────────
  const handleUpload = async (file: File) => {
    dispatch(uploadUserMedia(file))
      .unwrap()
      .then(() => toast({ title: "Photo uploaded!" }))
      .catch(() => toast({ title: "Upload failed", variant: "destructive" }));
  };

  const handleAura = () => {
    dispatch(activateUserAura())
      .unwrap()
      .then((res) =>
        toast({
          title: "✨ Aura Updated!",
          description: res.ai_summary,
        })
      )
      .catch(() =>
        toast({ title: "Aura generation failed", variant: "destructive" })
      );
  };

  const handleSave = () => {
    dispatch(
      editUser({
        full_name: formData.full_name,
        bio: formData.bio,
      })
    )
      .unwrap()
      .then(() => {
        setIsEditing(false);
        toast({ title: "Profile updated!" });
      })
      .catch(() => toast({ title: "Update failed", variant: "destructive" }));
  };

  const handleAddInterest = () => {
    const value = newInterest.trim();
    if (!value || formData.interests.includes(value)) return;
    setFormData((prev) => ({
      ...prev,
      interests: [...prev.interests, value],
    }));
    setNewInterest("");
  };

  const handleRemoveInterest = (interest: string) => {
    setFormData((prev) => ({
      ...prev,
      interests: prev.interests.filter((i) => i !== interest),
    }));
  };

  if (loading || !user)
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        Loading profile…
      </div>
    );

  // ───────────────────────────────────────────────────
  //  PREPARE MEDIA
  // ───────────────────────────────────────────────────
  const media = user.media || [];
  const heroPhoto =
    user.profile_photo || media[0]?.file_path || "/images/default-avatar.png";
  const mediumPhotos = media
    .filter((m) => m.file_path !== heroPhoto)
    .map((m) => m.file_path);
  const modalPhotos = [heroPhoto, ...mediumPhotos];

  // ───────────────────────────────────────────────────
  //  RENDER
  // ───────────────────────────────────────────────────
  return (
    <div className="min-h-screen relative text-white">
      <CosmicBackground />

      {/* MODAL */}
      {modalIndex !== null && (
        <PhotoViewerModal
          photos={modalPhotos}
          index={modalIndex}
          onClose={() => setModalIndex(null)}
          onSetAvatar={(src) => {
            const mediaItem = user.media.find((m) => m.file_path === src);
            if (mediaItem) dispatch(setUserAvatar(mediaItem.id));
          }}
          onDelete={(src) => {
            const mediaItem = user.media.find((m) => m.file_path === src);
            if (mediaItem) {
              dispatch(removeUserMedia(mediaItem.id));
              toast({ title: "Photo removed" });
            }
          }}
        />
      )}

      <div className="relative z-10 container max-w-2xl mx-auto px-4 py-6 pb-24">
        {/* HEADER */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-cosmic">My Profile</h1>
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button size="sm" onClick={handleSave} className="bg-green-600">
                  <Check className="w-4 h-4 mr-1" /> Save
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setIsEditing(false)}
                >
                  <X className="w-4 h-4 mr-1" /> Cancel
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setIsEditing(true)}
              >
                <Edit3 className="w-4 h-4 mr-1" /> Edit
              </Button>
            )}
          </div>
        </div>

        {/* AVATAR + INFO */}
        <Card className="glass-card mb-6">
          <CardHeader>
            <div className="flex items-start gap-4">
              <AvatarCosmic src={heroPhoto} size={120} />
              <div className="flex-1">
                {isEditing ? (
                  <Input
                    value={formData.full_name}
                    onChange={(e) =>
                      setFormData({ ...formData, full_name: e.target.value })
                    }
                    className="text-xl font-semibold"
                  />
                ) : (
                  <CardTitle className="text-2xl">{user.full_name}</CardTitle>
                )}
                <p className="text-muted-foreground">
                  {user.age ? `${user.age} years old` : ""}
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {isEditing ? (
              <Textarea
                value={formData.bio}
                onChange={(e) =>
                  setFormData({ ...formData, bio: e.target.value })
                }
                placeholder="Write something about yourself..."
              />
            ) : (
              <p className="leading-relaxed text-foreground/90">{user.bio}</p>
            )}
          </CardContent>
        </Card>

        {/* PHOTO GALLERY */}
        <AvatarGallery photos={modalPhotos} onOpen={(i) => setModalIndex(i)} />

        {/* INTERESTS */}
        <Card className="glass-card mb-6">
          <CardHeader>
            <CardTitle>Interests</CardTitle>
          </CardHeader>

          <CardContent>
            <div className="flex flex-wrap gap-2 mb-4">
              {formData.interests.map((interest) => (
                <Badge
                  key={interest}
                  className="px-3 py-2 glass-card text-sm flex items-center gap-2 neon-border"
                >
                  {interest}
                  {isEditing && (
                    <button
                      className="text-xs opacity-60 hover:text-red-400"
                      onClick={() => handleRemoveInterest(interest)}
                    >
                      ×
                    </button>
                  )}
                </Badge>
              ))}
            </div>

            {isEditing && (
              <div className="flex gap-2">
                <Input
                  placeholder="Add interest…"
                  value={newInterest}
                  onChange={(e) => setNewInterest(e.target.value)}
                />
                <Button
                  variant="secondary"
                  disabled={!newInterest.trim()}
                  onClick={handleAddInterest}
                >
                  Add
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* AURA */}
        <Card className="glass-card mb-6">
          <CardHeader>
            <CardTitle>Your Aura</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm mb-4">{user.ai_summary}</p>
            <Button className="w-full cosmic-glow" onClick={handleAura}>
              <Sparkles className="w-4 h-4 mr-2" /> Refresh Aura
            </Button>
          </CardContent>
        </Card>


        {/* BLOCKED USERS */}
<Card className="glass-card mb-6">
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <ShieldX className="w-5 h-5 text-red-400" />
      Blocked Users
    </CardTitle>
  </CardHeader>

  <CardContent>
    {loadingBlocked ? (
      <p className="text-muted-foreground">Loading blocked users…</p>
    ) : blockedUsers.length === 0 ? (
      <p className="text-muted-foreground">You have not blocked anyone.</p>
    ) : (
      <div className="space-y-4">
        {blockedUsers.map((user) => (
          <div
            key={user.id}
            className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10"
          >
            <div className="flex items-center gap-3">
              <AvatarCosmic src={user.profile_photo} size={50} />
              <div>
                <div className="font-semibold">{user.full_name}</div>
                <div className="text-xs text-muted-foreground">
                  Blocked on {new Date(user.blocked_at).toLocaleString()}
                </div>
              </div>
            </div>

            <Button
              size="sm"
              variant="outline"
              className="text-green-300 border-green-300/40 hover:bg-green-300/10"
              onClick={() => handleUnblock(user.id)}
            >
              <Undo2 className="w-4 h-4 mr-1" />
              Unblock
            </Button>
          </div>
        ))}
      </div>
    )}
  </CardContent>
</Card>


        {/* STATS */}
        <div className="grid grid-cols-3 gap-4">
          {["views", "matches", "response_rate"].map((key) => {
            const label =
              key === "views"
                ? "Views"
                : key === "matches"
                ? "Matches"
                : "Response Rate";
            const value =
              key === "response_rate"
                ? Math.round((user.stats?.response_rate ?? 0) * 100) + "%"
                : user.stats?.[key] ?? 0;
            return (
              <Card key={key} className="glass-card text-center neon-border">
                <CardContent className="pt-6">
                  <div className="text-3xl font-bold text-cosmic mb-1">
                    {value}
                  </div>
                  <div className="text-sm text-muted-foreground">{label}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* FLOATING UPLOAD BUTTON */}
      <UploadFloatingButton onUpload={handleUpload} />
    </div>
  );
}
