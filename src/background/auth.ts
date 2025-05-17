import { AuthToken } from '../types';

// Константы для OAuth 2.0
const CLIENT_ID = 'YOUR_CLIENT_ID'; // Заменить на реальный CLIENT_ID при регистрации приложения
const REDIRECT_URL = browser.identity.getRedirectURL();
const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
const AUTH_URL = 'https://accounts.google.com/o/oauth2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

// Ключ для хранения токена в storage.local
const TOKEN_STORAGE_KEY = 'gmail_auth_token';

/**
 * Получение URL для авторизации
 */
export function getAuthUrl(): string {
  const url = new URL(AUTH_URL);
  url.searchParams.append('client_id', CLIENT_ID);
  url.searchParams.append('response_type', 'code');
  url.searchParams.append('redirect_uri', REDIRECT_URL);
  url.searchParams.append('scope', SCOPES.join(' '));
  url.searchParams.append('access_type', 'offline');
  url.searchParams.append('prompt', 'consent');
  
  return url.toString();
}

/**
 * Обмен кода авторизации на токены
 */
async function exchangeCodeForToken(code: string): Promise<AuthToken> {
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code,
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URL,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    throw new Error(`Token exchange failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  
  return {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
    refreshToken: data.refresh_token,
  };
}

/**
 * Обновление токена доступа с помощью refresh token
 */
async function refreshAccessToken(refreshToken: string): Promise<AuthToken> {
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: CLIENT_ID,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    throw new Error(`Token refresh failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  
  return {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
    refreshToken, // Сохраняем старый refresh token
  };
}

/**
 * Авторизация пользователя через OAuth 2.0
 */
export async function authorize(): Promise<AuthToken> {
  const authUrl = getAuthUrl();
  
  // Открываем окно авторизации
  const redirectUrl = await browser.identity.launchWebAuthFlow({
    url: authUrl,
    interactive: true,
  });
  
  // Извлекаем код авторизации из URL
  const url = new URL(redirectUrl);
  const code = url.searchParams.get('code');
  
  if (!code) {
    throw new Error('Authorization failed: No code received');
  }
  
  // Обмениваем код на токены
  const token = await exchangeCodeForToken(code);
  
  // Сохраняем токен в storage.local
  await saveToken(token);
  
  return token;
}

/**
 * Получение действующего токена доступа
 */
export async function getAccessToken(): Promise<string> {
  const token = await getToken();
  
  if (!token) {
    throw new Error('No authentication token found');
  }
  
  // Проверяем, не истек ли токен
  if (token.expiresAt <= Date.now() + 60000) { // Добавляем минутный запас
    if (!token.refreshToken) {
      throw new Error('Token expired and no refresh token available');
    }
    
    // Обновляем токен
    const newToken = await refreshAccessToken(token.refreshToken);
    
    // Сохраняем обновленный токен
    await saveToken({
      ...newToken,
      refreshToken: token.refreshToken,
    });
    
    return newToken.accessToken;
  }
  
  return token.accessToken;
}

/**
 * Сохранение токена в storage.local
 */
export async function saveToken(token: AuthToken): Promise<void> {
  await browser.storage.local.set({ [TOKEN_STORAGE_KEY]: token });
}

/**
 * Получение токена из storage.local
 */
export async function getToken(): Promise<AuthToken | null> {
  const data = await browser.storage.local.get(TOKEN_STORAGE_KEY);
  return data[TOKEN_STORAGE_KEY] || null;
}

/**
 * Удаление токена из storage.local (выход из аккаунта)
 */
export async function removeToken(): Promise<void> {
  await browser.storage.local.remove(TOKEN_STORAGE_KEY);
}

/**
 * Проверка, авторизован ли пользователь
 */
export async function isAuthorized(): Promise<boolean> {
  try {
    const token = await getToken();
    return !!token && token.expiresAt > Date.now();
  } catch (error) {
    return false;
  }
}
