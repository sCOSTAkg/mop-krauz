
export type HomeworkType = 'TEXT' | 'PHOTO' | 'VIDEO' | 'FILE';

export interface Lesson {
  id: string;
  title: string;
  description: string;
  content: string;
  xpReward: number; // Base reward (replaced by dynamic logic in many cases)
  homeworkType: HomeworkType;
  homeworkTask: string;
  aiGradingInstruction: string;
  videoUrl?: string;
}

export type ModuleCategory = 'SALES' | 'PSYCHOLOGY' | 'TACTICS' | 'GENERAL';

export interface Module {
  id: string;
  title: string;
  description: string;
  minLevel: number;
  category: ModuleCategory;
  lessons: Lesson[];
  imageUrl: string;
  videoUrl?: string;
  pdfUrl?: string;
}

export interface Material {
  id: string;
  title: string;
  description: string;
  type: 'PDF' | 'VIDEO' | 'LINK';
  url: string;
}

export interface Stream {
  id: string;
  title: string;
  date: string; // ISO Date
  youtubeUrl: string;
  status: 'UPCOMING' | 'LIVE' | 'PAST';
}

export interface NotebookEntry {
  id: string;
  text: string;
  isChecked: boolean; // For habits/checklists
  type: 'HABIT' | 'GOAL' | 'IDEA' | 'NOTE' | 'GRATITUDE'; // Added GRATITUDE
  date: string; // To track daily limits
}

export type UserRole = 'STUDENT' | 'CURATOR' | 'ADMIN';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date | string;
}

export interface NotificationSettings {
  pushEnabled: boolean;
  telegramSync: boolean;
  deadlineReminders: boolean;
  chatNotifications: boolean;
}

export type AppTheme = 'LIGHT' | 'DARK';

export interface UserDossier {
  height?: string;
  weight?: string;
  birthDate?: string;
  location?: string;
  livingSituation?: 'ALONE' | 'DORM' | 'PARENTS' | 'FAMILY' | 'OTHER';
  workExperience?: string;
  incomeGoal?: string;
  courseExpectations?: string;
  courseGoals?: string; 
  motivation?: string; 
}

// Stats tracking for XP rules
export interface UserStats {
    storiesPosted: number; // Max 5 per course
    questionsAsked: Record<string, number>; // LessonID -> count (Max 5 per lesson)
    referralsCount: number;
    streamsVisited: string[]; // IDs of visited streams
    homeworksSpeed: Record<string, 'FAST' | 'SLOW' | 'POOR'>; // LessonID -> speed/quality metric
    initiativesCount: number;
}

export interface UserProgress {
  id?: string;
  telegramId?: string;
  telegramUsername?: string;
  password?: string;
  name: string;
  role: UserRole;
  isAuthenticated: boolean;
  registrationDate?: string;
  
  xp: number;
  level: number;
  completedLessonIds: string[];
  submittedHomeworks: string[];
  
  chatHistory: ChatMessage[]; // Kept for legacy compatibility but unused in UI
  originalPhotoBase64?: string;
  avatarUrl?: string;
  
  // Customization preferences
  armorStyle?: string;
  backgroundStyle?: string;
  theme: AppTheme;
  
  // Extended Profile Data
  instagram?: string;
  aboutMe?: string;
  inviteLink?: string;
  dossier?: UserDossier;
  
  notifications: NotificationSettings;
  
  // Notebook
  notebook: NotebookEntry[];

  // New Detailed Stats for Rating System
  stats: UserStats;
}

export interface AppIntegrations {
  telegramBotToken?: string;
  googleDriveFolderId?: string;
  crmWebhookUrl?: string;
  aiModelVersion?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  inviteBaseUrl?: string; // NEW: Configurable invite link
}

export interface AppFeatures {
  enableRealTimeSync: boolean;
  autoApproveHomework: boolean;
  maintenanceMode: boolean;
  allowStudentChat: boolean;
  publicLeaderboard: boolean;
}

export type AIProviderId = 'GOOGLE_GEMINI' | 'OPENAI_GPT4' | 'ANTHROPIC_CLAUDE' | 'LOCAL_LLAMA' | 'GROQ' | 'OPENROUTER';

export interface AIConfig {
    activeProvider: AIProviderId;
    apiKeys: {
        google?: string;
        openai?: string;
        anthropic?: string;
        groq?: string;
        openrouter?: string;
    };
    modelOverrides: {
        chat?: string;
        vision?: string;
    };
}

export interface SystemAgentConfig {
    enabled: boolean;
    autoFix: boolean; 
    monitoringInterval: number;
    sensitivity: 'LOW' | 'HIGH';
}

export interface AppConfig {
  appName: string;
  appDescription: string;
  primaryColor: string;
  systemInstruction: string;
  integrations: AppIntegrations;
  features: AppFeatures;
  aiConfig: AIConfig;
  systemAgent: SystemAgentConfig;
}

export enum EventType {
  HOMEWORK = 'HOMEWORK',
  WEBINAR = 'WEBINAR',
  OTHER = 'OTHER'
}

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  date: Date | string;
  type: EventType;
  durationMinutes?: number;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  date: string;
  type: 'INFO' | 'WARNING' | 'SUCCESS' | 'ALERT';
  targetRole?: 'ALL' | UserRole;
  targetUserId?: string; // For specific user targeting
  isRead?: boolean;
  link?: string; // Actionable link (e.g., 'STREAMS', 'LESSON:l1')
}

export enum Tab {
  HOME = 'HOME', 
  MODULES = 'MODULES', 
  MATERIALS = 'MATERIALS', 
  RATING = 'RATING', 
  ARENA = 'ARENA', 
  STREAMS = 'STREAMS', 
  NOTEBOOK = 'NOTEBOOK', 
  PROFILE = 'PROFILE',
  CURATOR_DASHBOARD = 'CURATOR_DASHBOARD',
  ADMIN_DASHBOARD = 'ADMIN_DASHBOARD'
}

export interface ArenaScenario {
  id: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  clientRole: string;
  objective: string;
  initialMessage: string;
}
