// src/pages/Profile.tsx


import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "@/redux/store";
import {
  fetchUser,
  uploadUserMedia,
  removeUserMedia,
  activateUserAura,
  editUser,
} from "@/redux/slices/userSlice";
import CosmicBackground from "@/components/CosmicBackground";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Camera, Sparkles, Edit3, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export default function Profile() {
  const dispatch = useDispatch<AppDispatch>();
  const { user, loading } = useSelector((state: RootState) => state.user);
  const { toast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    bio: "",
    interests: [] as string[],
  });
  const [newInterest, setNewInterest] = useState("");

  useEffect(() => {
    dispatch(fetchUser());
  }, [dispatch]);

  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name || "",
        bio: user.bio || "",
        interests: user.stats?.interests || [], // optional if backend later sends interests
      });
    }
  }, [user]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
  
    console.log("uploading:", file.name);
    dispatch(uploadUserMedia(file))
      .then((res) => {
        console.log("Thunk result:", res);
        if (res.meta.requestStatus === "fulfilled") {
          toast({ title: "Media uploaded successfully!" });
        } else {
          console.error("Rejected:", res);
          toast({ title: "Upload failed", variant: "destructive" });
        }
      })
      .catch((err) => {
        console.error("Unexpected:", err);
        toast({ title: "Upload failed", variant: "destructive" });
      });
  };
  

  const handleAura = () => {
    dispatch(activateUserAura())
      .unwrap()
      .then((res) =>
        toast({
          title: "✨ Aura Activated!",
          description: res.ai_summary,
        })
      )
      .catch(() =>
        toast({ title: "Failed to activate aura", variant: "destructive" })
      );
  };

  const handleSave = () => {
    dispatch(editUser({ full_name: formData.full_name, bio: formData.bio }))
      .unwrap()
      .then(() => {
        setIsEditing(false);
        toast({ title: "Profile updated!" });
      })
      .catch(() =>
        toast({ title: "Failed to update", variant: "destructive" })
      );
  };

  const handleAddInterest = () => {
    if (newInterest.trim() && !formData.interests.includes(newInterest)) {
      setFormData((prev) => ({
        ...prev,
        interests: [...prev.interests, newInterest.trim()],
      }));
      setNewInterest("");
    }
  };

  const handleRemoveInterest = (interest: string) => {
    setFormData((prev) => ({
      ...prev,
      interests: prev.interests.filter((i) => i !== interest),
    }));
  };

  if (loading || !user)
    return (
      <div className="min-h-screen flex justify-center items-center">
        <p>Loading profile...</p>
      </div>
    );

  return (
    <div className="min-h-screen relative">
      <CosmicBackground />

      <div className="relative z-10 container max-w-2xl mx-auto px-4 py-6 pb-20">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-cosmic">My Profile</h1>
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button
                  size="sm"
                  onClick={handleSave}
                  className="bg-green-600 hover:bg-green-700"
                >
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
              <Button size="sm" variant="secondary" onClick={() => setIsEditing(true)}>
                <Edit3 className="w-4 h-4 mr-1" /> Edit
              </Button>
            )}
          </div>
        </div>

        {/* Profile Card */}
        <Card className="glass-card mb-6">
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="relative">
                <Avatar className="w-24 h-24 border-4 border-primary/30 star-glow">
                <AvatarImage
  src={
    user.media && user.media.length > 0
      ? user.media[user.media.length - 1].file_path
      : undefined
  }
/>

                  <AvatarFallback>
                    {user.full_name?.slice(0, 2).toUpperCase() ?? "US"}
                  </AvatarFallback>
                </Avatar>
                <Button
                  size="icon"
                  className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full"
                  variant="secondary"
                  onClick={() => document.getElementById("file-input")?.click()}
                >
                  <Camera className="w-4 h-4" />
                </Button>
                <input
                  id="file-input"
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={handleUpload}
                />
              </div>

              <div className="flex-1">
                {isEditing ? (
                  <Input
                    value={formData.full_name}
                    onChange={(e) =>
                      setFormData({ ...formData, full_name: e.target.value })
                    }
                    className="text-lg font-medium"
                    placeholder="Enter full name"
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
              <p className="text-foreground/90 leading-relaxed">{user.bio}</p>
            )}
          </CardContent>
        </Card>

        {/* Interests */}
        <Card className="glass-card mb-6">
          <CardHeader>
            <CardTitle>Interests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 mb-3">
              {formData.interests.map((interest, i) => (
                <Badge
                  key={i}
                  variant="secondary"
                  className="px-3 py-2 text-sm flex items-center gap-1"
                >
                  {interest}
                  {isEditing && (
                    <button
                      className="ml-1 text-xs hover:text-destructive"
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
                  placeholder="Add interest..."
                  value={newInterest}
                  onChange={(e) => setNewInterest(e.target.value)}
                />
                <Button
                  variant="secondary"
                  onClick={handleAddInterest}
                  disabled={!newInterest.trim()}
                >
                  Add
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Aura */}
        <Card className="glass-card mb-6">
          <CardHeader>
            <CardTitle>Your Cosmic Essence</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm mb-4">{user.ai_summary}</p>
            <Button className={cn("w-full", "cosmic-glow")} onClick={handleAura}>
              <Sparkles className="w-4 h-4 mr-2" /> Generate Aura
            </Button>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="glass-card text-center">
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-cosmic mb-1">
                {user.stats?.views ?? 0}
              </div>
              <div className="text-sm text-muted-foreground">Views</div>
            </CardContent>
          </Card>

          <Card className="glass-card text-center">
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-cosmic mb-1">
                {user.stats?.matches ?? 0}
              </div>
              <div className="text-sm text-muted-foreground">Matches</div>
            </CardContent>
          </Card>

          <Card className="glass-card text-center">
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-cosmic mb-1">
                {Math.round((user.stats?.response_rate ?? 0) * 100)}%
              </div>
              <div className="text-sm text-muted-foreground">
                Response Rate
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}