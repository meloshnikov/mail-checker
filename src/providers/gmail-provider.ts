import { AuthToken, GmailMessageDetail, StoredAccount } from '../types'; // Removed AccountHistoryDetails
import { IHistoryProvider } from './email-provider';
import { OAuthImplicitFlowProvider } from './oauth-implicit-provider';
import { GMAIL_CONFIG } from './provider-configs';

// Ключ для хранения последнего historyId в storage.local (специфично для Gmail)
const GMAIL_LAST_HISTORY_ID_STORAGE_KEY = 'gmail_last_history_id';

/**
 * Провайдер для работы с Gmail
 */
export class GmailProvider extends OAuthImplicitFlowProvider implements IHistoryProvider {
  constructor() {
    super(GMAIL_CONFIG);
  }
  
  /**
   * Получение информации о пользователе (только email, как требует EmailProvider)
   * Внутренне может также получать initialHistoryId, но не сохраняет его здесь.
   */
  async getUserProfile(): Promise<{ email: string; initialHistoryId?: string }> {
    const accessToken = await super.getAccessToken(); // Используем super.getAccessToken() для получения токена из базового класса
    
    const response = await fetch(`${this.config.apiUrl}/users/me/profile?fields=emailAddress,historyId`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      console.error(`[${this.config.id}] Failed to get user profile:`, response.status, response.statusText);
      throw new Error(`Failed to get user profile: ${response.status} ${response.statusText}`);
    }

    const profile = await response.json();
    // Не сохраняем lastHistoryId здесь. Это будет сделано в updateUnreadCount/fetchStoredAccountData (или будущем fetchStoredAccountData)
    console.log(`[${this.config.id}] User profile fetched:`, { email: profile.emailAddress, historyId: profile.historyId });
    return { email: profile.emailAddress, initialHistoryId: profile.historyId?.toString() };
  }

  /**
   * Получение истории изменений (новых непрочитанных писем)
   */
  async getHistory(startHistoryId?: string): Promise<{ historyId: string; messages: GmailMessageDetail[] }> {
    const accessToken = await super.getAccessToken();
    // Используем this.config.apiUrl из конфигурации провайдера
    const url = new URL(`${this.config.apiUrl}/users/me/history`);
    url.searchParams.append('labelId', 'UNREAD');
    if (startHistoryId) {
      url.searchParams.append('startHistoryId', startHistoryId);
    }
    url.searchParams.append('maxResults', '100'); // Или другое значение по умолчанию, например, 10 или 20, если получаем много деталей
    url.searchParams.append('fields', 'history(messagesAdded),historyId,nextPageToken'); 
    // Убраны labelsAdded, labelsRemoved, messagesDeleted для упрощения, т.к. они не использовались для формирования unreadMessages

    console.log(`[${this.config.id}] Getting history with startHistoryId: ${startHistoryId}`);
    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      console.error(`[${this.config.id}] Failed to get history:`, response.status, response.statusText);
      throw new Error(`Failed to get history: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`[${this.config.id}] History data received:`, data);

    // Фильтруем только идентификаторы сообщений, которые были добавлены (messagesAdded).
    // Записи истории Gmail API v1 для messagesAdded уже содержат ресурс сообщения, если historyRecordTypes=messageAdded не указан.
    // Однако предыдущий код запрашивал полные детали для каждого сообщения.
    // Для согласованности с предыдущей логикой, предположим, что сообщения в истории — это просто ID, и для них требуется полная загрузка.
    const addedMessageIds = data.history
      ? data.history.flatMap((item: any) => (item.messagesAdded || []).map((added: any) => added.message.id))
      : [];
    
    console.log(`[${this.config.id}] Found ${addedMessageIds.length} added message IDs in history.`);

    const detailedMessages: GmailMessageDetail[] = [];
    // Ограничим количество запрашиваемых деталей, чтобы избежать слишком многих запросов API.
    const MAX_DETAILED_MESSAGES_TO_FETCH = 10; 
    for (const messageId of addedMessageIds.slice(0, MAX_DETAILED_MESSAGES_TO_FETCH)) {
        try {
            const messageDetails = await this.getMessage(messageId);
            detailedMessages.push(messageDetails);
        } catch (error) {
            console.error(`[${this.config.id}] Error fetching details for message ${messageId}:`, error);
            // Продолжаем обработку, даже если одно сообщение не удалось загрузить.
        }
    }
    
    console.log(`[${this.config.id}] Fetched details for ${detailedMessages.length} messages.`);

    return {
      historyId: data.historyId,
      messages: detailedMessages, // Возвращаем массив детализированных сообщений.
    };
  }

  /**
   * Получение полного сообщения по ID
   */
  async getMessage(messageId: string): Promise<GmailMessageDetail> {
    const accessToken = await super.getAccessToken();
    // Используем this.config.apiUrl из конфигурации провайдера
    const url = `${this.config.apiUrl}/users/me/messages/${messageId}?fields=id,threadId,snippet,payload(headers,parts,partId,mimeType,filename,body),labelIds`;
    
    console.log(`[${this.config.id}] Getting message details for ID: ${messageId}`);
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      console.error(`[${this.config.id}] Failed to get message ${messageId}:`, response.status, response.statusText);
      throw new Error(`Failed to get message ${messageId}: ${response.status} ${response.statusText}`);
    }
    const messageData = await response.json();
    console.log(`[${this.config.id}] Message details received for ID ${messageId}:`, messageData);
    return messageData as GmailMessageDetail;
  }

  /**
   * Сохранение последнего historyId
   */
  async saveLastHistoryId(historyId: string): Promise<void> {
    console.log(`[${this.config.id}] Saving last history ID: ${historyId} to key: ${GMAIL_LAST_HISTORY_ID_STORAGE_KEY}`);
    await browser.storage.local.set({ [GMAIL_LAST_HISTORY_ID_STORAGE_KEY]: historyId });
  }

  /**
   * Получение последнего сохраненного historyId
   */
  async getLastHistoryId(): Promise<string | undefined> {
    console.log(`[${this.config.id}] Getting last history ID from key: ${GMAIL_LAST_HISTORY_ID_STORAGE_KEY}`);
    const data = await browser.storage.local.get(GMAIL_LAST_HISTORY_ID_STORAGE_KEY);
    const historyId = data[GMAIL_LAST_HISTORY_ID_STORAGE_KEY];
    console.log(`[${this.config.id}] Retrieved last history ID: ${historyId}`);
    return historyId;
  }

  /**
   * Получение общего количества непрочитанных писем
   */
  async getUnreadCount(): Promise<number> {
    try {
      console.log(`[${this.config.id}] Getting total unread count`);
      const accessToken = await super.getAccessToken(); // Используем super.getAccessToken() для получения токена
      // Используем this.config.apiUrl из конфигурации провайдера
      const response = await fetch(`${this.config.apiUrl}/users/me/labels/UNREAD?fields=messagesUnread`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        console.error(`[${this.config.id}] Failed to get unread count label info:`, response.status, response.statusText);
        throw new Error(`Failed to get unread count: ${response.status} ${response.statusText}`);
      }

      const labelInfo = await response.json();
      console.log(`[${this.config.id}] Unread label info:`, labelInfo);
      return labelInfo.messagesUnread || 0;
    } catch (error) {
      console.error(`[${this.config.id}] Error getting total unread count:`, error);
      return 0; // Возвращаем 0 в случае ошибки, как и в предыдущей реализации.
    }
  }

  /**
   * Переопределение метода fetchStoredAccountData из BaseEmailProvider для формирования StoredAccount,
   * включая специфичные для Gmail детали истории.
   */
  async fetchStoredAccountData(): Promise<StoredAccount> {
    try {
      console.log(`[${this.config.id}] Starting overridden fetchStoredAccountData for Gmail`);

      // 1. Получаем профиль пользователя (email и, возможно, начальный historyId).
      const userProfile = await this.getUserProfile();
      console.log(`[${this.config.id}] User profile received:`, userProfile);

      // 2. Получаем общее количество непрочитанных писем.
      const totalUnreadMessages = await this.getUnreadCount();
      console.log(`[${this.config.id}] Total unread messages:`, totalUnreadMessages);

      // 3. Получаем текущий сохраненный historyId из локального хранилища.
      const currentLastHistoryId = await this.getLastHistoryId();
      console.log(`[${this.config.id}] Current last history ID from storage:`, currentLastHistoryId);
      
      // Определяем startHistoryId для getHistory.
      // Если currentLastHistoryId отсутствует, можно использовать initialHistoryId из профиля.
      // Gmail API /history требует startHistoryId. Если его нет, getUserProfile возвращает initialHistoryId.
      // Если currentLastHistoryId пуст, это может быть первая синхронизация.
      // Для Gmail, если нет currentLastHistoryId, используем тот, что пришел с профилем.
      const historyStartId = currentLastHistoryId || userProfile.initialHistoryId;

      // 4. Получаем историю сообщений (новые сообщения и новый historyId).
      // Инициализируем historyResult значениями по умолчанию.
      let historyResult: { historyId: string; messages: GmailMessageDetail[] } = { 
        historyId: currentLastHistoryId || userProfile.initialHistoryId || "", 
        messages: [] 
      };

      if (historyStartId) { // Запрашиваем историю только если есть с чего начать.
         historyResult = await this.getHistory(historyStartId);
         console.log(`[${this.config.id}] History result:`, historyResult);

         // 5. Сохраняем новый historyId, если он изменился.
         if (historyResult.historyId && historyResult.historyId !== currentLastHistoryId) {
           await this.saveLastHistoryId(historyResult.historyId);
           console.log(`[${this.config.id}] Saved new history ID: ${historyResult.historyId}`);
         }
      } else {
        console.warn(`[${this.config.id}] No startHistoryId available (currentLastHistoryId or initialHistoryId). Skipping getHistory.`);
        // Если historyId отсутствует, historyDetails.lastHistoryId должен оставаться актуальным (т.е. undefined или старым),
        // а messages будет пустым массивом.
        historyResult.historyId = currentLastHistoryId || ""; // Устанавливаем в текущий сохраненный ID или пустую строку.
      }

      // 6. Формируем объект StoredAccount.
      const account: StoredAccount = {
        providerId: this.config.id,
        email: userProfile.email,
        unreadCount: totalUnreadMessages,
        lastUpdated: Date.now(),
        messages: historyResult.messages, // Сообщения теперь на верхнем уровне
        providerState: { // providerState содержит специфичные для провайдера данные
          lastHistoryId: historyResult.historyId // lastHistoryId теперь здесь
        }
      };
      console.log(`[${this.config.id}] Account object created for Gmail:`, account);
      
      return account;
    } catch (error) {
      console.error(`[${this.config.id}] Error in overridden fetchStoredAccountData for Gmail:`, error);
      // В случае ошибки, необходимо вернуть StoredAccount с информацией об ошибке или пробросить ошибку дальше.
      // Для соответствия сигнатуре метода, если необходимо что-то вернуть, это должен быть объект StoredAccount.
      // Однако, предпочтительнее пробросить ошибку, чтобы вызывающий код мог ее корректно обработать.
      throw error; 
    }
  }
}
