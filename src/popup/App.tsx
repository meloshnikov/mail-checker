import React, { useEffect, useState } from 'react';
import { AppState, ConnectionStatus, MessageType, StoredAccount, GmailMessageDetail, GmailMessageHeader } from '../types';

// Начальное состояние приложения
const initialState: AppState = {
  accounts: [],
  status: ConnectionStatus.DISCONNECTED,
  settings: {
    updateInterval: 5,
  },
};

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(initialState);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const [viewingMessagesFor, setViewingMessagesFor] = useState<string | null>(null); // Email аккаунта, для которого просматриваются сообщения

  // Эффект для инициализации и подписки на сообщения
  useEffect(() => {
    console.log('App component mounted');
    
    // Загрузка данных при монтировании
    loadData();

    // Подписка на сообщения от background script
    browser.runtime.onMessage.addListener(handleMessage);

    // Отписка при размонтировании
    return () => {
      console.log('App component unmounted');
      browser.runtime.onMessage.removeListener(handleMessage);
    };
  }, []);

  // Загрузка данных из storage.local
  const loadData = async () => {
    try {
      console.log('Loading data from storage');
      setLoading(true);
      
      // Получаем аккаунты из storage.local
      const data = await browser.storage.local.get(['accounts', 'settings']);
      console.log('Data loaded from storage:', data);
      
      const accounts = data.accounts || [];
      const settings = data.settings || initialState.settings;
      
      setState({
        accounts,
        status: accounts.length > 0 ? ConnectionStatus.CONNECTED : ConnectionStatus.DISCONNECTED,
        settings,
      });
      
      // Запрашиваем обновление данных
      requestUpdate();
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Ошибка загрузки данных: ' + (err instanceof Error ? err.message : String(err)));
      setDebugInfo(JSON.stringify(err, null, 2));
      setState({
        ...state,
        status: ConnectionStatus.ERROR,
      });
    } finally {
      setLoading(false);
    }
  };

  // Обработчик сообщений от background script
  const handleMessage = (message: any) => {
    console.log('Message received:', message);
    
    switch (message.type) {
      case MessageType.UPDATE_COMPLETE:
        console.log('Update complete, accounts:', message.payload.accounts);
        setState({
          ...state,
          accounts: message.payload.accounts,
          status: ConnectionStatus.CONNECTED,
        });
        setError(null);
        break;
        
      case MessageType.AUTH_COMPLETE:
        console.log('Auth complete, payload:', message.payload);
        if (message.payload && message.payload.account) {
          console.log('Account received in AUTH_COMPLETE:', message.payload.account);
          // Обновляем состояние напрямую с полученным аккаунтом
          setState({
            ...state,
            accounts: [message.payload.account],
            status: ConnectionStatus.CONNECTED,
          });
          setLoading(false);
          setError(null);
        } else {
          console.log('No account in AUTH_COMPLETE, loading data from storage');
          loadData();
        }
        break;
        
      case MessageType.LOGOUT_COMPLETE:
        console.log('Logout complete');
        loadData();
        break;
        
      case MessageType.ERROR:
        console.error('Error message received:', message.payload.message);
        setError(message.payload.message);
        setDebugInfo(JSON.stringify(message.payload, null, 2));
        setState({
          ...state,
          status: ConnectionStatus.ERROR,
        });
        break;
    }
    
    return true;
  };

  // Запрос на обновление данных
  const requestUpdate = () => {
    console.log('Requesting update');
    browser.runtime.sendMessage({
      type: MessageType.REQUEST_UPDATE,
    });
  };

  // Запрос на авторизацию
  const handleLogin = (providerId: string = 'gmail') => {
    console.log('Login requested for provider:', providerId);
    setLoading(true);
    setError(null);
    
    browser.runtime.sendMessage({
      type: MessageType.AUTH_REQUEST,
      payload: {
        providerId
      }
    });
  };

  // Запрос на выход из аккаунта
  const handleLogout = (email?: string) => {
    console.log('Logout requested for email:', email);
    setLoading(true);
    setError(null);
    
    browser.runtime.sendMessage({
      type: MessageType.LOGOUT_REQUEST,
      payload: {
        email,
      },
    });
  };

  // Открытие почтового ящика
  const handleOpenMail = (email: string) => {
    console.log('Opening mail for email:', email);
    
    browser.runtime.sendMessage({
      type: MessageType.OPEN_MAIL_REQUEST,
      payload: {
        email,
      },
    });
  };

  // Отображение отладочной информации
  const toggleDebugInfo = () => {
    if (!debugInfo) {
      // Собираем отладочную информацию
      const info = {
        state,
        redirectURL: browser.identity.getRedirectURL(),
        browser: navigator.userAgent,
        timestamp: new Date().toISOString(),
      };
      setDebugInfo(JSON.stringify(info, null, 2));
    } else {
      setDebugInfo(null);
    }
  };

  // Рендеринг загрузки
  if (loading) {
    return (
      <div className="container">
        <div className="loading">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  // Рендеринг состояния без аккаунтов
  if (state.accounts.length === 0) {
    return (
      <div className="container">
        <div className="header">
          <h1>Email checker</h1>
        </div>
        
        <div className="empty-state">
          <p>Нет подключенных аккаунтов</p>
          <div className="provider-buttons">
            <button className="button button-primary" onClick={() => handleLogin('gmail')}>
              Подключить Gmail
            </button>
            <button className="button button-primary" onClick={() => handleLogin('yandex')}>
              Подключить Yandex
            </button>
          </div>
        </div>
        
        {error && (
          <div className="status status-error">
            {error}
            <button 
              className="button button-secondary" 
              style={{ marginLeft: '8px', padding: '2px 4px', fontSize: '10px' }}
              onClick={toggleDebugInfo}
            >
              {debugInfo ? 'Скрыть отладку' : 'Показать отладку'}
            </button>
          </div>
        )}
        
        {debugInfo && (
          <div className="status status-info" style={{ whiteSpace: 'pre-wrap', fontSize: '10px' }}>
            {debugInfo}
          </div>
        )}
      </div>
    );
  }

  // Рендеринг основного интерфейса
  return (
    <div className="container">
      <div className="header">
        <h1>Email checker</h1>
        <button className="button button-secondary" onClick={requestUpdate}>
          Обновить
        </button>
      </div>

      <ul className="account-list">
        {state.accounts.map((account: StoredAccount) => (
          <li
            key={account.email}
            className={`account-item ${viewingMessagesFor === account.email ? 'active' : ''}`}
            onClick={() => {
              if (account.providerId === 'gmail' && 
                  account.historyDetails && 
                  account.historyDetails.messages && 
                  account.historyDetails.messages.length > 0) {
                // Для Gmail с непрочитанными сообщениями, переключаем просмотр сообщений
                setViewingMessagesFor(viewingMessagesFor === account.email ? null : account.email);
              } else {
                // Для других аккаунтов или Gmail без непрочитанных, открываем почту
                handleOpenMail(account.email);
              }
            }}
          >
            <div className="account-summary">
              <span className="account-email">{account.email}</span>
              <span className="account-unread">{account.unreadCount}</span>
            </div>

            {/* Список непрочитанных сообщений для Gmail */}
            {account.providerId === 'gmail' && 
             viewingMessagesFor === account.email && 
             account.historyDetails && 
             account.historyDetails.messages && 
             account.historyDetails.messages.length > 0 && (
              <ul className="message-list">
                {account.historyDetails.messages.map((message: GmailMessageDetail) => { 
                  // Извлекаем отправителя и тему из заголовков
                  const fromHeader = message.payload.headers.find((header: GmailMessageHeader) => header.name === 'From');
                  const subjectHeader = message.payload.headers.find((header: GmailMessageHeader) => header.name === 'Subject');

                  const sender = fromHeader ? fromHeader.value : 'Неизвестный отправитель';
                  const subject = subjectHeader ? subjectHeader.value : 'Без темы';

                  return (
                    <li key={message.id} className="message-item">
                      <div className="message-header">
                        <span className="message-sender">{sender}</span>
                        <span className="message-subject">{subject}</span>
                      </div>
                      <div className="message-snippet">{message.snippet}</div>
                    </li>
                  );
                })}
              </ul>
            )}
          </li>
        ))}
      </ul>

      <div className="actions">
        <div className="provider-buttons">
          <button className="button button-primary" onClick={() => handleLogin('gmail')}>
            Добавить Gmail
          </button>
          <button className="button button-primary" onClick={() => handleLogin('yandex')}>
            Добавить Yandex
          </button>
        </div>
        <button className="button button-danger" onClick={() => handleLogout()}>
          Выйти
        </button>
      </div>

      {error && (
        <div className="status status-error">
          {error}
          <button
            className="button button-secondary"
            style={{ marginLeft: '8px', padding: '2px 4px', fontSize: '10px' }}
            onClick={toggleDebugInfo}
          >
            {debugInfo ? 'Скрыть отладку' : 'Показать отладку'}
          </button>
        </div>
      )}

      {debugInfo && (
        <div className="status status-info" style={{ whiteSpace: 'pre-wrap', fontSize: '10px' }}>
          {debugInfo}
        </div>
      )}
    </div>
  );
};

export default App;
