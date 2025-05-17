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
   * Обновление информации о непрочитанных письмах
   */
  updateUnreadCount(): Promise<StoredAccount>;
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
   * Обновление информации о непрочитанных письмах
   */
  async updateUnreadCount(): Promise<StoredAccount> {
    try {
      console.log(`[${this.id}] Starting updateUnreadCount`);
      
      // Получаем профиль пользователя
      console.log(`[${this.id}] Getting user profile`);
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
      console.error(`[${this.id}] Error updating unread count:`, error);
      throw error;
    }
  }
}

/**
 * Фабрика для создания провайдеров электронной почты
 */
export class EmailProviderFactory {
  private static providers: Map<string, EmailProvider> = new Map();
  
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
