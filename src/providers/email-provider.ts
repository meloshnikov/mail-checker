import { AuthToken, StoredAccount } from '../types';

/**
 * Интерфейс для провайдера электронной почты
 */
export interface EmailProvider {
  /**
   * Уникальный идентификатор провайдера
   */
  readonly id: string;
  
  /**
   * Название провайдера
   */
  readonly name: string;
  
  /**
   * URL иконки провайдера
   */
  readonly iconUrl: string;
  
  /**
   * URL для открытия почтового ящика
   */
  readonly mailUrl: string;
  
  /**
   * Авторизация пользователя
   */
  authorize(): Promise<AuthToken>;
  
  /**
   * Получение действующего токена доступа
   */
  getAccessToken(): Promise<string>;
  
  /**
   * Получение информации о пользователе
   */
  getUserProfile(): Promise<{ email: string }>;
  
  /**
   * Получение количества непрочитанных писем
   */
  getUnreadCount(): Promise<number>;
  
  /**
   * Проверка, авторизован ли пользователь
   */
  isAuthorized(): Promise<boolean>;
  
  /**
   * Выход из аккаунта
   */
  logout(): Promise<void>;
  
  /**
   * Открытие почтового ящика в новой вкладке
   */
  openMail(email?: string): void;
  
  /**
   * Получение полной информации об аккаунте, включая непрочитанные письма и другие детали.
   */
  fetchStoredAccountData(): Promise<StoredAccount>;
}

/**
 * Интерфейс для провайдера, поддерживающего историю сообщений
 */
import { GmailMessageDetail } from '../types'; // Убедитесь, что путь правильный

export interface IHistoryProvider extends EmailProvider {
  getHistory(startHistoryId?: string): Promise<{ historyId: string; messages: GmailMessageDetail[] }>;
  getMessage(messageId: string): Promise<GmailMessageDetail>;
  // Рассмотреть, нужны ли здесь saveLastHistoryId/getLastHistoryId или это детали внутренней реализации.
  // Пока что оставляем их вне интерфейса согласно плану.
}

/**
 * Абстрактный класс для провайдера электронной почты
 */
export abstract class BaseEmailProvider implements EmailProvider {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly iconUrl: string;
  abstract readonly mailUrl: string;
  
  abstract authorize(): Promise<AuthToken>;
  abstract getAccessToken(): Promise<string>;
  abstract getUserProfile(): Promise<{ email: string }>;
  abstract getUnreadCount(): Promise<number>;
  abstract isAuthorized(): Promise<boolean>;
  abstract logout(): Promise<void>;
  
  /**
   * Открытие почтового ящика в новой вкладке
   */
  openMail(email?: string): void {
    let url = this.mailUrl;
    
    if (email) {
      // Если указан email, добавляем его в URL
      url = `${this.mailUrl}${email}`;
    }
    
    browser.tabs.create({ url });
  }
  
  /**
   * Получение полной информации об аккаунте, включая непрочитанные письма и другие детали.
   * Этот метод предназначен для получения всех данных, необходимых для создания объекта StoredAccount.
   */
  async fetchStoredAccountData(): Promise<StoredAccount> {
    try {
      console.log(`[${this.id}] Starting fetchStoredAccountData`);
      
      // Получаем профиль пользователя
      console.log(`[${this.id}] Getting user profile for fetchStoredAccountData`);
      const profile = await this.getUserProfile();
      console.log(`[${this.id}] User profile received:`, profile);
      
      // Получаем количество непрочитанных писем
      console.log(`[${this.id}] Getting unread count for`, profile.email);
      const unreadCount = await this.getUnreadCount();
      console.log(`[${this.id}] Unread count received:`, unreadCount);
      
      // Создаем объект с информацией об аккаунте
      const account: StoredAccount = {
        providerId: this.id,
        email: profile.email,
        unreadCount,
        lastUpdated: Date.now(),
      };
      console.log(`[${this.id}] Account object created:`, account);
      
      return account;
    } catch (error) {
      console.error(`[${this.id}] Error in fetchStoredAccountData:`, error);
      throw error;
    }
  }
}

/**
 * Фабрика для создания провайдеров электронной почты
 */
export class EmailProviderFactory {
  
  /**
   * Регистрация провайдера
   */
  static registerProvider(provider: EmailProvider): void {
    this.providers.set(provider.id, provider);
  }
  
  /**
   * Получение провайдера по ID
   */
  static getProvider(id: string): EmailProvider | undefined {
    return this.providers.get(id);
  }
  
  /**
   * Получение всех зарегистрированных провайдеров
   */
  static getAllProviders(): EmailProvider[] {
    return Array.from(this.providers.values());
  }
}
