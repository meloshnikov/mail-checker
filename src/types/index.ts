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

// Типы для работы с аутентификацией
export interface AuthToken {
  accessToken: string;
  expiresAt: number;
  refreshToken?: string;
}

// Типы для хранения данных
export interface StoredAccount {
  email: string;
  unreadCount: number;
  lastUpdated: number;
}

// Типы для сообщений между background и popup
export enum MessageType {
  REQUEST_UPDATE = 'REQUEST_UPDATE',
  UPDATE_COMPLETE = 'UPDATE_COMPLETE',
  AUTH_REQUEST = 'AUTH_REQUEST',
  AUTH_COMPLETE = 'AUTH_COMPLETE',
  LOGOUT_REQUEST = 'LOGOUT_REQUEST',
  LOGOUT_COMPLETE = 'LOGOUT_COMPLETE',
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
