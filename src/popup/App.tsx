import React, { useEffect, useState } from 'react';
import { AppState, ConnectionStatus, MessageType, StoredAccount } from '../types';

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
  

console.log('🚀 : REDIRECT_URL:', browser.identity.getRedirectURL());

  // Эффект для инициализации и подписки на сообщения
  useEffect(() => {
    // Загрузка данных при монтировании
    loadData();

    // Подписка на сообщения от background script
    browser.runtime.onMessage.addListener(handleMessage);

    // Отписка при размонтировании
    return () => {
      browser.runtime.onMessage.removeListener(handleMessage);
    };
  }, []);

  // Загрузка данных из storage.local
  const loadData = async () => {
    try {
      setLoading(true);
      
      // Получаем аккаунты из storage.local
      const data = await browser.storage.local.get(['accounts', 'settings']);
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
      setError('Ошибка загрузки данных');
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
    switch (message.type) {
      case MessageType.UPDATE_COMPLETE:
        setState({
          ...state,
          accounts: message.payload.accounts,
          status: ConnectionStatus.CONNECTED,
        });
        setError(null);
        break;
        
      case MessageType.AUTH_COMPLETE:
        loadData();
        break;
        
      case MessageType.LOGOUT_COMPLETE:
        loadData();
        break;
        
      case MessageType.ERROR:
        setError(message.payload.message);
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
    browser.runtime.sendMessage({
      type: MessageType.REQUEST_UPDATE,
    });
  };

  // Запрос на авторизацию
  const handleLogin = () => {
    setLoading(true);
    setError(null);
    
    browser.runtime.sendMessage({
      type: MessageType.AUTH_REQUEST,
    });
  };

  // Запрос на выход из аккаунта
  const handleLogout = (email?: string) => {
    setLoading(true);
    setError(null);
    
    browser.runtime.sendMessage({
      type: MessageType.LOGOUT_REQUEST,
      payload: {
        email,
      },
    });
  };

  // Открытие Gmail
  const handleOpenGmail = (email: string) => {
    let url = `https://mail.google.com/mail/u/${email}`;
    browser.tabs.create({ url });
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
          <h1>Gmail Unread Counter</h1>
        </div>
        
        <div className="empty-state">
          <p>Нет подключенных аккаунтов</p>
          <button className="button button-primary" onClick={handleLogin}>
            Подключить аккаунт
          </button>
        </div>
        
        {error && (
          <div className="status status-error">
            {error}
          </div>
        )}
      </div>
    );
  }

  // Рендеринг основного интерфейса
  return (
    <div className="container">
      <div className="header">
        <h1>Gmail Unread Counter</h1>
        <button className="button button-secondary" onClick={requestUpdate}>
          Обновить
        </button>
      </div>
      
      <ul className="account-list">
        {state.accounts.map((account: StoredAccount) => (
          <li 
            key={account.email} 
            className="account-item"
            onClick={() => handleOpenGmail(account.email)}
          >
            <span className="account-email">{account.email}</span>
            <span className="account-unread">{account.unreadCount}</span>
          </li>
        ))}
      </ul>
      
      <div className="actions">
        <button className="button button-primary" onClick={handleLogin}>
          Добавить аккаунт
        </button>
        <button className="button button-danger" onClick={() => handleLogout()}>
          Выйти
        </button>
      </div>
      
      {error && (
        <div className="status status-error">
          {error}
        </div>
      )}
    </div>
  );
};

export default App;
