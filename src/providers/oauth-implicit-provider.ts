// Реализация OAuth 2.0 Implicit Grant Flow для провайдеров
// Абстрактный класс для провайдеров, использующих OAuth 2.0 Implicit Grant Flow
import { AuthToken } from '../types';
import { BaseEmailProvider } from './email-provider';
import { ProviderConfig } from './provider-configs';

export abstract class OAuthImplicitFlowProvider extends BaseEmailProvider {
  protected readonly config: ProviderConfig;

  constructor(config: ProviderConfig) {
    super(); // Предполагается, что конструктор BaseEmailProvider не принимает параметров. Измените, если это не так.
    this.config = config;
  }

  // Реализация абстрактных свойств из BaseEmailProvider
  get id(): string { return this.config.id; }
  get name(): string { return this.config.name; }
  get iconUrl(): string { return this.config.iconUrl; }
  get mailUrl(): string { return this.config.mailUrl; }

  private getAuthUrl(): string {
    const redirectUri = browser.identity.getRedirectURL();
    const url = new URL(this.config.authUrl);
    url.searchParams.append('client_id', this.config.clientId);
    url.searchParams.append('response_type', 'token');
    url.searchParams.append('redirect_uri', redirectUri);
    url.searchParams.append('scope', this.config.scopes.join(' '));

    // Добавляем кастомные параметры авторизации, если они определены в конфигурации
    if (this.config.customAuthParams) {
      for (const [key, value] of Object.entries(this.config.customAuthParams)) {
        url.searchParams.append(key, value);
      }
    }
    
    // Предыдущие комментарии о специфичных для Gmail/Yandex параметрах здесь больше не актуальны,
    // так как эта логика теперь управляется через customAuthParams в конфигурации.

    console.log(`[${this.config.id}] Generated auth URL:`, url.toString());
    console.log(`[${this.config.id}] Redirect URI:`, redirectUri);
    return url.toString();
  }

  async authorize(): Promise<AuthToken> {
    try {
      console.log(`[${this.config.id}] Starting authorization (Implicit Flow)`);
      const authUrl = this.getAuthUrl();
      
      const redirectUrlString = await browser.identity.launchWebAuthFlow({
        url: authUrl,
        interactive: true,
      });
      
      console.log(`[${this.config.id}] Received redirect URL:`, redirectUrlString);
      
      const hashParams = new URLSearchParams(
        redirectUrlString.substring(redirectUrlString.indexOf('#') + 1)
      );
      
      const accessToken = hashParams.get('access_token');
      const expiresIn = hashParams.get('expires_in');
      // const tokenType = hashParams.get('token_type'); // Обычно 'bearer', может не понадобиться
      const error = hashParams.get('error');

      if (error) {
        console.error(`[${this.config.id}] Authorization error in redirect:`, error);
        throw new Error(`Authorization failed: ${error}`);
      }

      if (!accessToken) {
        console.error(`[${this.config.id}] No access token received`);
        throw new Error('Authorization failed: No access token received');
      }

      const token: AuthToken = {
        accessToken,
        expiresAt: Date.now() + (parseInt(expiresIn || '3600', 10) * 1000),
        // refreshToken обычно недоступен в implicit flow
      };
      
      await this.saveToken(token);
      console.log(`[${this.config.id}] Token saved successfully`);
      return token;
    } catch (err) {
      console.error(`[${this.config.id}] Authorization error:`, err);
      throw err; // Повторно выбрасываем ошибку для обработки вызывающим кодом
    }
  }

  async getAccessToken(): Promise<string> {
    try {
      const token = await this.getToken();
      if (!token) {
        console.log(`[${this.config.id}] No token found, initiating authorization.`);
        const newToken = await this.authorize();
        return newToken.accessToken;
      }

      // Добавляем небольшой буфер (например, 60 секунд) к проверке срока действия
      if (token.expiresAt <= Date.now() + 60000) { 
        console.log(`[${this.config.id}] Token expired or about to expire, re-authorizing.`);
        const newToken = await this.authorize();
        return newToken.accessToken;
      }
      
      console.log(`[${this.config.id}] Using existing valid token.`);
      return token.accessToken;
    } catch (error) {
      console.error(`[${this.config.id}] Error in getAccessToken:`, error);
      throw error;
    }
  }

  async isAuthorized(): Promise<boolean> {
    try {
      const token = await this.getToken();
      const isValid = !!token && token.expiresAt > Date.now();
      console.log(`[${this.config.id}] Authorization status:`, isValid);
      return isValid;
    } catch (error) {
      console.error(`[${this.config.id}] Error checking authorization:`, error);
      return false; // По умолчанию не авторизован при ошибке
    }
  }

  async logout(): Promise<void> {
    console.log(`[${this.config.id}] Logging out`);
    await this.removeToken();
    // Дополнительно, для некоторых провайдеров, вы можете отозвать токен через API вызов
    // или перенаправить пользователя на URL выхода. Для implicit flow, удаление сохраненного токена
    // часто является основным действием на стороне клиента.
  }

  protected async saveToken(token: AuthToken): Promise<void> {
    console.log(`[${this.config.id}] Saving token to storage key:`, this.config.tokenStorageKey);
    await browser.storage.local.set({ [this.config.tokenStorageKey]: token });
  }

  protected async getToken(): Promise<AuthToken | null> {
    console.log(`[${this.config.id}] Getting token from storage key:`, this.config.tokenStorageKey);
    const data = await browser.storage.local.get(this.config.tokenStorageKey);
    return (data[this.config.tokenStorageKey] as AuthToken) || null;
  }

  protected async removeToken(): Promise<void> {
    console.log(`[${this.config.id}] Removing token from storage key:`, this.config.tokenStorageKey);
    await browser.storage.local.remove(this.config.tokenStorageKey);
  }

  // Абстрактные методы getUserProfile и getUnreadCount наследуются от BaseEmailProvider
  // и должны быть реализованы конкретными подклассами OAuthImplicitFlowProvider.
  // Метод getUserProfile() наследуется от BaseEmailProvider и должен быть реализован конкретным подклассом.
  // Метод getUnreadCount() наследуется от BaseEmailProvider и должен быть реализован конкретным подклассом.
}
