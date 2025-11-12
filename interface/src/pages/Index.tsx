import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Heart, Sparkles, Shield, Zap, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import CosmicBackground from '@/components/CosmicBackground';
import ProfileCard from '@/components/ProfileCard';
import FeatureCard from '@/components/FeatureCard';
import cosmicBg from '@/assets/cosmic-bg.jpg';

const Index = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [showDemo, setShowDemo] = useState(false);

  const demoProfiles = [
    {
      name: "Luna",
      age: 27,
      distance: "3 km",
      bio: "Stargazer, dreamer, and coffee enthusiast. I believe in finding magic in the mundane and making every moment count under this vast sky.",
      aiInsight: "Your orbits align on philosophy, art, and finding beauty in simplicity. You both value deep conversations over surface-level chatter.",
    },
    {
      name: "Atlas",
      age: 29,
      distance: "5 km",
      bio: "Explorer of worlds both real and imagined. Love hiking, sci-fi novels, and late-night conversations about the universe and our place in it.",
      aiInsight: "You share a cosmic connection through adventure, curiosity, and a shared wonder for the mysteries of existence.",
    },
  ];

  const [currentProfile, setCurrentProfile] = useState(0);

  const handleLike = () => {
    if (currentProfile < demoProfiles.length - 1) {
      setCurrentProfile(currentProfile + 1);
    } else {
      setShowDemo(false);
    }
  };

  const handlePass = () => {
    if (currentProfile < demoProfiles.length - 1) {
      setCurrentProfile(currentProfile + 1);
    } else {
      setShowDemo(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Cosmic Background */}
      <div 
        className="fixed inset-0 bg-cover bg-center bg-no-repeat opacity-40"
        style={{ backgroundImage: `url(${cosmicBg})` }}
      />
      <CosmicBackground />

      {/* Content */}
      <div className="relative z-10">
        {/* Hero Section */}
        <section className="min-h-screen flex flex-col items-center justify-center px-6 py-20">
          <div className="text-center max-w-4xl mx-auto space-y-8 animate-slide-up">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Star className="w-8 h-8 text-accent animate-twinkle" />
              <h1 className="text-7xl font-bold text-cosmic">Aureole</h1>
              <Star className="w-8 h-8 text-accent animate-twinkle" />
            </div>
            
            <p className="text-2xl text-foreground/90 font-light">
              Where souls connect under the same sky
            </p>

            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              This is not a swiping game. This is a quiet place in the cosmos where real people can finally be seen. 
              Find meaningful connections in our serene celestial sanctuary.
            </p>

            {!showDemo ? (
              <div className="space-y-4 max-w-md mx-auto mt-12">
                <div className="glass-input p-2 rounded-full flex gap-2">
                  <Input
                    type="email"
                    placeholder="Enter your cosmic coordinates (email)"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-transparent border-0 focus-visible:ring-0 text-foreground placeholder:text-muted-foreground"
                  />
                  <Button 
                    size="lg"
                    className="rounded-full bg-gradient-to-r from-primary to-secondary cosmic-glow hover:scale-105 transition-all px-8"
                    onClick={() => navigate('/auth')}
                  >
                    Begin Journey
                  </Button>
                </div>
                
                <Button
                  variant="ghost"
                  onClick={() => setShowDemo(true)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Or explore the cosmos first
                </Button>
              </div>
            ) : (
              <div className="mt-12 flex justify-center">
                <ProfileCard
                  {...demoProfiles[currentProfile]}
                  onLike={handleLike}
                  onPass={handlePass}
                />
              </div>
            )}

            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground pt-8">
              <Shield className="w-4 h-4" />
              <span>Verified profiles • AI-powered matching • Safe & private</span>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 px-6">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-4xl font-bold text-center mb-4 text-cosmic">
              Your Celestial Sanctuary
            </h2>
            <p className="text-center text-muted-foreground mb-16 max-w-2xl mx-auto">
              Discover a dating experience designed for depth, authenticity, and meaningful connections
            </p>

            <div className="grid md:grid-cols-3 gap-8">
              <FeatureCard
                icon={Sparkles}
                title="AI Cosmic Insights"
                description="Our AI analyzes compatibility beyond the surface, finding connections that truly align with your soul's orbit."
                gradient="from-primary to-secondary"
              />
              <FeatureCard
                icon={Star}
                title="Verified Authenticity"
                description="Live selfie verification with celestial flair ensures every soul you meet is genuine and real."
                gradient="from-accent to-primary"
              />
              <FeatureCard
                icon={Shield}
                title="Safe Haven"
                description="Your celestial shield. Complete privacy controls, invisible mode, and comprehensive safety tools."
                gradient="from-secondary to-accent"
              />
              <FeatureCard
                icon={Heart}
                title="Meaningful Matches"
                description="No endless swiping. Quality over quantity. Find souls who resonate with your frequency."
                gradient="from-primary via-secondary to-accent"
              />
              <FeatureCard
                icon={Zap}
                title="AI Reply Assistant"
                description="Never miss a connection. Our Stardust Replies help you craft thoughtful messages that shine."
                gradient="from-accent to-secondary"
              />
              <FeatureCard
                icon={Moon}
                title="Cosmic Atmosphere"
                description="Generate your personal universe. Customize your space with AI-created cosmic backgrounds."
                gradient="from-secondary to-primary"
              />
            </div>
          </div>
        </section>

        {/* Premium Section */}
        <section className="py-20 px-6">
          <div className="max-w-4xl mx-auto">
            <div className="glass-card rounded-3xl p-12 text-center space-y-6 cosmic-glow">
              <div className="flex justify-center gap-2">
                <Star className="w-8 h-8 text-accent animate-twinkle" />
                <Star className="w-8 h-8 text-accent animate-twinkle" style={{ animationDelay: '0.3s' }} />
                <Star className="w-8 h-8 text-accent animate-twinkle" style={{ animationDelay: '0.6s' }} />
              </div>
              
              <h2 className="text-4xl font-bold text-cosmic">Aureole Plus</h2>
              <p className="text-xl text-foreground/90">Unlock your full constellation</p>
              
              <div className="grid md:grid-cols-2 gap-6 text-left max-w-2xl mx-auto pt-6">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Star className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                    <span className="text-foreground">Unlimited AI stardust replies</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Star className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                    <span className="text-foreground">Boosted cosmic visibility</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Star className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                    <span className="text-foreground">Custom universe backgrounds</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Star className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                    <span className="text-foreground">Undo swipes & rewind</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Star className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                    <span className="text-foreground">Advanced filters & preferences</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Star className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                    <span className="text-foreground">Priority matching algorithm</span>
                  </div>
                </div>
              </div>

              <div className="pt-6">
                <Button 
                  size="lg"
                  className="rounded-full bg-gradient-to-r from-accent to-primary text-accent-foreground cosmic-glow hover:scale-105 transition-all px-12 text-lg"
                >
                  Start 7-Day Cosmic Journey
                </Button>
                <p className="text-sm text-muted-foreground mt-3">Only $9.99/month after trial</p>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-12 px-6 border-t border-border/30">
          <div className="max-w-6xl mx-auto text-center space-y-4">
            <div className="flex items-center justify-center gap-2">
              <Star className="w-5 h-5 text-accent" />
              <span className="text-xl font-bold text-cosmic">Aureole</span>
            </div>
            <p className="text-sm text-muted-foreground">
              A quiet place in the cosmos where real people can finally be seen
            </p>
            <div className="flex justify-center gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
              <a href="#" className="hover:text-foreground transition-colors">Terms</a>
              <a href="#" className="hover:text-foreground transition-colors">Safety</a>
              <a href="#" className="hover:text-foreground transition-colors">Support</a>
            </div>
            <p className="text-xs text-muted-foreground pt-4">
              © 2024 Aureole. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Index;
