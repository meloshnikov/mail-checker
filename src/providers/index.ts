/** 
 * Главный файл модуля провайдеров.
 * Этот файл является центральной точкой для импорта, регистрации и экспорта всех провайдеров электронной почты.
 * Новые провайдеры должны быть импортированы и зарегистрированы здесь в EmailProviderFactory.
 */

import { EmailProviderFactory } from './email-provider';
import { GmailProvider } from './gmail-provider';
import { YandexProvider } from './yandex-provider';

/** Регистрируем провайдеры */
EmailProviderFactory.registerProvider(new GmailProvider());
EmailProviderFactory.registerProvider(new YandexProvider());

/** Экспортируем фабрику и провайдеры */
export * from './email-provider';
export * from './gmail-provider';
export * from './yandex-provider';

/** Экспортируем фабрику по умолчанию */
export default EmailProviderFactory;
