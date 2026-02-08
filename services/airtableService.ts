
import { AppConfig, UserProgress, Module, Lesson, Material, Stream, CalendarEvent, ArenaScenario, AppNotification } from '../types';
import { Logger } from './logger';
import { Storage } from './storage';

// Configuration - replace with your actual credentials
const DEFAULT_PAT = process.env.AIRTABLE_PAT || 'YOUR_AIRTABLE_PAT_TOKEN';
const DEFAULT_BASE_ID = 'appNbjsegO01M8Y36';

// Helper types matching your Airtable table names
type TableName = 'Users' | 'Modules' | 'Lessons' | 'Materials' | 'Streams' | 'Events' | 'Scenarios' | 'Notifications';

class AirtableService {
  private baseUrl = 'https://api.airtable.com/v0';
  private baseId: string;
  private pat: string;

  constructor() {
    this.baseId = DEFAULT_BASE_ID;
    this.pat = DEFAULT_PAT;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}/${this.baseId}/${endpoint}`;
    const headers = {
      'Authorization': `Bearer ${this.pat}`,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    try {
      const response = await fetch(url, { ...options, headers });
      if (!response.ok) {
        throw new Error(`Airtable API error: ${response.status} ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      Logger.error('Airtable request failed', error);
      throw error;
    }
  }

  // Fetch all modules with lessons from Airtable
  async fetchModules(): Promise<Module[]> {
    try {
      // First fetch all lessons
      const lessonsData = await this.request<{ records: any[] }>('Lessons?sort[0][field]=order&sort[0][direction]=asc');
      const lessonsMap = new Map<string, Lesson[]>();

      // Group lessons by module
      lessonsData.records.forEach(record => {
        const lesson: Lesson = {
          id: String(record.fields.id || record.id),
          title: record.fields.title || 'Урок без названия',
          description: record.fields.description || '',
          content: record.fields.content || '',
          xpReward: record.fields.xpReward || 100,
          homeworkType: (record.fields.homeworkType || 'TEXT') as any,
          homeworkTask: record.fields.homeworkTask || '',
          aiGradingInstruction: record.fields.aiGradingInstruction || '',
          videoUrl: record.fields.videoUrl || ''
        };

        // Get module links from the lesson
        const moduleLinks = record.fields.Module || [];
        moduleLinks.forEach((moduleId: string) => {
          if (!lessonsMap.has(moduleId)) {
            lessonsMap.set(moduleId, []);
          }
          lessonsMap.get(moduleId)!.push(lesson);
        });
      });

      // Now fetch modules and attach lessons
      const modulesData = await this.request<{ records: any[] }>('Modules');
      return modulesData.records.map(record => {
        const moduleId = record.id;
        const moduleLessons = lessonsMap.get(moduleId) || [];

        return {
          id: String(record.fields.id || record.id),
          title: record.fields.title || 'Модуль без названия',
          description: record.fields.description || '',
          category: this.mapCategory(record.fields.category),
          minLevel: record.fields.minLevel || 1,
          imageUrl: record.fields.imageUrl || this.getImageFromAttachments(record.fields.image),
          videoUrl: record.fields.videoUrl || this.getVideoFromAttachments(record.fields.video),
          pdfUrl: '',
          lessons: moduleLessons
        };
      });
    } catch (error) {
      Logger.error('Failed to fetch modules with lessons', error);
      return [];
    }
  }

  // Fetch all lessons from Airtable
  async fetchLessons(): Promise<Lesson[]> {
    try {
      const data = await this.request<{ records: any[] }>('Lessons?sort[0][field]=order&sort[0][direction]=asc');
      return data.records.map(record => ({
        id: String(record.fields.id || record.id),
        title: record.fields.title || 'Урок без названия',
        description: record.fields.description || '',
        content: record.fields.content || '',
        xpReward: record.fields.xpReward || 100,
        homeworkType: (record.fields.homeworkType || 'TEXT') as any,
        homeworkTask: record.fields.homeworkTask || '',
        aiGradingInstruction: record.fields.aiGradingInstruction || '',
        videoUrl: record.fields.videoUrl || ''
      }));
    } catch (error) {
      Logger.error('Failed to fetch lessons', error);
      return [];
    }
  }

  // Fetch materials
  async fetchMaterials(): Promise<Material[]> {
    try {
      const data = await this.request<{ records: any[] }>('Materials');
      return data.records.map(record => ({
        id: String(record.fields.id || record.id),
        title: record.fields.title || '',
        description: record.fields.description || '',
        type: (record.fields.type || 'LINK') as any,
        url: record.fields.url || ''
      }));
    } catch (error) {
      Logger.error('Failed to fetch materials', error);
      return [];
    }
  }

  // Fetch streams
  async fetchStreams(): Promise<Stream[]> {
    try {
      const data = await this.request<{ records: any[] }>('Streams');
      return data.records.map(record => ({
        id: String(record.fields.id || record.id),
        title: record.fields.title || '',
        date: record.fields.date || new Date().toISOString(),
        youtubeUrl: record.fields.youtubeUrl || '',
        status: (record.fields.status || 'UPCOMING') as any
      }));
    } catch (error) {
      Logger.error('Failed to fetch streams', error);
      return [];
    }
  }

  // Sync user progress to Airtable
  async syncUserProgress(user: UserProgress): Promise<boolean> {
    try {
      // First check if user exists
      const checkData = await this.request<{ records: any[] }>(
        `Users?filterByFormula={TelegramId}="${user.telegramId}"`
      );

      const userData = {
        TelegramId: user.telegramId,
        Name: user.name,
        Role: user.role,
        XP: user.xp,
        Level: user.level,
        Data: JSON.stringify({
          completedLessonIds: user.completedLessonIds,
          submittedHomeworks: user.submittedHomeworks,
          chatHistory: user.chatHistory,
          notebook: user.notebook,
          habits: user.habits,
          goals: user.goals
        }),
        LastSync: Date.now()
      };

      if (checkData.records.length > 0) {
        // Update existing
        const recordId = checkData.records[0].id;
        await this.request(`Users/${recordId}`, {
          method: 'PATCH',
          body: JSON.stringify({ fields: userData })
        });
      } else {
        // Create new
        await this.request('Users', {
          method: 'POST',
          body: JSON.stringify({ fields: userData })
        });
      }

      Logger.log('User synced to Airtable', user.telegramId);
      return true;
    } catch (error) {
      Logger.error('Failed to sync user', error);
      return false;
    }
  }

  // Load user progress from Airtable
  async loadUserProgress(telegramId: string): Promise<UserProgress | null> {
    try {
      const data = await this.request<{ records: any[] }>(
        `Users?filterByFormula={TelegramId}="${telegramId}"`
      );

      if (data.records.length === 0) return null;

      const record = data.records[0];
      const fields = record.fields;
      const parsedData = fields.Data ? JSON.parse(fields.Data) : {};

      return {
        ...Storage.getDefaultUserProgress(),
        telegramId: fields.TelegramId,
        name: fields.Name || 'User',
        role: fields.Role || 'STUDENT',
        xp: fields.XP || 0,
        level: fields.Level || 1,
        completedLessonIds: parsedData.completedLessonIds || [],
        submittedHomeworks: parsedData.submittedHomeworks || [],
        chatHistory: parsedData.chatHistory || [],
        notebook: parsedData.notebook || [],
        habits: parsedData.habits || [],
        goals: parsedData.goals || [],
        airtableRecordId: record.id,
        lastSyncTimestamp: fields.LastSync || Date.now()
      };
    } catch (error) {
      Logger.error('Failed to load user from Airtable', error);
      return null;
    }
  }

  // Helper methods
  private mapCategory(airtableCategory: string): any {
    const mapping: Record<string, string> = {
      'Модуль 1': 'GENERAL',
      'Модуль 2': 'SALES',
      'Модуль 3': 'PSYCHOLOGY',
      'Модуль 4': 'TACTICS'
    };
    return mapping[airtableCategory] || 'GENERAL';
  }

  private getImageFromAttachments(attachments: any[]): string {
    if (!attachments || attachments.length === 0) return '';
    return attachments[0].url || '';
  }

  private getVideoFromAttachments(attachments: any[]): string {
    if (!attachments || attachments.length === 0) return '';
    return attachments[0].url || '';
  }
}

// Export both for backward compatibility
export const airtableService = new AirtableService();
export const airtable = airtableService;
