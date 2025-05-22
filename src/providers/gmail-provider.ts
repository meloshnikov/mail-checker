import { AuthToken } from '../types';
import { BaseEmailProvider } from './email-provider';

// Константы для OAuth 2.0
const CLIENT_ID = 'CLIENT_ID';
const REDIRECT_URL = browser.identity.getRedirectURL();
const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
const AUTH_URL = 'https://accounts.google.com/o/oauth2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GMAIL_API_BASE_URL = 'https://gmail.googleapis.com/gmail/v1';

// Ключ для хранения токена в storage.local
const TOKEN_STORAGE_KEY = 'gmail_auth_token';

/**
 * Провайдер для работы с Gmail
 */
export class GmailProvider extends BaseEmailProvider {
  readonly id = 'gmail';
  readonly name = 'Gmail';
  readonly iconUrl = 'assets/gmail-icon.png';
  readonly mailUrl = 'https://mail.google.com/mail/u/';
  
  /**
   * Получение URL для авторизации (Implicit Flow)
   */
  private getAuthUrl(): string {
    const url = new URL(AUTH_URL);
    url.searchParams.append('client_id', CLIENT_ID);
    url.searchParams.append('response_type', 'token');
    url.searchParams.append('redirect_uri', REDIRECT_URL);
    url.searchParams.append('scope', SCOPES.join(' '));
    url.searchParams.append('include_granted_scopes', 'true');
    url.searchParams.append('prompt', 'consent');
    
    console.log('[Gmail] Generated auth URL (Implicit Flow):', url.toString());
    console.log('[Gmail] Redirect URL:', REDIRECT_URL);
    
    return url.toString();
  }
  
  /**
   * Авторизация пользователя через OAuth 2.0 (Implicit Flow)
   */
  async authorize(): Promise<AuthToken> {
    try {
      console.log('[Gmail] Starting authorization process (Implicit Flow)');
      const authUrl = this.getAuthUrl();
      
      // Открываем окно авторизации
      console.log('[Gmail] Launching web auth flow');
      const redirectUrl = await browser.identity.launchWebAuthFlow({
        url: authUrl,
        interactive: true,
      });
      
      console.log('[Gmail] Received redirect URL:', redirectUrl);
      
      // Извлекаем токен из URL (в Implicit Flow токен возвращается в хэше URL)
      const hashParams = new URLSearchParams(
        redirectUrl.substring(redirectUrl.indexOf('#') + 1)
      );
      
      const accessToken = hashParams.get('access_token');
      const expiresIn = hashParams.get('expires_in');
      const tokenType = hashParams.get('token_type');
      const error = hashParams.get('error');
      
      if (error) {
        console.error('[Gmail] Authorization error:', error);
        throw new Error(`Authorization failed: ${error}`);
      }
      
      if (!accessToken) {
        console.error('[Gmail] No access token received in redirect URL');
        throw new Error('Authorization failed: No access token received');
      }
      
      console.log('[Gmail] Access token received directly (Implicit Flow)');
      
      // Создаем объект токена
      const token: AuthToken = {
        accessToken,
        expiresAt: Date.now() + (parseInt(expiresIn || '3600') * 1000),
        // В Implicit Flow нет refresh_token, поэтому refreshToken будет undefined
      };
      
      console.log('[Gmail] Token created, saving to storage');
      
      // Сохраняем токен в storage.local
      await this.saveToken(token);
      
      return token;
    } catch (error) {
      console.error('[Gmail] Authorization error:', error);
      throw error;
    }
  }
  
  /**
   * Получение действующего токена доступа
   */
  async getAccessToken(): Promise<string> {
    try {
      console.log('[Gmail] Getting access token');
      const token = await this.getToken();
      
      if (!token) {
        console.error('[Gmail] No authentication token found');
        throw new Error('No authentication token found');
      }
      
      // Проверяем, не истек ли токен
      if (token.expiresAt <= Date.now() + 60000) { // Добавляем минутный запас
        console.log('[Gmail] Token expired or about to expire, refreshing');
        
        // В Implicit Flow нам нужно заново авторизоваться
        const newToken = await this.authorize();
        return newToken.accessToken;
      }
      
      console.log('[Gmail] Using existing valid token');
      return token.accessToken;
    } catch (error) {
      console.error('[Gmail] Error getting access token:', error);
      throw error;
    }
  }
  
  /**
   * Получение информации о пользователе
   */
  async getUserProfile(): Promise<{ email: string, historyId: number }> {
    const accessToken = await this.getAccessToken();
    
    const response = await fetch(`${GMAIL_API_BASE_URL}/users/me/profile`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get user profile: ${response.status} ${response.statusText}`);
    }

    const profile = await response.json();
    this.saveLastHistoryId(profile.historyId);
    
    return { email: profile.emailAddress, historyId: profile.historyId };
  }

  /**
   * Получение истории изменений (новых непрочитанных писем)
   * @param startHistoryId ID истории, с которого начинать получение изменений
   * @returns Объект с historyId и списком сообщений
   */
  async getHistory(startHistoryId?: string): Promise<{ historyId: string; messages: { id: string }[] }> {
    const accessToken = await this.getAccessToken();
    const url = `${GMAIL_API_BASE_URL}/users/me/history?labelId=UNREAD&startHistoryId=${startHistoryId}&maxResults=100&fields=history(labelsAdded,labelsRemoved,messagesAdded,messagesDeleted),historyId,nextPageToken`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get history: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Фильтруем только сообщения, которые были добавлены и имеют метку UNREAD
    const messages = data.history
      ? data.history.flatMap((item: any) => item.messagesAdded || [])
      : [];

    const detailedMessages = await Promise.all(
      messages.map(async (msg: any) => {
        const messageDetails = await this.getMessage(msg.message.id);
        return messageDetails;
      })
    );

    return {
      historyId: data.historyId,
      messages: detailedMessages,
    };
  }

  /**
   * Получение полного сообщения по ID
   * @param messageId ID сообщения
   * @returns Объект сообщения
   */
  async getMessage(messageId: string): Promise<any> {
    const accessToken = await this.getAccessToken();
    const url = `${GMAIL_API_BASE_URL}/users/me/messages/${messageId}?fields=id,snippet,payload(headers,parts)`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get message ${messageId}: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Сохранение последнего historyId
   * @param historyId ID истории
   */
  async saveLastHistoryId(historyId: string): Promise<void> {
    await browser.storage.local.set({ 'gmail_last_history_id': historyId });
  }

  /**
   * Получение последнего сохраненного historyId
   * @returns Последний historyId или undefined
   */
  async getLastHistoryId(): Promise<string | undefined> {
    const data = await browser.storage.local.get('gmail_last_history_id');
    return data['gmail_last_history_id'];
  }

  /**
   * Получение количества непрочитанных писем (с использованием истории)
   */
  async getUnreadCount(): Promise<number> {
    try {
      console.log('[Gmail] Getting total unread count');
      const accessToken = await this.getAccessToken();
      const response = await fetch(`${GMAIL_API_BASE_URL}/users/me/labels/UNREAD?fields=messagesUnread`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        console.error('[Gmail] Failed to get unread count label info:', response.status, response.statusText);
        throw new Error(`Failed to get unread count: ${response.status} ${response.statusText}`);
      }

      const labelInfo = await response.json();
      console.log('[Gmail] Unread label info:', labelInfo);
      return labelInfo.messagesUnread || 0; // messagesUnread contains the total number of unread messages
    } catch (error) {
      console.error('[Gmail] Error getting total unread count:', error);
      // It's often better to let errors propagate or handle them based on specific requirements
      // For now, returning 0 in case of error to prevent breaking existing flows,
      // but this might need adjustment based on how errors should be surfaced to the user.
      return 0; 
    }
  }

  /**
   * Проверка, авторизован ли пользователь
   */
  async isAuthorized(): Promise<boolean> {
    try {
      console.log('[Gmail] Checking if user is authorized');
      const token = await this.getToken();
      const isValid = !!token && token.expiresAt > Date.now();
      console.log('[Gmail] Authorization status:', isValid ? 'authorized' : 'not authorized');
      return isValid;
    } catch (error) {
      console.error('[Gmail] Error checking authorization:', error);
      return false;
    }
  }

  /**
   * Выход из аккаунта
   */
  async logout(): Promise<void> {
    console.log('[Gmail] Logging out');
    await this.removeToken();
  }

  /**
   * Сохранение токена в storage.local
   */
  private async saveToken(token: AuthToken): Promise<void> {
    console.log('[Gmail] Saving token to storage');
    await browser.storage.local.set({ [TOKEN_STORAGE_KEY]: token });

    // Проверяем, что данные сохранились
    const verification = await browser.storage.local.get(TOKEN_STORAGE_KEY);
    console.log('[Gmail] Verification of saved token:', verification[TOKEN_STORAGE_KEY] ? 'Token saved successfully' : 'Failed to save token');
  }

  /**
   * Получение токена из storage.local
   */
  private async getToken(): Promise<AuthToken | null> {
    console.log('[Gmail] Getting token from storage');
    const data = await browser.storage.local.get(TOKEN_STORAGE_KEY);
    return data[TOKEN_STORAGE_KEY] || null;
  }

  /**
   * Удаление токена из storage.local
   */
  private async removeToken(): Promise<void> {
    console.log('[Gmail] Removing token from storage');
    await browser.storage.local.remove(TOKEN_STORAGE_KEY);
  }
}
