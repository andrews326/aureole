import { Heart, X, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProfileCardProps {
  name: string;
  age: number;
  distance: string;
  bio: string;
  aiInsight: string;
  verified?: boolean;
  onLike?: () => void;
  onPass?: () => void;
}

const ProfileCard = ({
  name,
  age,
  distance,
  bio,
  aiInsight,
  verified = true,
  onLike,
  onPass,
}: ProfileCardProps) => {
  return (
    <div className="glass-card rounded-3xl p-8 max-w-md w-full animate-slide-up relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-secondary to-primary opacity-50" />
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-2xl font-bold">
              {name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold text-foreground">{name}, {age}</h2>
                {verified && (
                  <div className="star-glow">
                    <Star className="w-5 h-5 fill-accent text-accent" />
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{distance} away</p>
            </div>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          <p className="text-foreground leading-relaxed">{bio}</p>
          
          <div className="glass-input rounded-2xl p-4 cosmic-glow">
            <p className="text-sm text-primary mb-1 font-medium flex items-center gap-2">
              <Star className="w-4 h-4" />
              AI Cosmic Insight
            </p>
            <p className="text-sm text-foreground/90 italic">{aiInsight}</p>
          </div>
        </div>

        <div className="flex gap-4 justify-center">
          <Button
            onClick={onPass}
            variant="outline"
            size="lg"
            className="glass-input rounded-full w-16 h-16 p-0 border-destructive/50 hover:bg-destructive/10 transition-all hover:scale-110"
          >
            <X className="w-6 h-6 text-destructive" />
          </Button>
          <Button
            onClick={onLike}
            size="lg"
            className="glass-card rounded-full w-16 h-16 p-0 bg-gradient-to-br from-primary to-secondary hover:scale-110 transition-all cosmic-glow"
          >
            <Heart className="w-6 h-6 text-primary-foreground" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProfileCard;
