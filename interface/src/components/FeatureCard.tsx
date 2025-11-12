import { LucideIcon } from 'lucide-react';

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  gradient?: string;
}

const FeatureCard = ({ icon: Icon, title, description, gradient = "from-primary to-secondary" }: FeatureCardProps) => {
  return (
    <div className="glass-card rounded-2xl p-6 hover:scale-105 transition-all duration-300 group">
      <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-4 group-hover:animate-glow`}>
        <Icon className="w-7 h-7 text-primary-foreground" />
      </div>
      <h3 className="text-xl font-bold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
};

export default FeatureCard;
