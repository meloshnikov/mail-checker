import { MessageType, StoredAccount, Settings } from '../types'; // Removed GmailMessageDetail, GmailProvider may be removed if not used
import EmailProviderFactory from '../providers'; // Removed specific GmailProvider import, relying on EmailProvider interface

// Настройки по умолчанию
const DEFAULT_SETTINGS: Settings = {
  updateInterval: 5, // 5 минут
};

// Имя для планировщика обновлений
const UPDATE_ALARM_NAME = 'email-checker-update';

// Ключ для хранения аккаунтов в storage.local
const ACCOUNTS_STORAGE_KEY = 'email_accounts';

/**
 * Инициализация расширения
 */
async function initialize(): Promise<void> {
  try {
    console.log('Initializing extension');
    
    // Загружаем настройки
    const settings = await loadSettings();
    console.log('Settings loaded:', settings);
    
    // Устанавливаем планировщик обновлений
    setupUpdateAlarm(settings.updateInterval);
    
    // Обновляем данные
    await updateBadge();
  } catch (error: unknown) {
    console.error('Initialization error:', error);
    setBadgeError();
  }
}

/**
 * Загрузка настроек
 */
async function loadSettings(): Promise<Settings> {
  console.log('Loading settings from storage');
  const data = await browser.storage.local.get('settings');
  console.log('Settings from storage:', data.settings);
  return data.settings || DEFAULT_SETTINGS;
}

/**
 * Сохранение настроек
 */
async function saveSettings(settings: Settings): Promise<void> {
  console.log('Saving settings to storage:', settings);
  await browser.storage.local.set({ settings });
  
  // Обновляем планировщик с новыми настройками
  setupUpdateAlarm(settings.updateInterval);
}

/**
 * Настройка планировщика обновлений
 */
function setupUpdateAlarm(intervalMinutes: number): void {
  console.log('Setting up update alarm with interval:', intervalMinutes);
  // Удаляем существующий планировщик, если он есть
  browser.alarms.clear(UPDATE_ALARM_NAME).then(() => {
    // Создаем новый планировщик
    browser.alarms.create(UPDATE_ALARM_NAME, {
      periodInMinutes: intervalMinutes,
    });
    console.log('Update alarm created');
  });
}

/**
 * Получение всех аккаунтов из storage.local
 */
async function getAccounts(): Promise<StoredAccount[]> {
  console.log('Getting accounts from storage');
  const data = await browser.storage.local.get(ACCOUNTS_STORAGE_KEY);
  const accounts = data[ACCOUNTS_STORAGE_KEY] || [];
  console.log('Accounts from storage:', accounts);
  return accounts;
}

/**
 * Сохранение аккаунтов в storage.local
 */
async function saveAccounts(accounts: StoredAccount[]): Promise<void> {
  console.log('Saving accounts to storage:', accounts);
  await browser.storage.local.set({ [ACCOUNTS_STORAGE_KEY]: accounts });
}

/**
 * Добавление или обновление аккаунта
 */
async function updateAccount(account: StoredAccount): Promise<StoredAccount[]> {
  console.log('Updating account:', account);
  
  // Получаем текущие аккаунты
  const accounts = await getAccounts();
  
  // Ищем аккаунт с таким же email
  const index = accounts.findIndex((account) => account.email === account.email);
  
  if (index >= 0) {
    // Обновляем существующий аккаунт
    accounts[index] = account;
  } else {
    // Добавляем новый аккаунт
    accounts.push(account);
  }
  
  // Сохраняем обновленные аккаунты
  await saveAccounts(accounts);
  
  return accounts;
}

/**
 * Удаление аккаунта
 */
async function removeAccount(email: string): Promise<StoredAccount[]> {
  console.log('Removing account:', email);
  
  // Получаем текущие аккаунты
  const accounts = await getAccounts();
  
  // Удаляем аккаунт с указанным email
  const updatedAccounts = accounts.filter(a => a.email !== email);
  
  // Сохраняем обновленные аккаунты
  await saveAccounts(updatedAccounts);
  
  return updatedAccounts;
}

/**
 * Обновление данных для всех аккаунтов
 */
async function updateAllAccounts(): Promise<StoredAccount[]> {
  console.log('Updating all accounts');
  
  // Получаем текущие аккаунты
  const accounts = await getAccounts();
  
  if (accounts.length === 0) {
    console.log('No accounts to update');
    return [];
  }
  
  // Обновляем данные для каждого аккаунта
  const updatedAccounts: StoredAccount[] = [];
  
  for (const account of accounts) {
    try {
      console.log(`Updating account: ${account.email} (${account.providerId})`);
      
      // Получаем провайдер для аккаунта
      const provider = EmailProviderFactory.getProvider(account.providerId);
      
      if (!provider) {
        console.error(`Provider not found for account: ${account.email} (${account.providerId})`);
        continue;
      }
      
      // Проверяем авторизацию
      const authorized = await provider.isAuthorized();
      
      if (!authorized) {
        console.log(`Account not authorized: ${account.email} (${account.providerId})`);
        continue;
      }

      // Вся логика получения данных аккаунта теперь инкапсулирована в provider.fetchStoredAccountData()
      // Это включает получение непрочитанных сообщений, деталей истории (для Gmail), и т.д.
      console.log(`Fetching stored account data for ${account.email} using provider ${provider.id}`);
      const updatedAccount: StoredAccount = await provider.fetchStoredAccountData();
      
      // Специфичная для провайдера логика, такая как сохранение lastHistoryId, теперь обрабатывается в fetchStoredAccountData.
      // Здесь не нужны специальные проверки или вызовы вроде gmailProvider.saveLastHistoryId().

      updatedAccounts.push(updatedAccount);

    } catch (error) {
      console.error(`Error updating account ${account.email}:`, error);
      // В случае ошибки сохраняем исходные данные аккаунта
      updatedAccounts.push(account);
    }
  }

  // Сохраняем обновленные аккаунты
  await saveAccounts(updatedAccounts);

  return updatedAccounts;
}

/**
 * Обновление значка расширения
 */
async function updateBadge(): Promise<void> {
  try {
    console.log('Updating badge');
    
    // Обновляем данные для всех аккаунтов
    const accounts = await updateAllAccounts();
    
    if (accounts.length === 0) {
      console.log('No accounts found, setting default badge');
      setBadgeDefault();
      return;
    }
    
    // Суммируем количество непрочитанных писем
    const totalUnread = accounts.reduce((sum, account) => sum + account.unreadCount, 0);
    console.log('Total unread count:', totalUnread);
    
    // Устанавливаем значок
    setBadgeCount(totalUnread);
    
    // Отправляем сообщение в popup
    console.log('Sending UPDATE_COMPLETE message with accounts:', accounts);
    browser.runtime.sendMessage({
      type: MessageType.UPDATE_COMPLETE,
      payload: {
        accounts,
      },
    });
  } catch (error: unknown) {
    console.error('Update badge error:', error);
    setBadgeError();
    
    // Отправляем сообщение об ошибке в popup
    browser.runtime.sendMessage({
      type: MessageType.ERROR,
      payload: {
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
}

/**
 * Авторизация аккаунта
 */
async function authorizeAccount(providerId: string): Promise<StoredAccount> {
  console.log(`Authorizing account for provider: ${providerId}`);
  
  // Получаем провайдер
  const provider = EmailProviderFactory.getProvider(providerId);
  
  if (!provider) {
    throw new Error(`Provider not found: ${providerId}`);
  }
  
  // Авторизуем пользователя
  await provider.authorize();
  
  // Обновляем данные
  const account = await provider.fetchStoredAccountData(); // Используем новый метод
  
  // Сохраняем аккаунт
  await updateAccount(account);
  
  return account;
}

/**
 * Выход из аккаунта
 */
async function logoutAccount(email: string): Promise<void> {
  console.log(`Logging out account: ${email}`);
  
  // Получаем аккаунт
  const accounts = await getAccounts();
  const account = accounts.find(a => a.email === email);
  
  if (!account) {
    throw new Error(`Account not found: ${email}`);
  }
  
  // Получаем провайдер
  const provider = EmailProviderFactory.getProvider(account.providerId);
  
  if (!provider) {
    throw new Error(`Provider not found: ${account.providerId}`);
  }
  
  // Выходим из аккаунта
  await provider.logout();
  
  // Удаляем аккаунт из хранилища
  await removeAccount(email);
}

/**
 * Открытие почтового ящика
 */
function openMail(email: string): void {
  console.log(`Opening mail for: ${email}`);
  
  // Получаем аккаунты
  getAccounts().then(accounts => {
    const account = accounts.find(a => a.email === email);
    
    if (!account) {
      console.error(`Account not found: ${email}`);
      return;
    }
    
    // Получаем провайдер
    const provider = EmailProviderFactory.getProvider(account.providerId);
    
    if (!provider) {
      console.error(`Provider not found: ${account.providerId}`);
      return;
    }
    
    // Открываем почтовый ящик
    provider.openMail(email);
  });
}

/**
 * Установка значка с количеством непрочитанных писем
 */
function setBadgeCount(count: number): void {
  console.log('Setting badge count:', count);
  // Устанавливаем текст значка
  browser.browserAction.setBadgeText({
    text: count > 0 ? count.toString() : '',
  });
  
  // Устанавливаем цвет значка
  browser.browserAction.setBadgeBackgroundColor({
    color: '#4285F4', // Синий цвет Google
  });
}

/**
 * Установка значка по умолчанию (без непрочитанных писем)
 */
function setBadgeDefault(): void {
  console.log('Setting default badge');
  browser.browserAction.setBadgeText({
    text: '',
  });
  
  browser.browserAction.setBadgeBackgroundColor({
    color: '#4285F4',
  });
}

/**
 * Установка значка ошибки
 */
function setBadgeError(): void {
  console.log('Setting error badge');
  browser.browserAction.setBadgeText({
    text: '!',
  });
  
  browser.browserAction.setBadgeBackgroundColor({
    color: '#EA4335', // Красный цвет Google
  });
}

/**
 * Обработчик сообщений от popup
 */
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Message received in background:', message);
  
  switch (message.type) {
    case MessageType.AUTH_REQUEST:
      // Запрос на авторизацию
      console.log('Received AUTH_REQUEST message');
      const providerId = message.payload?.providerId || 'gmail'; // По умолчанию Gmail
      
      authorizeAccount(providerId)
        .then(account => {
          console.log('Authorization successful, account:', account);
          
          // Обновляем значок
          updateBadge().then(() => {
            // Отправляем сообщение об успешной авторизации
            browser.runtime.sendMessage({
              type: MessageType.AUTH_COMPLETE,
              payload: {
                account,
              },
            });
          });
        })
        .catch((error: unknown) => {
          console.error('Authorization error:', error);
          browser.runtime.sendMessage({
            type: MessageType.ERROR,
            payload: {
              message: error instanceof Error ? error.message : 'Unknown error',
            },
          });
        });
      break;
      
    case MessageType.LOGOUT_REQUEST:
      // Запрос на выход из аккаунта
      console.log('Received LOGOUT_REQUEST message');
      const email = message.payload?.email;
      
      if (!email) {
        console.error('No email provided for logout');
        browser.runtime.sendMessage({
          type: MessageType.ERROR,
          payload: {
            message: 'No email provided for logout',
          },
        });
        break;
      }
      
      logoutAccount(email)
        .then(() => {
          console.log('Logout successful');
          
          // Обновляем значок
          updateBadge().then(() => {
            // Отправляем сообщение об успешном выходе
            browser.runtime.sendMessage({
              type: MessageType.LOGOUT_COMPLETE,
            });
          });
        })
        .catch((error: unknown) => {
          console.error('Logout error:', error);
          browser.runtime.sendMessage({
            type: MessageType.ERROR,
            payload: {
              message: error instanceof Error ? error.message : 'Unknown error',
            },
          });
        });
      break;
      
    case MessageType.OPEN_MAIL_REQUEST:
      // Запрос на открытие почтового ящика
      console.log('Received OPEN_MAIL_REQUEST message');
      const mailEmail = message.payload?.email;
      
      if (!mailEmail) {
        console.error('No email provided for opening mail');
        browser.runtime.sendMessage({
          type: MessageType.ERROR,
          payload: {
            message: 'No email provided for opening mail',
          },
        });
        break;
      }
      
      // Открываем почтовый ящик
      openMail(mailEmail);
      break;
      
    case MessageType.REQUEST_UPDATE:
      // Запрос на обновление данных
      console.log('Received REQUEST_UPDATE message');
      updateBadge()
        .then(() => {
          console.log('Badge updated successfully');
        })
        .catch((error: unknown) => {
          console.error('Update error:', error);
          browser.runtime.sendMessage({
            type: MessageType.ERROR,
            payload: {
              message: error instanceof Error ? error.message : 'Unknown error',
            },
          });
        });
      break;
  }
  
  // Возвращаем true для асинхронной обработки
  return true;
});

/**
 * Обработчик нажатия на значок расширения
 */
browser.browserAction.onClicked.addListener(() => {
  console.log('Browser action clicked');
  // Если popup не настроен, открываем первый аккаунт
  getAccounts().then(accounts => {
    if (accounts.length > 0) {
      openMail(accounts[0].email);
    }
  });
});

/**
 * Обработчик срабатывания планировщика
 */
browser.alarms.onAlarm.addListener(alarm => {
  console.log('Alarm triggered:', alarm.name);
  if (alarm.name === UPDATE_ALARM_NAME) {
    console.log('Update alarm triggered, updating badge');
    updateBadge();
  }
});

// Инициализация расширения при запуске
console.log('Background script loaded, initializing extension');
initialize();
