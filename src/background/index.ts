import { authorize, removeToken, isAuthorized } from './auth';
import { updateUnreadCount, getAccounts, removeAccount, openGmail } from './gmail-api';
import { MessageType, StoredAccount, Settings, ConnectionStatus } from '../types';

// Настройки по умолчанию
const DEFAULT_SETTINGS: Settings = {
  updateInterval: 5, // 5 минут
};

// Имя для планировщика обновлений
const UPDATE_ALARM_NAME = 'gmail-unread-counter-update';

/**
 * Инициализация расширения
 */
async function initialize(): Promise<void> {
  try {
    // Загружаем настройки
    const settings = await loadSettings();
    
    // Устанавливаем планировщик обновлений
    setupUpdateAlarm(settings.updateInterval);
    
    // Проверяем авторизацию
    const authorized = await isAuthorized();
    
    if (authorized) {
      // Если пользователь авторизован, обновляем данные
      await updateBadge();
    } else {
      // Если пользователь не авторизован, устанавливаем значок по умолчанию
      setBadgeDefault();
    }
  } catch (error: unknown) {
    console.error('Initialization error:', error);
    setBadgeError();
  }
}

/**
 * Загрузка настроек
 */
async function loadSettings(): Promise<Settings> {
  const data = await browser.storage.local.get('settings');
  return data.settings || DEFAULT_SETTINGS;
}

/**
 * Сохранение настроек
 */
async function saveSettings(settings: Settings): Promise<void> {
  await browser.storage.local.set({ settings });
  
  // Обновляем планировщик с новыми настройками
  setupUpdateAlarm(settings.updateInterval);
}

/**
 * Настройка планировщика обновлений
 */
function setupUpdateAlarm(intervalMinutes: number): void {
  // Удаляем существующий планировщик, если он есть
  browser.alarms.clear(UPDATE_ALARM_NAME).then(() => {
    // Создаем новый планировщик
    browser.alarms.create(UPDATE_ALARM_NAME, {
      periodInMinutes: intervalMinutes,
    });
  });
}

/**
 * Обновление значка расширения
 */
async function updateBadge(): Promise<void> {
  try {
    // Проверяем авторизацию
    const authorized = await isAuthorized();
    
    if (!authorized) {
      setBadgeDefault();
      return;
    }
    
    // Обновляем данные
    await updateUnreadCount();
    
    // Получаем все аккаунты
    const accounts = await getAccounts();
    
    if (accounts.length === 0) {
      setBadgeDefault();
      return;
    }
    
    // Суммируем количество непрочитанных писем
    const totalUnread = accounts.reduce((sum, account) => sum + account.unreadCount, 0);
    
    // Устанавливаем значок
    setBadgeCount(totalUnread);
    
    // Отправляем сообщение в popup
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
 * Установка значка с количеством непрочитанных писем
 */
function setBadgeCount(count: number): void {
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
  switch (message.type) {
    case MessageType.AUTH_REQUEST:
      // Запрос на авторизацию
      authorize()
        .then(() => updateBadge())
        .then(() => {
          browser.runtime.sendMessage({
            type: MessageType.AUTH_COMPLETE,
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
      const email = message.payload?.email;
      
      Promise.all([
        removeToken(),
        email ? removeAccount(email) : Promise.resolve(),
      ])
        .then(() => {
          setBadgeDefault();
          browser.runtime.sendMessage({
            type: MessageType.LOGOUT_COMPLETE,
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
      
    case MessageType.REQUEST_UPDATE:
      // Запрос на обновление данных
      updateBadge()
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
  // Если popup не настроен, открываем Gmail
  openGmail();
});

/**
 * Обработчик срабатывания планировщика
 */
browser.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === UPDATE_ALARM_NAME) {
    updateBadge();
  }
});

// Инициализация расширения при запуске
initialize();
