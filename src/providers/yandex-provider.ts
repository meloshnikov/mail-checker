import { AuthToken, StoredAccount } from '../types'; /** StoredAccount might not be needed if updateUnreadCount is not overridden */
import { OAuthImplicitFlowProvider } from './oauth-implicit-provider';
import { YANDEX_CONFIG } from './provider-configs';

/**
 * Примечание: Для работы с Yandex OAuth нужно зарегистрировать приложение в Yandex OAuth
 * и получить CLIENT_ID: https://oauth.yandex.ru/client/new
 * YANDEX_CONFIG.clientId должен быть заменен на реальный CLIENT_ID для функционирования.
 */

/**
 * Провайдер для работы с Yandex Mail
 */
export class YandexProvider extends OAuthImplicitFlowProvider {
  constructor() {
    super(YANDEX_CONFIG);
  }
  
  /**
   * Получение информации о пользователе
   */
  async getUserProfile(): Promise<{ email: string }> {
    /** Используем getAccessToken из OAuthImplicitFlowProvider (через super или this) */
    const accessToken = await super.getAccessToken(); 
    
    
    /** 
     * Запрос к Yandex API для получения информации о пользователе.
     * URL для получения профиля пользователя может быть специфичным и не всегда совпадать с config.apiUrl.
     */
    const userProfileUrl = 'https://login.yandex.ru/info'; /** Этот URL специфичен для Яндекс.Паспорта */
    console.log(`[${this.config.id}] Getting user profile from: ${userProfileUrl}`);
    const response = await fetch(userProfileUrl, {
      headers: {
        'Authorization': `OAuth ${accessToken}`,
      },
    });

    if (!response.ok) {
      console.error(`[${this.config.id}] Failed to get user profile:`, response.status, response.statusText);
      throw new Error(`Failed to get user profile: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`[${this.config.id}] User profile data:`, data);
    
    /** Возвращаем email пользователя */
    const email = data.default_email || (data.emails && data.emails[0]);
    if (!email) {
      console.error(`[${this.config.id}] No email found in user profile data:`, data);
      throw new Error('No email found in Yandex user profile');
    }
    return { email };
  }
  
  /**
   * Получение количества непрочитанных писем
   */
  async getUnreadCount(): Promise<number> {
    /** Используем getAccessToken из OAuthImplicitFlowProvider */
    const accessToken = await super.getAccessToken(); 
    
    /** 
     * Запрос к Yandex API для получения количества непрочитанных писем.
     * Используем this.config.apiUrl из YANDEX_CONFIG.
     */
    const unreadCountUrl = `${this.config.apiUrl}/mailbox_counters`; /** Уточнено, что это /mailbox_counters, а не /mailbox/counters */
    console.log(`[${this.config.id}] Getting unread count from: ${unreadCountUrl}`);
    
    const response = await fetch(
      unreadCountUrl, 
      {
        headers: {
          'Authorization': `OAuth ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      console.error(`[${this.config.id}] Failed to get unread messages:`, response.status, response.statusText);
      throw new Error(`Failed to get unread messages: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`[${this.config.id}] Unread count data:`, data);
    
    /**
     * Возвращаем количество непрочитанных писем.
     * Примечание: Структура ответа может отличаться в реальном API, но `data.unread` (или data.counters.unread) является общим паттерном.
     * Судя по документации Yandex Mail API (хотя она может меняться), это `data.unread`.
     */
    return data.unread || 0; 
  }

  /**
   * Методы authorize, getAccessToken, isAuthorized, logout, saveToken, getToken, removeToken
   * теперь наследуются от OAuthImplicitFlowProvider.
   * Метод updateUnreadCount наследуется от BaseEmailProvider (через OAuthImplicitFlowProvider)
   * и будет использовать реализованные выше getUserProfile и getUnreadCount.
   * Для Yandex нет необходимости в IHistoryProvider, поэтому getHistory/getMessage не реализуются.
   */
}
