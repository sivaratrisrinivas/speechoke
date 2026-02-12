export enum AppScreen {
  HERO = 'HERO',
  SELECT = 'SELECT',
  DICTATE = 'DICTATE',
  PREPARE = 'PREPARE',
  PERFORM = 'PERFORM',
  CRITIQUE = 'CRITIQUE',
}

export interface Speech {
  id: string;
  title: string;
  author: string;
  year: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Custom';
  duration: string; // approx
  content: string; // Full text
  excerpt: string; // Short preview
  image: string; // Placeholder ID
}

export interface CritiqueResult {
  overallScore: number;
  clarityScore: number;
  emotionScore: number;
  pacingScore: number;
  feedback: string;
  bestLine: string;
  improvementTip: string;
}

export interface AudioVisualizerProps {
  stream: MediaStream | null;
  isRecording: boolean;
}