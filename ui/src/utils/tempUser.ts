import { FASTAPI_URL } from './api';

export interface TempUser {
  id: string;
  created_at: string;
  is_temporary: true;
}

export interface TempSession {
  session_id: string;
  start_time: string;
  status: string;
  is_temporary: true;
}

class TempUserService {
  private static instance: TempUserService;
  private tempUserId: string | null = null;

  private constructor() {
    // Try to restore temp user ID from sessionStorage on initialization
    this.tempUserId = sessionStorage.getItem('medicobud_temp_user_id');
  }

  public static getInstance(): TempUserService {
    if (!TempUserService.instance) {
      TempUserService.instance = new TempUserService();
    }
    return TempUserService.instance;
  }

  async createTempUser(): Promise<string> {
    try {
      const response = await fetch(`${FASTAPI_URL}/api/diagnosis/temp-user/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        this.tempUserId = data.temp_user_id;
        sessionStorage.setItem('medicobud_temp_user_id', data.temp_user_id);
        return data.temp_user_id;
      } else {
        throw new Error('Failed to create temporary user');
      }
    } catch (error) {
      console.error('Error creating temporary user:', error);
      throw error;
    }
  }

  getTempUserId(): string | null {
    return this.tempUserId;
  }

  isTempUser(): boolean {
    return !!this.tempUserId;
  }

  async clearTempUser(): Promise<void> {
    if (!this.tempUserId) return;

    try {
      await fetch(`${FASTAPI_URL}/api/diagnosis/temp-user/${this.tempUserId}`, {
        method: 'DELETE'
      });
    } catch (error) {
      console.error('Error clearing temporary user:', error);
    } finally {
      this.tempUserId = null;
      sessionStorage.removeItem('medicobud_temp_user_id');
    }
  }

  async getTempUserSessions(): Promise<TempSession[]> {
    if (!this.tempUserId) return [];

    try {
      const response = await fetch(
        `${FASTAPI_URL}/api/diagnosis/sessions?temp_user_id=${this.tempUserId}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }
      );

      if (response.ok) {
        return await response.json();
      } else {
        console.error('Failed to fetch temporary user sessions');
        return [];
      }
    } catch (error) {
      console.error('Error fetching temporary user sessions:', error);
      return [];
    }
  }

  async getTempSession(sessionId: string): Promise<any> {
    if (!this.tempUserId) return null;

    try {
      const response = await fetch(
        `${FASTAPI_URL}/api/diagnosis/session/${sessionId}?temp_user_id=${this.tempUserId}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }
      );

      if (response.ok) {
        return await response.json();
      } else {
        console.error('Failed to fetch temporary session');
        return null;
      }
    } catch (error) {
      console.error('Error fetching temporary session:', error);
      return null;
    }
  }

  // Automatically clear temp user data when the browser window/tab is closed
  setupCleanupOnClose(): void {
    window.addEventListener('beforeunload', () => {
      // Note: This is a best-effort cleanup, but may not always execute
      // The backend cleanup task will handle expired sessions
      if (this.tempUserId) {
        // Use sendBeacon for better reliability during page unload
        navigator.sendBeacon(
          `${FASTAPI_URL}/api/diagnosis/temp-user/${this.tempUserId}`,
          new Blob([JSON.stringify({})], { type: 'application/json' })
        );
      }
    });

    // Also clear when the tab becomes hidden for extended periods
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // Set a timeout to clear after 30 minutes of inactivity
        setTimeout(() => {
          if (document.hidden && this.tempUserId) {
            this.clearTempUser();
          }
        }, 30 * 60 * 1000); // 30 minutes
      }
    });
  }
}

export const tempUserService = TempUserService.getInstance();

// Auto-setup cleanup when the module is imported
tempUserService.setupCleanupOnClose();