import { EmailProviderFactory } from './email-provider';
import { GmailProvider } from './gmail-provider';
import { YandexProvider } from './yandex-provider';

// Регистрируем провайдеры
EmailProviderFactory.registerProvider(new GmailProvider());
EmailProviderFactory.registerProvider(new YandexProvider());

// Экспортируем фабрику и провайдеры
export * from './email-provider';
export * from './gmail-provider';
export * from './yandex-provider';

// Экспортируем фабрику по умолчанию
export default EmailProviderFactory;
