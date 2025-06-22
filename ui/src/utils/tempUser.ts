import { FASTAPI_URL } from './api';

export interface TempUser {
  temp_user_id: string;
  created_at: string;
  last_activity: string;
  is_temporary: true;
  feature_usage: Record<string, any>;
  remaining_limits: Record<string, any>;
  active_sessions: number;
}

export interface TempSession {
  session_id: string;
  feature: string;
  start_time: string;
  status: string;
  is_temporary: true;
}

export interface FeatureAccess {
  allowed: boolean;
  remaining_daily: number;
  remaining_hourly: number;
  feature: string;
  limits: {
    daily: number;
    hourly: number;
  };
}

export interface RateLimitError {
  error: string;
  limit: number;
  used: number;
  reset_time: string;
  suggestion: string;
}

export enum FeatureType {
  DIAGNOSIS = 'diagnosis',
  LAB_REPORT = 'lab_report',
  CONSULTATION = 'consultation',
  HEALTH_TRACKER = 'health_tracker',
  CHAT = 'chat'
}

class UniversalTempUserService {
  private static instance: UniversalTempUserService;
  private tempUserId: string | null = null;
  private isInitialized = false;

  private constructor() {
    this.initializeTempUser();
  }

  public static getInstance(): UniversalTempUserService {
    if (!UniversalTempUserService.instance) {
      UniversalTempUserService.instance = new UniversalTempUserService();
    }
    return UniversalTempUserService.instance;
  }

  private async initializeTempUser(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Try to restore temp user ID from localStorage first, then sessionStorage
      this.tempUserId = localStorage.getItem('medicobud_temp_user_id') || 
                       sessionStorage.getItem('medicobud_temp_user_id');

      // If we have a stored ID, validate it with the backend
      if (this.tempUserId) {
        const isValid = await this.validateTempUser(this.tempUserId);
        if (!isValid) {
          this.tempUserId = null;
          this.clearStoredTempUserId();
        }
      }

      // If no valid temp user, create a new one
      if (!this.tempUserId) {
        await this.createTempUser();
      }

      this.isInitialized = true;
      console.log('🎯 Universal Temp User Service initialized:', this.tempUserId);
    } catch (error) {
      console.error('❌ Failed to initialize temp user service:', error);
      this.isInitialized = true;
    }
  }

  private async validateTempUser(tempUserId: string): Promise<boolean> {
    try {
      const response = await fetch(`${FASTAPI_URL}/api/temp-user/stats/${tempUserId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      return response.ok;
    } catch (error) {
      console.error('Failed to validate temp user:', error);
      return false;
    }
  }

  async createTempUser(): Promise<string> {
    try {
      const response = await fetch(`${FASTAPI_URL}/api/temp-user/create`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          // Include fingerprinting headers
          'User-Agent': navigator.userAgent,
          'Accept-Language': navigator.language
        }
      });

      if (response.ok) {
        const data = await response.json();
        this.tempUserId = data.temp_user_id;
        this.storeTempUserId(data.temp_user_id);
        console.log('✅ Created new temp user:', data.temp_user_id);
        return data.temp_user_id;
      } else {
        throw new Error(`Failed to create temporary user: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Error creating temporary user:', error);
      throw error;
    }
  }

  async getTempUserId(): Promise<string | null> {
    await this.initializeTempUser();
    return this.tempUserId;
  }

  isTempUser(): boolean {
    return !!this.tempUserId;
  }

  async checkFeatureAccess(feature: FeatureType): Promise<FeatureAccess> {
    const tempUserId = await this.getTempUserId();
    if (!tempUserId) {
      throw new Error('No temporary user available');
    }

    try {
      const response = await fetch(`${FASTAPI_URL}/api/temp-user/check-access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          temp_user_id: tempUserId,
          feature: feature
        })
      });

      if (response.ok) {
        return await response.json();
      } else if (response.status === 429) {
        const errorData: RateLimitError = await response.json();
        throw new RateLimitException(errorData);
      } else {
        throw new Error('Failed to check feature access');
      }
    } catch (error) {
      console.error(`Error checking access for ${feature}:`, error);
      throw error;
    }
  }

  async createFeatureSession(feature: FeatureType, sessionData?: any): Promise<string> {
    const tempUserId = await this.getTempUserId();
    if (!tempUserId) {
      throw new Error('No temporary user available');
    }

    try {
      const response = await fetch(`${FASTAPI_URL}/api/temp-user/create-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          temp_user_id: tempUserId,
          feature: feature,
          session_data: sessionData
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`🎯 Created ${feature} session:`, data.session_id);
        return data.session_id;
      } else if (response.status === 429) {
        const errorData: RateLimitError = await response.json();
        throw new RateLimitException(errorData);
      } else {
        throw new Error(`Failed to create ${feature} session`);
      }
    } catch (error) {
      console.error(`Error creating ${feature} session:`, error);
      throw error;
    }
  }

  async getTempUserStats(): Promise<TempUser | null> {
    const tempUserId = await this.getTempUserId();
    if (!tempUserId) return null;

    try {
      const response = await fetch(`${FASTAPI_URL}/api/temp-user/stats/${tempUserId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        return await response.json();
      } else {
        console.error('Failed to fetch temp user stats');
        return null;
      }
    } catch (error) {
      console.error('Error fetching temp user stats:', error);
      return null;
    }
  }

  async getTempUserSessions(feature?: FeatureType): Promise<TempSession[]> {
    const tempUserId = await this.getTempUserId();
    if (!tempUserId) return [];

    try {
      const url = new URL(`${FASTAPI_URL}/api/temp-user/sessions/${tempUserId}`);
      if (feature) {
        url.searchParams.append('feature', feature);
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        return await response.json();
      } else {
        console.error('Failed to fetch temp user sessions');
        return [];
      }
    } catch (error) {
      console.error('Error fetching temp user sessions:', error);
      return [];
    }
  }

  async getTempSession(sessionId: string): Promise<any> {
    const tempUserId = await this.getTempUserId();
    if (!tempUserId) return null;

    try {
      const response = await fetch(
        `${FASTAPI_URL}/api/temp-user/session/${sessionId}?temp_user_id=${tempUserId}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }
      );

      if (response.ok) {
        return await response.json();
      } else {
        console.error('Failed to fetch temp session');
        return null;
      }
    } catch (error) {
      console.error('Error fetching temp session:', error);
      return null;
    }
  }

  async updateTempSession(sessionId: string, data: any): Promise<boolean> {
    try {
      const response = await fetch(`${FASTAPI_URL}/api/temp-user/update-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          data: data
        })
      });

      return response.ok;
    } catch (error) {
      console.error('Error updating temp session:', error);
      return false;
    }
  }

  async addMessageToSession(sessionId: string, sender: string, text: string): Promise<boolean> {
    try {
      const response = await fetch(`${FASTAPI_URL}/api/temp-user/add-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          sender: sender,
          text: text
        })
      });

      return response.ok;
    } catch (error) {
      console.error('Error adding message to session:', error);
      return false;
    }
  }

  async clearTempUser(): Promise<void> {
    if (!this.tempUserId) return;

    try {
      await fetch(`${FASTAPI_URL}/api/temp-user/clear/${this.tempUserId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      console.log('🗑️ Cleared temp user data');
    } catch (error) {
      console.error('Error clearing temporary user:', error);
    } finally {
      this.tempUserId = null;
      this.clearStoredTempUserId();
    }
  }

  private storeTempUserId(tempUserId: string): void {
    // Store in both localStorage and sessionStorage for redundancy
    localStorage.setItem('medicobud_temp_user_id', tempUserId);
    sessionStorage.setItem('medicobud_temp_user_id', tempUserId);
  }

  private clearStoredTempUserId(): void {
    localStorage.removeItem('medicobud_temp_user_id');
    sessionStorage.removeItem('medicobud_temp_user_id');
  }

  // Feature-specific helper methods
  async startDiagnosisSession(sessionData?: any): Promise<string> {
    return this.createFeatureSession(FeatureType.DIAGNOSIS, sessionData);
  }

  async analyzeLabReport(sessionData?: any): Promise<string> {
    return this.createFeatureSession(FeatureType.LAB_REPORT, sessionData);
  }

  async startConsultation(sessionData?: any): Promise<string> {
    return this.createFeatureSession(FeatureType.CONSULTATION, sessionData);
  }

  async trackHealth(sessionData?: any): Promise<string> {
    return this.createFeatureSession(FeatureType.HEALTH_TRACKER, sessionData);
  }

  async startChat(sessionData?: any): Promise<string> {
    return this.createFeatureSession(FeatureType.CHAT, sessionData);
  }

  // Rate limit helper methods
  async getRemainingLimits(): Promise<Record<string, any>> {
    const stats = await this.getTempUserStats();
    return stats?.remaining_limits || {};
  }

  async canUseFeature(feature: FeatureType): Promise<boolean> {
    try {
      await this.checkFeatureAccess(feature);
      return true;
    } catch (error) {
      if (error instanceof RateLimitException) {
        return false;
      }
      throw error;
    }
  }

  // Cleanup and lifecycle management
  setupCleanupOnClose(): void {
    // Enhanced cleanup with better reliability
    const cleanup = () => {
      if (this.tempUserId) {
        // Use sendBeacon for better reliability during page unload
        const url = `${FASTAPI_URL}/api/temp-user/activity/${this.tempUserId}`;
        const data = JSON.stringify({ action: 'page_unload', timestamp: new Date().toISOString() });
        
        if (navigator.sendBeacon) {
          navigator.sendBeacon(url, data);
        } else {
          // Fallback for browsers without sendBeacon
          fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: data,
            keepalive: true
          }).catch(() => {}); // Ignore errors during unload
        }
      }
    };

    // Multiple event listeners for better coverage
    window.addEventListener('beforeunload', cleanup);
    window.addEventListener('pagehide', cleanup);
    window.addEventListener('unload', cleanup);

    // Visibility change handling for mobile
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // Update activity when tab becomes hidden
        this.updateActivity();
        
        // Set a longer timeout for cleanup
        setTimeout(() => {
          if (document.hidden && this.tempUserId) {
            // Don't clear immediately, let Redis TTL handle it
            console.log('🔄 Tab hidden, Redis TTL will handle cleanup');
          }
        }, 60 * 60 * 1000); // 1 hour
      } else {
        // Update activity when tab becomes visible
        this.updateActivity();
      }
    });
  }

  private async updateActivity(): Promise<void> {
    if (!this.tempUserId) return;

    try {
      await fetch(`${FASTAPI_URL}/api/temp-user/activity/${this.tempUserId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'activity_update', 
          timestamp: new Date().toISOString() 
        })
      });
    } catch (error) {
      // Ignore activity update errors
    }
  }
}

// Custom exception for rate limiting
export class RateLimitException extends Error {
  public readonly errorData: RateLimitError;

  constructor(errorData: RateLimitError) {
    super(errorData.error);
    this.name = 'RateLimitException';
    this.errorData = errorData;
  }

  getDisplayMessage(): string {
    return `${this.errorData.error}. ${this.errorData.suggestion}`;
  }

  getResetTime(): string {
    return this.errorData.reset_time;
  }

  getRemainingTime(): string {
    if (this.errorData.reset_time === "24 hours") {
      return "24 hours";
    }
    
    try {
      const resetTime = new Date(this.errorData.reset_time);
      const now = new Date();
      const diff = resetTime.getTime() - now.getTime();
      
      if (diff <= 0) return "now";
      
      const minutes = Math.ceil(diff / (1000 * 60));
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    } catch {
      return this.errorData.reset_time;
    }
  }
}

// Global instance
export const tempUserService = UniversalTempUserService.getInstance();

// Auto-setup cleanup when the module is imported
tempUserService.setupCleanupOnClose();

// Helper functions for React components
export const useTempUser = () => {
  return {
    getTempUserId: () => tempUserService.getTempUserId(),
    isTempUser: () => tempUserService.isTempUser(),
    getStats: () => tempUserService.getTempUserStats(),
    checkAccess: (feature: FeatureType) => tempUserService.checkFeatureAccess(feature),
    canUse: (feature: FeatureType) => tempUserService.canUseFeature(feature),
    startSession: (feature: FeatureType, data?: any) => tempUserService.createFeatureSession(feature, data),
    clearUser: () => tempUserService.clearTempUser()
  };
};