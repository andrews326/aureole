// src/components/FilterPanel.tsx


import React, { useState } from "react";
import { Sparkles, SlidersHorizontal, RotateCcw, X } from "lucide-react";
import { Slider } from "@/components/ui/slider";

interface FilterPanelProps {
  onApply: (min: number, max: number, gender: string[]) => void;
  onClose: () => void;
  initialRange?: [number, number];
}

const GENDER_OPTIONS = ["Men", "Women", "Non-binary"];

const FilterPanel: React.FC<FilterPanelProps> = ({
  onApply,
  onClose,
  initialRange = [20, 35],
}) => {
  const [ageRange, setAgeRange] = useState<[number, number]>(initialRange);
  const [selectedGenders, setSelectedGenders] = useState<string[]>([]);

  const toggleGender = (g: string) => {
    setSelectedGenders((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]
    );
  };

  const handleApply = () => {
    const [min, max] = ageRange;
    onApply(min, max, selectedGenders.map((g) => g.toLowerCase()));
    onClose(); // ✅ close modal after applying
  };

  const handleReset = () => {
    setAgeRange([20, 35]);
    setSelectedGenders([]);
  };

  return (
    <div
      className="relative glass-card p-6 rounded-2xl text-center
                 bg-white/10 backdrop-blur-xl border border-white/10
                 shadow-[0_0_25px_rgba(80,150,255,0.25)] transition-all
                 animate-scaleIn"
    >
      {/* ❌ Close Button */}
      <button
        onClick={onClose}
        className="absolute top-3 right-3 text-white/70 hover:text-white transition"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Header */}
      <div className="flex items-center justify-center gap-2 mb-4 text-white/80">
        <SlidersHorizontal className="w-5 h-5 text-blue-400" />
        <h3 className="font-semibold text-sm tracking-wide uppercase">
          Filters
        </h3>
      </div>

      {/* AGE RANGE */}
      <div className="mb-6 relative">
        <p className="text-xs text-white/60 mb-3">Preferred age range</p>

        <div className="relative px-1 py-4">
          <Slider
            min={18}
            max={80}
            step={1}
            value={ageRange}
            onValueChange={(v) => setAgeRange(v as [number, number])}
            className="w-full relative z-10"
          />

          {/* Glowing Track */}
          <div className="absolute top-[50%] left-0 h-[4px] rounded-full bg-white/10 -translate-y-1/2" />
          <div
            className="absolute top-[50%] h-[4px] rounded-full bg-gradient-to-r 
                       from-blue-500 via-indigo-400 to-purple-500
                       shadow-[0_0_10px_rgba(80,150,255,0.6)] -translate-y-1/2 pointer-events-none"
            style={{
              left: `${((ageRange[0] - 18) / (80 - 18)) * 100}%`,
              width: `${((ageRange[1] - ageRange[0]) / (80 - 18)) * 100}%`,
            }}
          ></div>

          {/* Tooltip bubbles */}
          <div
            className="absolute -top-3 text-xs text-white/80"
            style={{
              left: `calc(${((ageRange[0] - 18) / (80 - 18)) * 100}% - 12px)`,
            }}
          >
            {ageRange[0]}
          </div>
          <div
            className="absolute -top-3 text-xs text-white/80"
            style={{
              left: `calc(${((ageRange[1] - 18) / (80 - 18)) * 100}% - 12px)`,
            }}
          >
            {ageRange[1]}
          </div>
        </div>

        <div className="flex justify-between mt-3 text-sm text-blue-400 font-medium">
          <span>{ageRange[0]} yrs</span>
          <span>{ageRange[1]} yrs</span>
        </div>
      </div>

      {/* GENDER OPTIONS */}
      <div className="mb-6">
        <p className="text-xs text-white/60 mb-2">Show me</p>
        <div className="flex justify-center flex-wrap gap-3">
          {GENDER_OPTIONS.map((g) => (
            <button
              key={g}
              onClick={() => toggleGender(g)}
              className={`px-4 py-1.5 rounded-full border text-sm transition-all duration-200
                ${
                  selectedGenders.includes(g)
                    ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white border-transparent shadow-[0_0_12px_rgba(80,150,255,0.4)]"
                    : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* ACTION BUTTONS */}
      <div className="flex justify-center gap-4 mt-5">
        <button
          onClick={handleReset}
          className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition"
        >
          <RotateCcw className="w-4 h-4" /> Reset
        </button>

        <button
          onClick={handleApply}
          className="flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold
                     bg-gradient-to-r from-blue-500 to-purple-500 text-white
                     shadow-[0_0_18px_rgba(80,150,255,0.5)] hover:shadow-[0_0_25px_rgba(80,150,255,0.7)]
                     transition-all"
        >
          <Sparkles className="w-4 h-4" /> Apply Filters
        </button>
      </div>
    </div>
  );
};

export default FilterPanel;