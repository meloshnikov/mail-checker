# Gmail Unread Counter для Firefox

Расширение для Firefox, которое отображает количество непрочитанных писем в почтовом ящике Gmail.

## Функциональность

- Отображение количества непрочитанных писем в значке расширения
- Авторизация через Google OAuth 2.0
- Автоматическое обновление данных (по умолчанию каждые 5 минут)
- Поддержка нескольких аккаунтов Gmail
- Быстрый переход к почтовому ящику
- Адаптация под светлую и темную темы Firefox

## Технический стек

- TypeScript
- React
- WebExtensions API
- Gmail API
- OAuth 2.0

## Структура проекта

```
src/
├── background/      # Фоновые скрипты
│   ├── auth.ts      # Аутентификация через OAuth 2.0
│   ├── gmail-api.ts # Работа с Gmail API
│   └── index.ts     # Основной фоновый скрипт
├── popup/           # UI всплывающего окна
│   ├── App.tsx      # Основной компонент React
│   ├── index.html   # HTML-шаблон
│   ├── index.tsx    # Точка входа React
│   └── styles.css   # Стили
├── assets/          # Иконки, стили
├── manifest.json    # Конфигурация расширения
└── types/           # Типы TypeScript
    └── index.ts     # Общие типы
```

## Установка и разработка

### Предварительные требования

- Node.js (версия 14 или выше)
- npm (версия 6 или выше)
- Firefox Developer Edition или Firefox Nightly

### Установка зависимостей

```bash
npm install
```

### Сборка расширения

```bash
npm run build
```

### Запуск в режиме разработки

```bash
npm run watch   # Запуск webpack в режиме отслеживания изменений
npm run start   # Запуск расширения в Firefox
```

### Упаковка расширения

```bash
npm run package
```

## Настройка OAuth 2.0

Для работы с Gmail API необходимо создать проект в Google Cloud Platform и настроить OAuth 2.0:

1. Перейдите в [Google Cloud Console](https://console.cloud.google.com/)
2. Создайте новый проект
3. Включите Gmail API для проекта
4. Создайте учетные данные OAuth 2.0
5. Добавьте URL перенаправления из расширения (используйте `browser.identity.getRedirectURL()`)
6. Замените `CLIENT_ID` в файле `src/background/auth.ts` на полученный идентификатор

## Лицензия

MIT
