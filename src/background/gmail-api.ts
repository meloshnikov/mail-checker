import { getAccessToken } from './auth';
import { GmailListMessagesResponse, StoredAccount } from '../types';

// Базовый URL для Gmail API
const GMAIL_API_BASE_URL = 'https://www.googleapis.com/gmail/v1';

/**
 * Получение информации о текущем пользователе
 */
export async function getUserProfile(): Promise<{ email: string }> {
  const accessToken = await getAccessToken();
  
  const response = await fetch(`${GMAIL_API_BASE_URL}/users/me/profile`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get user profile: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Получение количества непрочитанных писем
 */
export async function getUnreadCount(): Promise<number> {
  const accessToken = await getAccessToken();
  
  // Запрос к Gmail API для получения непрочитанных писем
  const response = await fetch(
    `${GMAIL_API_BASE_URL}/users/me/messages?q=is:unread&maxResults=1`, 
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to get unread messages: ${response.status} ${response.statusText}`);
  }

  const data: GmailListMessagesResponse = await response.json();
  
  // Возвращаем оценочное количество непрочитанных писем
  return data.resultSizeEstimate;
}

/**
 * Обновление информации о непрочитанных письмах
 */
export async function updateUnreadCount(): Promise<StoredAccount> {
  try {
    // Получаем профиль пользователя
    const profile = await getUserProfile();
    
    // Получаем количество непрочитанных писем
    const unreadCount = await getUnreadCount();
    
    // Создаем объект с информацией об аккаунте
    const account: StoredAccount = {
      email: profile.email,
      unreadCount,
      lastUpdated: Date.now(),
    };
    
    // Сохраняем информацию в storage.local
    await saveAccount(account);
    
    return account;
  } catch (error) {
    console.error('Error updating unread count:', error);
    throw error;
  }
}

/**
 * Сохранение информации об аккаунте в storage.local
 */
export async function saveAccount(account: StoredAccount): Promise<void> {
  const data = await browser.storage.local.get('accounts');
  const accounts: StoredAccount[] = data.accounts || [];
  
  // Ищем аккаунт с таким же email
  const index = accounts.findIndex(a => a.email === account.email);
  
  if (index >= 0) {
    // Обновляем существующий аккаунт
    accounts[index] = account;
  } else {
    // Добавляем новый аккаунт
    accounts.push(account);
  }
  
  await browser.storage.local.set({ accounts });
}

/**
 * Получение всех сохраненных аккаунтов
 */
export async function getAccounts(): Promise<StoredAccount[]> {
  const data = await browser.storage.local.get('accounts');
  return data.accounts || [];
}

/**
 * Удаление аккаунта из storage.local
 */
export async function removeAccount(email: string): Promise<void> {
  const data = await browser.storage.local.get('accounts');
  const accounts: StoredAccount[] = data.accounts || [];
  
  // Фильтруем аккаунты, оставляя только те, у которых email не совпадает
  const filteredAccounts = accounts.filter(a => a.email !== email);
  
  await browser.storage.local.set({ accounts: filteredAccounts });
}

/**
 * Открытие Gmail в новой вкладке
 */
export function openGmail(email?: string): void {
  let url = 'https://mail.google.com/';
  
  if (email) {
    // Если указан email, открываем Gmail для конкретного аккаунта
    url = `https://mail.google.com/mail/u/${email}`;
  }
  
  browser.tabs.create({ url });
}
