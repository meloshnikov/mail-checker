// src/providers/provider-configs.ts
// Файл конфигураций для различных провайдеров электронной почты

export interface ProviderConfig {
  id: string; // Уникальный идентификатор провайдера (например, "gmail", "yandex")
  name: string; // Отображаемое имя провайдера (например, "Gmail", "Yandex Mail")
  clientId: string; // Идентификатор клиента OAuth
  authUrl: string; // URL страницы авторизации OAuth
  tokenUrl?: string; // Опциональный URL для обмена кода на токен (для Authorization Code Flow, не используется в Implicit)
  apiUrl: string; // Базовый URL API провайдера
  scopes: string[]; // Массив запрашиваемых OAuth scopes
  tokenStorageKey: string; // Ключ для сохранения токена в browser.storage.local
  iconUrl: string; // Путь к иконке провайдера (относительно корня расширения)
  mailUrl: string; // URL для перехода к почтовому ящику пользователя
  customAuthParams?: Record<string, string>; // Опциональные специфичные для провайдера параметры OAuth авторизации.
}

export const GMAIL_CONFIG: ProviderConfig = {
  id: 'gmail',
  name: 'Gmail',
  clientId: 'CLIENT_ID', // Это должен быть фактический идентификатор клиента из оригинального gmail-provider.ts
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

export const YANDEX_CONFIG: ProviderConfig = {
  id: 'yandex',
  name: 'Yandex Mail',
  clientId: 'YOUR_YANDEX_CLIENT_ID_HERE', // Заполнитель
  authUrl: 'https://oauth.yandex.ru/authorize',
  tokenUrl: 'https://oauth.yandex.ru/token',
  apiUrl: 'https://mail.yandex.ru/api/v1',
  scopes: ['mail:read'],
  tokenStorageKey: 'yandex_auth_token',
  iconUrl: 'assets/yandex-icon.png',
  mailUrl: 'https://mail.yandex.ru/',
};

export const ALL_PROVIDER_CONFIGS: ProviderConfig[] = [GMAIL_CONFIG, YANDEX_CONFIG];
