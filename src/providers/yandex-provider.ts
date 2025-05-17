import { AuthToken } from '../types';
import { BaseEmailProvider } from './email-provider';

// Константы для OAuth 2.0
// Примечание: Для работы с Yandex OAuth нужно зарегистрировать приложение в Yandex OAuth
// и получить CLIENT_ID: https://oauth.yandex.ru/client/new
const CLIENT_ID = 'your-yandex-client-id'; // Замените на реальный CLIENT_ID
const REDIRECT_URL = browser.identity.getRedirectURL();
const SCOPES = ['mail:read']; // Область доступа для чтения почты
const AUTH_URL = 'https://oauth.yandex.ru/authorize';
const TOKEN_URL = 'https://oauth.yandex.ru/token';
const YANDEX_API_BASE_URL = 'https://mail.yandex.ru/api/v1';

// Ключ для хранения токена в storage.local
const TOKEN_STORAGE_KEY = 'yandex_auth_token';

/**
 * Провайдер для работы с Yandex Mail
 */
export class YandexProvider extends BaseEmailProvider {
  readonly id = 'yandex';
  readonly name = 'Yandex Mail';
  readonly iconUrl = 'assets/yandex-icon.png';
  readonly mailUrl = 'https://mail.yandex.ru/';
  
  /**
   * Получение URL для авторизации (Implicit Flow)
   */
  private getAuthUrl(): string {
    const url = new URL(AUTH_URL);
    url.searchParams.append('client_id', CLIENT_ID);
    url.searchParams.append('response_type', 'token');
    url.searchParams.append('redirect_uri', REDIRECT_URL);
    url.searchParams.append('scope', SCOPES.join(' '));
    
    console.log('[Yandex] Generated auth URL (Implicit Flow):', url.toString());
    console.log('[Yandex] Redirect URL:', REDIRECT_URL);
    
    return url.toString();
  }
  
  /**
   * Авторизация пользователя через OAuth 2.0 (Implicit Flow)
   */
  async authorize(): Promise<AuthToken> {
    try {
      console.log('[Yandex] Starting authorization process (Implicit Flow)');
      const authUrl = this.getAuthUrl();
      
      // Открываем окно авторизации
      console.log('[Yandex] Launching web auth flow');
      const redirectUrl = await browser.identity.launchWebAuthFlow({
        url: authUrl,
        interactive: true,
      });
      
      console.log('[Yandex] Received redirect URL:', redirectUrl);
      
      // Извлекаем токен из URL (в Implicit Flow токен возвращается в хэше URL)
      const hashParams = new URLSearchParams(
        redirectUrl.substring(redirectUrl.indexOf('#') + 1)
      );
      
      const accessToken = hashParams.get('access_token');
      const expiresIn = hashParams.get('expires_in');
      const tokenType = hashParams.get('token_type');
      const error = hashParams.get('error');
      
      if (error) {
        console.error('[Yandex] Authorization error:', error);
        throw new Error(`Authorization failed: ${error}`);
      }
      
      if (!accessToken) {
        console.error('[Yandex] No access token received in redirect URL');
        throw new Error('Authorization failed: No access token received');
      }
      
      console.log('[Yandex] Access token received directly (Implicit Flow)');
      
      // Создаем объект токена
      const token: AuthToken = {
        accessToken,
        expiresAt: Date.now() + (parseInt(expiresIn || '3600') * 1000),
        // В Implicit Flow нет refresh_token, поэтому refreshToken будет undefined
      };
      
      console.log('[Yandex] Token created, saving to storage');
      
      // Сохраняем токен в storage.local
      await this.saveToken(token);
      
      return token;
    } catch (error) {
      console.error('[Yandex] Authorization error:', error);
      throw error;
    }
  }
  
  /**
   * Получение действующего токена доступа
   */
  async getAccessToken(): Promise<string> {
    try {
      console.log('[Yandex] Getting access token');
      const token = await this.getToken();
      
      if (!token) {
        console.error('[Yandex] No authentication token found');
        throw new Error('No authentication token found');
      }
      
      // Проверяем, не истек ли токен
      if (token.expiresAt <= Date.now() + 60000) { // Добавляем минутный запас
        console.log('[Yandex] Token expired or about to expire, refreshing');
        
        // В Implicit Flow нам нужно заново авторизоваться
        const newToken = await this.authorize();
        return newToken.accessToken;
      }
      
      console.log('[Yandex] Using existing valid token');
      return token.accessToken;
    } catch (error) {
      console.error('[Yandex] Error getting access token:', error);
      throw error;
    }
  }
  
  /**
   * Получение информации о пользователе
   */
  async getUserProfile(): Promise<{ email: string }> {
    const accessToken = await this.getAccessToken();
    
    // Запрос к Yandex API для получения информации о пользователе
    const response = await fetch('https://login.yandex.ru/info', {
      headers: {
        'Authorization': `OAuth ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get user profile: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Возвращаем email пользователя
    return { email: data.default_email || data.emails[0] };
  }
  
  /**
   * Получение количества непрочитанных писем
   */
  async getUnreadCount(): Promise<number> {
    const accessToken = await this.getAccessToken();
    
    // Запрос к Yandex API для получения количества непрочитанных писем
    // Примечание: Это примерная реализация, так как Yandex API может отличаться
    const response = await fetch(
      `${YANDEX_API_BASE_URL}/mailbox/counters`, 
      {
        headers: {
          'Authorization': `OAuth ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get unread messages: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Возвращаем количество непрочитанных писем
    // Примечание: Структура ответа может отличаться в реальном API
    return data.counters.unread || 0;
  }
  
  /**
   * Проверка, авторизован ли пользователь
   */
  async isAuthorized(): Promise<boolean> {
    try {
      console.log('[Yandex] Checking if user is authorized');
      const token = await this.getToken();
      const isValid = !!token && token.expiresAt > Date.now();
      console.log('[Yandex] Authorization status:', isValid ? 'authorized' : 'not authorized');
      return isValid;
    } catch (error) {
      console.error('[Yandex] Error checking authorization:', error);
      return false;
    }
  }
  
  /**
   * Выход из аккаунта
   */
  async logout(): Promise<void> {
    console.log('[Yandex] Logging out');
    await this.removeToken();
  }
  
  /**
   * Сохранение токена в storage.local
   */
  private async saveToken(token: AuthToken): Promise<void> {
    console.log('[Yandex] Saving token to storage');
    await browser.storage.local.set({ [TOKEN_STORAGE_KEY]: token });
    
    // Проверяем, что данные сохранились
    const verification = await browser.storage.local.get(TOKEN_STORAGE_KEY);
    console.log('[Yandex] Verification of saved token:', verification[TOKEN_STORAGE_KEY] ? 'Token saved successfully' : 'Failed to save token');
  }
  
  /**
   * Получение токена из storage.local
   */
  private async getToken(): Promise<AuthToken | null> {
    console.log('[Yandex] Getting token from storage');
    const data = await browser.storage.local.get(TOKEN_STORAGE_KEY);
    return data[TOKEN_STORAGE_KEY] || null;
  }
  
  /**
   * Удаление токена из storage.local
   */
  private async removeToken(): Promise<void> {
    console.log('[Yandex] Removing token from storage');
    await browser.storage.local.remove(TOKEN_STORAGE_KEY);
  }
}
