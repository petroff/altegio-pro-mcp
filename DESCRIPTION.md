# Altegio.Pro MCP Server - Рабочие Инструкции

> **КРИТИЧЕСКИ ВАЖНО:** Этот документ содержит все ключевые инструкции для работы с проектом. ОБЯЗАТЕЛЬНО читать перед началом любой задачи.

## 🔴 КРИТИЧЕСКИЕ ПРАВИЛА (Читать ПЕРВЫМ!)

### Перед началом ЛЮБОЙ задачи:

1. **ОБЯЗАТЕЛЬНО обновить OpenAPI спецификацию:**
   ```bash
   git -C api.docs pull origin master
   ```

2. **Проверить OpenAPI spec:**
   - Файл: `api.docs/docs/altegio/en/openapi.yml`
   - Проверить наличие нужных endpoints
   - Убедиться в правильности параметров

3. **НИКОГДА не модифицировать `api.docs/`:**
   - Это read-only submodule
   - Управляется в отдельном GitLab репозитории
   - Все изменения делаются в источнике: `git@gitlab.altegio.dev:altegio/biz.erp.api.docs.git`
   - Локальные изменения будут потеряны при следующем pull

4. **Прочитать Product Logic:**
   - `docs/Altegio API and Product Logic Documentation.md`
   - Понимать архитектуру: Chains → Companies → Entities
   - Знать акторов: Users, Employees, Clients

## 📋 Архитектура проекта

### Иерархия Altegio:
1. **Chain** (Location Chain) - бренд/франшиза, объединяет компании
2. **Location/Company** - отдельное заведение (салон, клиника)
3. **Entities** - конкретные объекты (Service, Staff, Client, etc.)

### Типы акторов:
- **Users** - администраторы/менеджеры (вход в систему, роли, права)
- **Employees** - специалисты/сотрудники (расписание, услуги, зарплата)
- **Clients** - клиенты (профили, история, лояльность)
- **Online Booking Users** - клиенты с аккаунтом для самостоятельного бронирования

### Принципы архитектуры:
- **Context Awareness:** Все операции должны понимать контекст (Chain vs Company)
- **Visit как центральный объект:** Для операций в филиале Visit - orchestrator (услуги, оплата, инвентарь)
- **Транзакционность:** Бронирование = Check → Create (двухфазная транзакция)
- **Двойная бухгалтерия:** Финансовые и товарные транзакции создаются параллельно

## 🛠️ Структура проекта

```
src/
  config/        # Конфигурация и валидация (Zod)
  providers/     # API клиенты (altegio-client.ts)
  tools/         # Обработчики инструментов MCP
  types/         # TypeScript интерфейсы
  utils/         # Логирование, ошибки, хелперы
  index.ts       # Точка входа stdio
  http-server.ts # HTTP сервер
  server.ts      # Общая настройка MCP сервера

api.docs/        # OpenAPI спецификация (READ-ONLY!)
docs/            # Документация и планы
dist/            # Скомпилированный JS (gitignored)
```

## 🔐 Аутентификация

### Типы токенов:
- **Partner Token** (`ALTEGIO_API_TOKEN`) - обязателен, из developer.alteg.io
- **User Token** - получается через `altegio_login`, сохраняется в `~/.altegio-mcp/credentials.json`

### Правила:
- Все write-операции требуют `user_token`
- `altegio_login` - первый шаг для административных операций
- Credentials сохраняются локально в `~/.altegio-mcp/`

## 📦 Доступные инструменты (26 total)

### Аутентификация (2):
- `altegio_login` - вход с email/password
- `altegio_logout` - выход и очистка credentials

### Чтение данных (6):
- `list_companies` - список компаний (my=1 требует auth)
- `get_bookings` - бронирования
- `get_staff` - сотрудники (B2B, требует auth)
- `get_services` - услуги (B2B, требует auth)
- `get_service_categories` - категории услуг
- `get_schedule` - расписание сотрудников

### CRUD операции (8):
- `create_staff` / `update_staff` / `delete_staff`
- `create_service` / `update_service` (DELETE недоступен в API)
- `create_booking` / `update_booking` / `delete_booking`

### Онбординг визард (10):
- `onboarding_start` - инициализация сессии
- `onboarding_resume` - возобновление после ошибки
- `onboarding_status` - статус прогресса
- `onboarding_add_categories` - создание категорий
- `onboarding_add_staff_batch` - массовый импорт сотрудников (CSV/JSON)
- `onboarding_add_services_batch` - массовый импорт услуг (CSV/JSON)
- `onboarding_import_clients` - импорт клиентов (CSV)
- `onboarding_create_test_bookings` - генерация тестовых бронирований
- `onboarding_preview_data` - предпросмотр данных перед импортом
- `onboarding_rollback_phase` - откат фазы онбординга

## 🧪 Стандарты разработки

### TDD подход:
1. Написать failing test
2. Реализовать минимальный код
3. Убедиться что тест проходит
4. Рефакторинг
5. Коммит

### TypeScript:
- Strict mode включен
- Типизировать все параметры и возвращаемые значения
- Избегать `any`, использовать `unknown` с type guards
- `interface` для объектов, `type` для unions

### Форматирование:
- Prettier автоматически форматирует (`npm run format`)
- 2 пробела для отступов
- Одинарные кавычки для строк
- Trailing commas в multiline

### Тестирование:
- Jest для unit тестов
- Покрытие: 85%+ для новых модулей
- Изоляция тестов: использовать `testDir` для credentials
- Mock внешние зависимости

### Commits:
Следовать Conventional Commits:
```
<type>: <description>

[optional body]
```

Типы: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `ci`

## 🔄 Workflow

### Перед началом работы:
```bash
# 1. Обновить OpenAPI spec
git -C api.docs pull origin master

# 2. Проверить актуальность спецификации
cat api.docs/docs/altegio/en/openapi.yml | grep -A 20 "your_endpoint"

# 3. Прочитать Product Logic если нужно
cat docs/Altegio\ API\ and\ Product\ Logic\ Documentation.md
```

### Разработка:
```bash
npm install          # Установить зависимости
npm run build        # Собрать TypeScript
npm test             # Запустить тесты
npm run test:watch   # Watch mode для тестов
npm run lint         # Проверить код
npm run typecheck    # Проверить типы
```

### Коммиты:
- Частые, маленькие коммиты после каждой задачи
- Всегда проверять `npm test && npm run lint` перед коммитом
- Использовать Conventional Commits

## 🚀 CI/CD

### Автоматический деплой:
- Push в `main` → Cloud Build → Artifact Registry → Cloud Run
- Конфигурация: `cloudbuild.yaml`
- Secrets: `altegio-api-token` в Secret Manager

### Локальное тестирование:
```bash
# Docker
docker build -t altegio-mcp:local .
docker run --rm -p 8080:8080 --env-file .env altegio-mcp:local

# Docker Compose
docker-compose -f docker-compose.local.yml up
```

## 📝 Известные проблемы API

### OpenAPI Spec Issues:
- **Staff Creation:** Спецификация не содержит 3 обязательных поля:
  - `user_email` (required)
  - `user_phone` (required)
  - `is_user_invite` (required)
- Документировано в: `OPENAPI_SPEC_FIXES.md`

### Ограничения API:
- **Services DELETE:** Недоступна в Altegio API
- **Rate Limit:** 200 запросов/минуту
- Все write-операции требуют `user_token`

## 🎯 Ключевые паттерны

### Проверка аутентификации в handlers:
```typescript
if (!this.client.isAuthenticated()) {
  throw new Error('Authentication required. Please use altegio_login first.');
}
```

### Проверка аутентификации в client:
```typescript
async getStaff(companyId: number) {
  if (!this.userToken) {
    throw new Error('Not authenticated');
  }
  // ... API call
}
```

### Изоляция тестов:
```typescript
const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-'));
const client = new AltegioClient(config, testDir);
```

## 📚 Важные документы

### Обязательные к прочтению:
1. **README.md** - основная документация
2. **CLAUDE.md** - контекст для AI агента
3. **docs/Altegio API and Product Logic Documentation.md** - архитектура Altegio

### Руководства:
- **CLAUDE_DESKTOP_SETUP.md** - настройка Claude Desktop
- **TESTING.md** - тестирование
- **CONTRIBUTING.md** - стандарты разработки
- **CI-CD.md** - развертывание
- **docs/ONBOARDING_GUIDE.md** - онбординг визард

### Планы реализации:
- **docs/plans/2025-01-29-onboarding-wizard-design.md** - дизайн онбординга
- **docs/plans/2025-01-29-onboarding-wizard-implementation.md** - план реализации
- **docs/plans/2025-01-29-crud-operations-design.md** - дизайн CRUD
- **docs/plans/2025-01-29-crud-operations-implementation.md** - план CRUD

## ⚠️ Чеклист перед коммитом

- [ ] Обновлен OpenAPI spec (`git -C api.docs pull`)
- [ ] Все тесты проходят (`npm test`)
- [ ] Нет ошибок линтера (`npm run lint`)
- [ ] Нет ошибок типов (`npm run typecheck`)
- [ ] Проект собирается (`npm run build`)
- [ ] Использованы Conventional Commits
- [ ] Не модифицирован `api.docs/`
- [ ] Документация обновлена (если нужно)

## 🔍 Быстрая справка

### Найти endpoint в OpenAPI:
```bash
grep -r "endpoint_name" api.docs/docs/altegio/en/
```

### Проверить текущую конфигурацию:
```bash
cat .env  # Проверить переменные окружения
```

### Посмотреть логи:
```bash
# Claude Desktop (macOS)
~/Library/Logs/Claude/mcp-server-altegio-pro.log

# Cloud Run
gcloud run services logs read SERVICE_NAME --region=REGION
```

### Тестирование инструмента:
```bash
# Локально через HTTP
curl -X POST http://localhost:8080/rpc \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"tool_name","arguments":{}}}'
```

---

**Последнее обновление:** 2025-01-29
**Версия проекта:** 1.0.0
**Node.js:** >= 18.0.0

