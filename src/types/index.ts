// Типы для работы с Gmail API
export interface GmailMessage {
  id: string;
  threadId: string;
  labelIds: string[];
}

export interface GmailListMessagesResponse {
  messages?: GmailMessage[];
  nextPageToken?: string;
  resultSizeEstimate: number;
}

// Типы для детальной информации о сообщении
export interface GmailMessageHeader {
  name: string;
  value: string;
}

export interface GmailMessagePart {
  partId: string;
  mimeType: string;
  filename: string;
  headers: GmailMessageHeader[];
  body: {
    size: number;
    data?: string; // Base64Url encoded data
  };
  parts?: GmailMessagePart[]; // Для multipart сообщений
}

export interface GmailMessagePayload {
  partId: string;
  mimeType: string;
  filename: string;
  headers: GmailMessageHeader[];
  body: {
    size: number;
    data?: string; // Base64Url encoded data
  };
  parts?: GmailMessagePart[];
}

export interface GmailMessageDetail {
  id: string;
  threadId: string;
  snippet: string;
  payload: GmailMessagePayload;
  labelIds: string[];
}


// Типы для работы с аутентификацией
export interface AuthToken {
  accessToken: string;
  expiresAt: number;
  refreshToken?: string;
}

// Типы для хранения данных
export interface StoredAccount {
  providerId: string; // Идентификатор провайдера
  email: string;
  unreadCount: number; // Общее количество непрочитанных писем в почтовом ящике на момент последнего обновления. Это основное значение для отображения суммарного счетчика на иконке расширения и в общем списке аккаунтов.
  lastUpdated: number;
  historyDetails?: AccountHistoryDetails; // Опциональные детали истории сообщений, доступные для некоторых провайдеров (например, Gmail). Содержит последний обработанный historyId и список недавних детализированных сообщений.
}

// Детали истории для аккаунта
export interface AccountHistoryDetails {
  lastHistoryId: string; // Последний известный идентификатор истории, используемый для запроса последующих изменений.
  messages: GmailMessageDetail[]; // Массив детализированных сообщений, полученных из истории.
}

// Типы для сообщений между background и popup
export enum MessageType {
  REQUEST_UPDATE = 'REQUEST_UPDATE',
  UPDATE_COMPLETE = 'UPDATE_COMPLETE',
  AUTH_REQUEST = 'AUTH_REQUEST',
  AUTH_COMPLETE = 'AUTH_COMPLETE',
  LOGOUT_REQUEST = 'LOGOUT_REQUEST',
  LOGOUT_COMPLETE = 'LOGOUT_COMPLETE',
  OPEN_MAIL_REQUEST = 'OPEN_MAIL_REQUEST',
  ERROR = 'ERROR'
}

export interface Message {
  type: MessageType;
  payload?: any;
}

export interface UpdateCompleteMessage extends Message {
  type: MessageType.UPDATE_COMPLETE;
  payload: {
    accounts: StoredAccount[];
  };
}

export interface AuthCompleteMessage extends Message {
  type: MessageType.AUTH_COMPLETE;
  payload: {
    account: StoredAccount;
  };
}

export interface ErrorMessage extends Message {
  type: MessageType.ERROR;
  payload: {
    message: string;
    code?: string;
  };
}

// Типы для настроек
export interface Settings {
  updateInterval: number; // в минутах
}

// Типы для состояния приложения
export enum ConnectionStatus {
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED',
  ERROR = 'ERROR'
}

export interface AppState {
  accounts: StoredAccount[];
  status: ConnectionStatus;
  lastError?: string;
  settings: Settings;
}
