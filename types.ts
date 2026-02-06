
export type HomeworkType = 'TEXT' | 'PHOTO' | 'VIDEO' | 'FILE';

export interface Lesson {
  id: string;
  title: string;
  description: string;
  content: string;
  xpReward: number;
  homeworkType: HomeworkType;
  homeworkTask: string;
  aiGradingInstruction: string;
  videoUrl?: string; // Added per-lesson video support
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
  type: 'HABIT' | 'GOAL' | 'IDEA' | 'NOTE';
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
  courseGoals?: string; // What they want to get
  motivation?: string; // Why they joined
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
  
  chatHistory: ChatMessage[];
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
  dossier?: UserDossier; // New field for the questionnaire
  
  notifications: NotificationSettings;
  
  // New: User Notebook Data
  notebook: NotebookEntry[];
}

export interface AppIntegrations {
  telegramBotToken?: string;
  googleDriveFolderId?: string;
  crmWebhookUrl?: string;
  aiModelVersion?: string;
  // Supabase Config
  supabaseUrl?: string;
  supabaseAnonKey?: string;
}

export interface AppFeatures {
  enableRealTimeSync: boolean;
  autoApproveHomework: boolean;
  maintenanceMode: boolean;
  allowStudentChat: boolean;
  publicLeaderboard: boolean;
}

// --- NEW AI TYPES ---
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
    autoFix: boolean; // Automatically attempt to fix errors
    monitoringInterval: number; // ms
    sensitivity: 'LOW' | 'HIGH';
}

export interface AppConfig {
  appName: string;
  appDescription: string;
  primaryColor: string;
  systemInstruction: string;
  integrations: AppIntegrations;
  features: AppFeatures;
  // New Fields
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

export enum Tab {
  HOME = 'HOME', // New Dashboard
  MODULES = 'MODULES', // 1. Learning
  MATERIALS = 'MATERIALS', // 2. Extra Materials
  RATING = 'RATING', // 3. Leaderboard
  ARENA = 'ARENA', // 4. Trainings
  STREAMS = 'STREAMS', // 5. Live Streams
  NOTEBOOK = 'NOTEBOOK', // 6. Notepad
  CHAT = 'CHAT',
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
