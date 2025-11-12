// src/components/onboarding/BasicInfoForm.tsx


import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Props {
  data: {
    full_name: string;
    age: string | number;
    gender: string;
    preference: string;
    relationship_status: string;
  };
  updateData: (updates: Partial<Props["data"]>) => void;
}

const GENDER_OPTIONS = ["male", "female", "non-binary", "transgender", "other"];
const PREFERENCE_OPTIONS = ["straight", "gay", "bisexual", "asexual", "pansexual", "queer", "other"];
const RELATIONSHIP_OPTIONS = ["single", "in a relationship", "married", "divorced", "complicated"];

const BasicInfoForm: React.FC<Props> = ({ data, updateData }) => {
  return (
    <div className="space-y-6 animate-fadeIn">
      <h2 className="text-2xl font-semibold text-center text-cosmic mb-4">Tell us about yourself 🌙</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Full Name */}
        <div className="flex flex-col space-y-2">
          <Label htmlFor="full_name">Full Name</Label>
          <Input
            id="full_name"
            type="text"
            placeholder="Your full name"
            value={data.full_name}
            onChange={(e) => updateData({ full_name: e.target.value })}
          />
        </div>

        {/* Age */}
        <div className="flex flex-col space-y-2">
          <Label htmlFor="age">Age</Label>
          <Input
            id="age"
            type="number"
            placeholder="18"
            min={18}
            value={data.age}
            onChange={(e) => updateData({ age: e.target.value })}
          />
        </div>
      </div>

      {/* Gender */}
      <div className="flex flex-col space-y-2">
        <Label>Gender</Label>
        <Select value={data.gender} onValueChange={(v) => updateData({ gender: v })}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select your gender" />
          </SelectTrigger>
          <SelectContent>
            {GENDER_OPTIONS.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt.charAt(0).toUpperCase() + opt.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Preference */}
      <div className="flex flex-col space-y-2">
        <Label>Preference</Label>
        <Select value={data.preference} onValueChange={(v) => updateData({ preference: v })}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Who are you interested in?" />
          </SelectTrigger>
          <SelectContent>
            {PREFERENCE_OPTIONS.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt.charAt(0).toUpperCase() + opt.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Relationship Status */}
      <div className="flex flex-col space-y-2">
        <Label>Relationship Status</Label>
        <Select
          value={data.relationship_status}
          onValueChange={(v) => updateData({ relationship_status: v })}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Your current relationship status" />
          </SelectTrigger>
          <SelectContent>
            {RELATIONSHIP_OPTIONS.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt.charAt(0).toUpperCase() + opt.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default BasicInfoForm;