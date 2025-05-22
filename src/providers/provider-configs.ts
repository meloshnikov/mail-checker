// src/providers/provider-configs.ts
// Файл конфигураций для различных провайдеров электронной почты

export interface ProviderConfig {
  id: string;
  name: string;
  clientId: string;
  authUrl: string;
  tokenUrl?: string;
  apiUrl: string;
  scopes: string[];
  tokenStorageKey: string;
  iconUrl: string;
  mailUrl: string;
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
