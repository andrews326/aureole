import { useState } from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface BioSuggestionsProps {
  interests: string[];
  gender?: string;
  bio: string;
  onUpdate: (bio: string) => void;
}

// Mock AI suggestions - can be replaced with real AI later
const generateMockSuggestions = (interests: string[], gender?: string): string[] => {
  const templates = [
    `Cosmic soul exploring the universe through ${interests[0]} and ${interests[1] || 'adventure'}. Let's create stardust together ✨`,
    `${gender === 'woman' ? 'She' : gender === 'man' ? 'He' : 'They'} who finds magic in ${interests[0]}. Seeking deep connections and midnight conversations 🌙`,
    `Wanderer of galaxies, lover of ${interests[0]} and ${interests[1] || 'good vibes'}. Ready to find my cosmic match 💫`,
    `Life is a beautiful journey. Passionate about ${interests[0]}, ${interests[1] || 'exploring'}, and authentic connections 🌟`,
  ];
  
  return templates.slice(0, 3);
};

const BioSuggestions = ({ interests, gender, bio, onUpdate }: BioSuggestionsProps) => {
  const [suggestions] = useState(() => generateMockSuggestions(interests, gender));
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 500);
    // In real implementation, this would call the AI API
  };

  const handleUseSuggestion = (suggestion: string) => {
    onUpdate(suggestion);
  };

  return (
    <div className="animate-slide-up">
      <h2 className="text-2xl font-bold text-center mb-3 text-foreground">
        Craft Your Cosmic Bio
      </h2>
      <p className="text-muted-foreground text-center mb-8">
        Write your own or use our AI-powered suggestions
      </p>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-3 text-foreground">
            Your Bio
          </label>
          <Textarea
            value={bio}
            onChange={(e) => onUpdate(e.target.value)}
            placeholder="Tell the universe about yourself..."
            className="glass-input min-h-[120px] resize-none text-foreground placeholder:text-muted-foreground"
            maxLength={300}
          />
          <p className="text-xs text-muted-foreground mt-2 text-right">
            {bio.length} / 300 characters
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary animate-glow" />
              AI Suggestions
            </label>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="glass-card"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          <div className="space-y-3">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleUseSuggestion(suggestion)}
                className="w-full text-left p-4 rounded-xl glass-card hover:ring-2 hover:ring-primary/50 transition-all group"
                style={{
                  background: `linear-gradient(135deg, rgba(45, 156, 147, 0.1) 0%, rgba(99, 102, 241, 0.1) 100%)`,
                  animationDelay: `${index * 100}ms`,
                }}
              >
                <p className="text-sm text-foreground leading-relaxed group-hover:text-primary transition-colors">
                  {suggestion}
                </p>
                <div className="mt-2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Sparkles className="w-3 h-3 text-primary" />
                  <span className="text-xs text-primary font-medium">
                    Click to use this suggestion
                  </span>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-4 p-3 rounded-lg glass-card">
            <p className="text-xs text-muted-foreground text-center">
              💡 Tip: Enable Lovable Cloud for real AI-powered personalized suggestions
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BioSuggestions;
