// src/componenets/onboarding/GenderSelection


import { Heart, Sparkles, Users } from 'lucide-react';

interface GenderSelectionProps {
  selected?: string;
  onSelect: (gender: string) => void;
}

const genderOptions = [
  { id: 'woman', label: 'Woman', icon: Heart, gradient: 'from-pink-500 to-rose-500' },
  { id: 'man', label: 'Man', icon: Sparkles, gradient: 'from-blue-500 to-cyan-500' },
  { id: 'non-binary', label: 'Non-binary', icon: Users, gradient: 'from-purple-500 to-indigo-500' },
];

const GenderSelection = ({ selected, onSelect }: GenderSelectionProps) => {
  return (
    <div className="animate-slide-up">
      <h2 className="text-2xl font-bold text-center mb-3 text-foreground">I am a...</h2>
      <p className="text-muted-foreground text-center mb-12">
        Select your gender to help us personalize your cosmic journey
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {genderOptions.map((option) => {
          const Icon = option.icon;
          const isSelected = selected === option.id;
          
          return (
            <button
              key={option.id}
              onClick={() => onSelect(option.id)}
              className={`
                relative group p-8 rounded-3xl transition-all duration-300
                ${isSelected 
                  ? 'glass-card ring-2 ring-primary cosmic-glow scale-105' 
                  : 'glass-card hover:scale-105'
                }
              `}
            >
              <div className={`
                w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center
                bg-gradient-to-br ${option.gradient}
                ${isSelected ? 'animate-glow' : ''}
                transition-transform group-hover:scale-110
              `}>
                <Icon className="w-12 h-12 text-white" />
              </div>
              
              <h3 className="text-xl font-bold text-center text-foreground">
                {option.label}
              </h3>

              {isSelected && (
                <div className="absolute top-4 right-4">
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center animate-scale-in">
                    <Sparkles className="w-4 h-4 text-primary-foreground" />
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default GenderSelection;
