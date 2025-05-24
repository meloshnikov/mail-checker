/** Типы для работы с Gmail API */
export interface GmailMessage {
  /** @property {string} id - Идентификатор сообщения. */
  id: string;
  /** @property {string} threadId - Идентификатор цепочки сообщений. */
  threadId: string;
  /** @property {string[]} labelIds - Массив идентификаторов меток. */
  labelIds: string[];
}

/** Типы для ответа со списком сообщений Gmail. */
export interface GmailListMessagesResponse {
  /** @property {GmailMessage[]} messages - Массив сообщений. */
  messages?: GmailMessage[];
  /** @property {string} nextPageToken - Токен для получения следующей страницы результатов. */
  nextPageToken?: string;
  /** @property {number} resultSizeEstimate - Приблизительное количество результатов. */
  resultSizeEstimate: number;
}

/** Типы для детальной информации о сообщении */
export interface GmailMessageHeader {
  /** @property {string} name - Имя заголовка. */
  name: string;
  /** @property {string} value - Значение заголовка. */
  value: string;
}

/** Тип для части сообщения Gmail (для multipart). */
export interface GmailMessagePart {
  /** @property {string} partId - Идентификатор части сообщения. */
  partId: string;
  /** @property {string} mimeType - MIME-тип части сообщения. */
  mimeType: string;
  /** @property {string} filename - Имя файла (если часть является вложением). */
  filename: string;
  /** @property {GmailMessageHeader[]} headers - Заголовки части сообщения. */
  headers: GmailMessageHeader[];
  /** @property {{ size: number; data?: string }} body - Тело части сообщения. */
  body: {
    size: number;
    data?: string; /** Данные в кодировке Base64Url */
  };
  /** @property {GmailMessagePart[]} parts - Вложенные части сообщения (для multipart/alternative, multipart/related и т.д.). */
  parts?: GmailMessagePart[]; /** Для multipart сообщений */
}

/** Тип для полезной нагрузки сообщения Gmail. */
export interface GmailMessagePayload {
  /** @property {string} partId - Идентификатор части сообщения. */
  partId: string;
  /** @property {string} mimeType - MIME-тип. */
  mimeType: string;
  /** @property {string} filename - Имя файла. */
  filename: string;
  /** @property {GmailMessageHeader[]} headers - Заголовки. */
  headers: GmailMessageHeader[];
  /** @property {{ size: number; data?: string }} body - Тело сообщения. */
  body: {
    size: number;
    data?: string; /** Данные в кодировке Base64Url */
  };
  /** @property {GmailMessagePart[]} parts - Части сообщения. */
  parts?: GmailMessagePart[];
}

/** Тип для детальной информации о сообщении Gmail. */
export interface GmailMessageDetail {
  /** @property {string} id - Идентификатор сообщения. */
  id: string;
  /** @property {string} threadId - Идентификатор цепочки. */
  threadId: string;
  /** @property {string} snippet - Краткий фрагмент сообщения. */
  snippet: string;
  /** @property {GmailMessagePayload} payload - Полезная нагрузка сообщения. */
  payload: GmailMessagePayload;
  /** @property {string[]} labelIds - Массив идентификаторов меток. */
  labelIds: string[];
}


/** Типы для работы с аутентификацией */
export interface AuthToken {
  /** @property {string} accessToken - Токен доступа. */
  accessToken: string;
  /** @property {number} expiresAt - Время истечения срока действия токена (в миллисекундах). */
  expiresAt: number;
  /** @property {string} refreshToken - Токен обновления (опционально). */
  refreshToken?: string;
}

/** Типы для хранения данных */
export interface StoredAccount {
  /** @property {string} providerId - Идентификатор провайдера. */
  providerId: string; 
  /** @property {string} email - Email аккаунта. */
  email: string;
  /** @property {number} unreadCount - Общее количество непрочитанных писем в почтовом ящике на момент последнего обновления. Это основное значение для отображения суммарного счетчика на иконке расширения и в общем списке аккаунтов. */
  unreadCount: number; 
  /** @property {number} lastUpdated - Время последнего обновления (в миллисекундах). */
  lastUpdated: number;
  /** @property {AccountHistoryDetails} historyDetails - Опциональные детали истории сообщений, доступные для некоторых провайдеров (например, Gmail). Содержит последний обработанный historyId и список недавних детализированных сообщений. */
  historyDetails?: AccountHistoryDetails; 
}

/** Детали истории для аккаунта */
export interface AccountHistoryDetails {
  /** @property {string} lastHistoryId - Последний известный идентификатор истории, используемый для запроса последующих изменений. */
  lastHistoryId: string; 
  /** @property {GmailMessageDetail[]} messages - Массив детализированных сообщений, полученных из истории. */
  messages: GmailMessageDetail[]; 
}

/** Типы для сообщений между background и popup */
export enum MessageType {
  /** @property {string} REQUEST_UPDATE - Запрос на обновление данных. */
  REQUEST_UPDATE = 'REQUEST_UPDATE',
  /** @property {string} UPDATE_COMPLETE - Обновление данных завершено. */
  UPDATE_COMPLETE = 'UPDATE_COMPLETE',
  /** @property {string} AUTH_REQUEST - Запрос на авторизацию. */
  AUTH_REQUEST = 'AUTH_REQUEST',
  /** @property {string} AUTH_COMPLETE - Авторизация завершена. */
  AUTH_COMPLETE = 'AUTH_COMPLETE',
  /** @property {string} LOGOUT_REQUEST - Запрос на выход из аккаунта. */
  LOGOUT_REQUEST = 'LOGOUT_REQUEST',
  /** @property {string} LOGOUT_COMPLETE - Выход из аккаунта завершен. */
  LOGOUT_COMPLETE = 'LOGOUT_COMPLETE',
  /** @property {string} OPEN_MAIL_REQUEST - Запрос на открытие почтового ящика. */
  OPEN_MAIL_REQUEST = 'OPEN_MAIL_REQUEST',
  /** @property {string} ERROR - Сообщение об ошибке. */
  ERROR = 'ERROR'
}

/** Базовый тип сообщения. */
export interface Message {
  /** @property {MessageType} type - Тип сообщения. */
  type: MessageType;
  /** @property {any} payload - Полезная нагрузка сообщения (опционально). */
  payload?: any;
}

/** Сообщение об успешном обновлении. */
export interface UpdateCompleteMessage extends Message {
  /** @property {MessageType.UPDATE_COMPLETE} type - Тип сообщения. */
  type: MessageType.UPDATE_COMPLETE;
  /** @property {{ accounts: StoredAccount[] }} payload - Полезная нагрузка с обновленными аккаунтами. */
  payload: {
    accounts: StoredAccount[];
  };
}

/** Сообщение об успешной авторизации. */
export interface AuthCompleteMessage extends Message {
  /** @property {MessageType.AUTH_COMPLETE} type - Тип сообщения. */
  type: MessageType.AUTH_COMPLETE;
  /** @property {{ account: StoredAccount }} payload - Полезная нагрузка с авторизованным аккаунтом. */
  payload: {
    account: StoredAccount;
  };
}

/** Сообщение об ошибке. */
export interface ErrorMessage extends Message {
  /** @property {MessageType.ERROR} type - Тип сообщения. */
  type: MessageType.ERROR;
  /** @property {{ message: string; code?: string }} payload - Полезная нагрузка с информацией об ошибке. */
  payload: {
    message: string;
    code?: string;
  };
}

/** Типы для настроек */
export interface Settings {
  /** @property {number} updateInterval - Интервал обновления в минутах. */
  updateInterval: number; /** в минутах */
}

/** Типы для состояния приложения */
export enum ConnectionStatus {
  /** @property {string} CONNECTED - Подключено. */
  CONNECTED = 'CONNECTED',
  /** @property {string} DISCONNECTED - Отключено. */
  DISCONNECTED = 'DISCONNECTED',
  /** @property {string} ERROR - Ошибка подключения. */
  ERROR = 'ERROR'
}

/** Тип для состояния приложения. */
export interface AppState {
  /** @property {StoredAccount[]} accounts - Список аккаунтов. */
  accounts: StoredAccount[];
  /** @property {ConnectionStatus} status - Статус подключения. */
  status: ConnectionStatus;
  /** @property {string} lastError - Последняя ошибка (опционально). */
  lastError?: string;
  /** @property {Settings} settings - Настройки приложения. */
  settings: Settings;
}
