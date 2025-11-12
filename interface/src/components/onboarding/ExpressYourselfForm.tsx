// src/components/onboarding/ExpressYourselfForm.tsx

import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface Props {
  data: {
    full_name: string;
    age: number | string;
    gender: string;
    bio: string;
    about: string;
    relationship_status: string;
    looking_for: string;
    preference: string;
    interests: string[];
    dealbreakers: string[];
  };
  onChange: (updates: Partial<Props["data"]>) => void;
  aiSummary?: string; // optional — shown after profile setup
}

const RELATIONSHIP_STATUS = [
  "Single",
  "In a relationship",
  "Divorced",
  "Widowed",
  "Prefer not to say",
];

const PREFERENCE_OPTIONS = ["Women", "Men", "Everyone"];

const BIO_OPTIONS = [
  "Adventurous", "Creative", "Intellectual", "Humorous",
  "Ambitious", "Introvert", "Extrovert", "Empathetic",
];

const INTEREST_OPTIONS = [
  "Music", "Travel", "Fitness", "Art", "Reading", "Technology",
  "Spirituality", "Nature", "Movies", "Foodie", "Sports",
];

const DEALBREAKER_OPTIONS = [
  "Dishonesty", "Smoking", "Disrespect", "Poor communication",
  "Negativity", "No ambition",
];

const ExpressYourselfForm: React.FC<Props> = ({ data, onChange, aiSummary }) => {
  const [customInterest, setCustomInterest] = useState("");
  const [customDealbreaker, setCustomDealbreaker] = useState("");

  const toggleTag = (field: "interests" | "dealbreakers", value: string) => {
    onChange({
      [field]: data[field].includes(value)
        ? data[field].filter((v) => v !== value)
        : [...data[field], value],
    });
  };

  const addCustomTag = (field: "interests" | "dealbreakers", value: string) => {
    if (!value.trim()) return;
    onChange({ [field]: [...data[field], value.trim()] });
    if (field === "interests") setCustomInterest("");
    else setCustomDealbreaker("");
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      <h2 className="text-2xl font-semibold text-center text-cosmic mb-4">
        Express Yourself 🌠
      </h2>

      {/* Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="full_name">Full Name</Label>
          <Input
            id="full_name"
            placeholder="Your name"
            value={data.full_name}
            onChange={(e) => onChange({ full_name: e.target.value })}
          />
        </div>

        <div>
          <Label htmlFor="age">Age</Label>
          <Input
            id="age"
            type="number"
            placeholder="Age"
            value={data.age}
            onChange={(e) => onChange({ age: e.target.value })}
          />
        </div>
      </div>

      {/* Personality / Bio */}
      <div className="space-y-2">
        <Label htmlFor="bio">Personality Type</Label>
        <select
          id="bio"
          value={data.bio}
          onChange={(e) => onChange({ bio: e.target.value })}
          className="glass-input w-full rounded-md border border-white/10 bg-transparent p-2 text-white"
        >
          <option value="">Select one</option>
          {BIO_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>

      {/* Relationship & Preference */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="relationship_status">Relationship Status</Label>
          <select
            id="relationship_status"
            value={data.relationship_status}
            onChange={(e) => onChange({ relationship_status: e.target.value })}
            className="glass-input w-full rounded-md border border-white/10 bg-transparent p-2 text-white"
          >
            <option value="">Select one</option>
            {RELATIONSHIP_STATUS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label htmlFor="preference">Looking For (Preference)</Label>
          <select
            id="preference"
            value={data.preference}
            onChange={(e) => onChange({ preference: e.target.value })}
            className="glass-input w-full rounded-md border border-white/10 bg-transparent p-2 text-white"
          >
            <option value="">Select one</option>
            {PREFERENCE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* About You */}
      <div className="space-y-2">
        <Label htmlFor="about">About You</Label>
        <Textarea
          id="about"
          placeholder="Tell us a bit about yourself..."
          value={data.about}
          onChange={(e) => onChange({ about: e.target.value })}
          className="glass-input min-h-[120px]"
        />
      </div>

      {/* Looking For */}
      <div className="space-y-2">
        <Label htmlFor="looking_for">What are you looking for?</Label>
        <Textarea
          id="looking_for"
          placeholder="Describe the kind of connection you seek..."
          value={data.looking_for}
          onChange={(e) => onChange({ looking_for: e.target.value })}
          className="glass-input min-h-[100px]"
        />
      </div>

      {/* Interests */}
      <div className="space-y-3">
        <Label>Interests</Label>
        <div className="flex flex-wrap gap-2">
          {INTEREST_OPTIONS.map((tag) => (
            <button
              key={tag}
              type="button"
              className={`px-3 py-1 rounded-full text-sm border transition-all ${
                data.interests.includes(tag)
                  ? "bg-primary text-white border-primary"
                  : "border-white/10 hover:border-white/30"
              }`}
              onClick={() => toggleTag("interests", tag)}
            >
              {tag}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <Input
            value={customInterest}
            placeholder="Add custom interest"
            onChange={(e) => setCustomInterest(e.target.value)}
          />
          <Button
            variant="outline"
            onClick={() => addCustomTag("interests", customInterest)}
          >
            Add
          </Button>
        </div>
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
              onClick={() => toggleTag("dealbreakers", tag)}
            >
              {tag}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <Input
            value={customDealbreaker}
            placeholder="Add custom dealbreaker"
            onChange={(e) => setCustomDealbreaker(e.target.value)}
          />
          <Button
            variant="outline"
            onClick={() => addCustomTag("dealbreakers", customDealbreaker)}
          >
            Add
          </Button>
        </div>
      </div>

      {/* AI Summary (after setup) */}
      {aiSummary && (
        <div className="p-4 rounded-lg bg-white/10 border border-white/20 mt-8">
          <h3 className="font-semibold mb-2 text-lg">Your AI Profile Summary ✨</h3>
          <p className="text-sm text-gray-200 leading-relaxed">{aiSummary}</p>
        </div>
      )}
    </div>
  );
};

export default ExpressYourselfForm;