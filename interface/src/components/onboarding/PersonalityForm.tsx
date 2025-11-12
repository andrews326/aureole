// src/components/onboarding/PersonalityForm.tsx

import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface Props {
  data: {
    full_name: string;
    age: string | number | "";
    bio: string;
    preference: string;
    relationship_status: string;
    about: string;
    looking_for: string;
    dealbreakers: string[];
  };
  updateData: (updates: Partial<Props["data"]>) => void;
}

const DEALBREAKER_OPTIONS = [
  "dishonesty", "smoking", "disrespect", "poor communication",
  "negativity", "no ambition",
];

const PersonalityForm: React.FC<Props> = ({ data, updateData }) => {
  const [customDealbreaker, setCustomDealbreaker] = useState("");

  const toggleDealbreaker = (value: string) => {
    updateData({
      dealbreakers: data.dealbreakers.includes(value)
        ? data.dealbreakers.filter((v) => v !== value)
        : [...data.dealbreakers, value],
    });
  };

  const addCustomDealbreaker = () => {
    if (!customDealbreaker.trim()) return;
    updateData({ dealbreakers: [...data.dealbreakers, customDealbreaker.trim()] });
    setCustomDealbreaker("");
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <h2 className="text-2xl font-semibold text-center text-cosmic mb-4">
        Complete Your Profile 🌌
      </h2>

      {/* Full Name */}
      <div className="space-y-2">
        <Label htmlFor="full_name">Full Name</Label>
        <Input
          id="full_name"
          placeholder="Your full name"
          value={data.full_name}
          onChange={(e) => updateData({ full_name: e.target.value })}
          className="glass-input w-full"
        />
      </div>

      {/* Age */}
      <div className="space-y-2">
        <Label htmlFor="age">Age</Label>
        <Input
          id="age"
          type="number"
          placeholder="Your age"
          value={data.age}
          onChange={(e) => updateData({ age: Number(e.target.value) })}
          className="glass-input w-full"
        />
      </div>

      {/* Bio */}
      <div className="space-y-2">
        <Label htmlFor="bio">Bio</Label>
        <Textarea
          id="bio"
          placeholder="Short bio about yourself"
          value={data.bio}
          onChange={(e) => updateData({ bio: e.target.value })}
          className="glass-input min-h-[80px]"
        />
      </div>

      {/* Preference */}
      <div className="space-y-2">
        <Label htmlFor="preference">Preference</Label>
        <Input
          id="preference"
          placeholder="Who are you interested in?"
          value={data.preference}
          onChange={(e) => updateData({ preference: e.target.value })}
          className="glass-input w-full"
        />
      </div>

      {/* Relationship Status */}
      <div className="space-y-2">
        <Label htmlFor="relationship_status">Relationship Status</Label>
        <Input
          id="relationship_status"
          placeholder="Single, Divorced, etc."
          value={data.relationship_status}
          onChange={(e) => updateData({ relationship_status: e.target.value })}
          className="glass-input w-full"
        />
      </div>

      {/* About */}
      <div className="space-y-2">
        <Label htmlFor="about">About You</Label>
        <Textarea
          id="about"
          placeholder="Tell us more about yourself..."
          value={data.about}
          onChange={(e) => updateData({ about: e.target.value })}
          className="glass-input min-h-[100px]"
        />
      </div>

      {/* Looking For */}
      <div className="space-y-2">
        <Label htmlFor="looking_for">Looking For</Label>
        <Textarea
          id="looking_for"
          placeholder="What are you looking for in a partner?"
          value={data.looking_for}
          onChange={(e) => updateData({ looking_for: e.target.value })}
          className="glass-input min-h-[80px]"
        />
      </div>

      {/* Dealbreakers */}
      <div className="space-y-3">
        <Label>Dealbreakers</Label>
        <div className="flex flex-wrap gap-2">
          {DEALBREAKER_OPTIONS.map((tag) => (
            <button
              key={tag}
              type="button"
              className={`px-3 py-1 rounded-full text-sm border transition-all ${
                data.dealbreakers.includes(tag)
                  ? "bg-destructive text-white border-destructive"
                  : "border-white/10 hover:border-white/30"
              }`}
              onClick={() => toggleDealbreaker(tag)}
            >
              {tag}
            </button>
          ))}
        </div>

        <div className="flex gap-2 mt-2">
          <Input
            value={customDealbreaker}
            placeholder="Add custom dealbreaker"
            onChange={(e) => setCustomDealbreaker(e.target.value)}
          />
          <Button variant="outline" onClick={addCustomDealbreaker}>
            Add
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PersonalityForm;