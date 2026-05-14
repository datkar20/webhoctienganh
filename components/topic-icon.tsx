import {
  BookOpenCheck,
  BriefcaseBusiness,
  Cpu,
  GraduationCap,
  HeartPulse,
  Home,
  Leaf,
  Plane,
  Sparkles,
  Target,
  Utensils
} from "lucide-react";
import type { TopicIcon } from "@/types";

const icons = {
  HeartPulse,
  GraduationCap,
  Cpu,
  Leaf,
  BriefcaseBusiness,
  Plane,
  Utensils,
  Home,
  BookOpenCheck,
  Target,
  Sparkles
};

export const topicIconOptions: { value: TopicIcon; label: string }[] = [
  { value: "HeartPulse", label: "Health" },
  { value: "GraduationCap", label: "Education" },
  { value: "Cpu", label: "Technology" },
  { value: "Leaf", label: "Environment" },
  { value: "BriefcaseBusiness", label: "Business" },
  { value: "Plane", label: "Travel" },
  { value: "Utensils", label: "Food" },
  { value: "Home", label: "Daily Life" },
  { value: "BookOpenCheck", label: "IELTS" },
  { value: "Target", label: "TOEIC" },
  { value: "Sparkles", label: "Custom" }
];

export function TopicIconView({
  icon,
  className
}: {
  icon: TopicIcon;
  className?: string;
}) {
  const Icon = icons[icon] ?? Sparkles;
  return <Icon className={className} />;
}
