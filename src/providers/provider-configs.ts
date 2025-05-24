/**
 * Конфигурации для провайдеров электронной почты.
 * Файл конфигураций для различных провайдеров электронной почты.
 */

export interface ProviderConfig {
  /** @property {string} id - Уникальный идентификатор провайдера (например, "gmail", "yandex") */
  id: string; 
  /** @property {string} name - Отображаемое имя провайдера (например, "Gmail", "Yandex Mail") */
  name: string; 
  /** @property {string} clientId - Идентификатор клиента OAuth */
  clientId: string; 
  /** @property {string} authUrl - URL страницы авторизации OAuth */
  authUrl: string; 
  /** @property {string} tokenUrl - Опциональный URL для обмена кода на токен (для Authorization Code Flow, не используется в Implicit) */
  tokenUrl?: string; 
  /** @property {string} apiUrl - Базовый URL API провайдера */
  apiUrl: string; 
  /** @property {string[]} scopes - Массив запрашиваемых OAuth scopes */
  scopes: string[]; 
  /** @property {string} tokenStorageKey - Ключ для сохранения токена в browser.storage.local */
  tokenStorageKey: string; 
  /** @property {string} iconUrl - Путь к иконке провайдера (относительно корня расширения) */
  iconUrl: string; 
  /** @property {string} mailUrl - URL для перехода к почтовому ящику пользователя */
  mailUrl: string; 
  /** @property {Record<string, string>} customAuthParams - Опциональные специфичные для провайдера параметры OAuth авторизации. */
  customAuthParams?: Record<string, string>; 
}

/** Конфигурация для Gmail */
export const GMAIL_CONFIG: ProviderConfig = {
  id: 'gmail',
  name: 'Gmail',
  clientId: 'CLIENT_ID', /** Это должен быть фактический идентификатор клиента из оригинального gmail-provider.ts */
  authUrl: 'https://accounts.google.com/o/oauth2/auth',
  tokenUrl: 'https://oauth2.googleapis.com/token',
  apiUrl: 'https://gmail.googleapis.com/gmail/v1',
  scopes: ['https://www.googleapis.com/auth/gmail.readonly'],
  tokenStorageKey: 'gmail_auth_token',
  iconUrl: 'assets/gmail-icon.png',
  mailUrl: 'https://mail.google.com/mail/u/',
  customAuthParams: {
    'prompt': 'consent',
    'include_granted_scopes': 'true'
  }
};

/** Конфигурация для Yandex Mail */
export const YANDEX_CONFIG: ProviderConfig = {
  id: 'yandex',
  name: 'Yandex Mail',
  clientId: 'YOUR_YANDEX_CLIENT_ID_HERE', /** Заполнитель */
  authUrl: 'https://oauth.yandex.ru/authorize',
  tokenUrl: 'https://oauth.yandex.ru/token',
  apiUrl: 'https://mail.yandex.ru/api/v1',
  scopes: ['mail:read'],
  tokenStorageKey: 'yandex_auth_token',
  iconUrl: 'assets/yandex-icon.png',
  mailUrl: 'https://mail.yandex.ru/',
};

/** Массив всех конфигураций провайдеров */
export const ALL_PROVIDER_CONFIGS: ProviderConfig[] = [GMAIL_CONFIG, YANDEX_CONFIG];
