#!/bin/bash
echo "=== Анализ Логов MCP Сервера ==="
echo

LOG_FILE=~/Library/Logs/Claude/mcp-server-altegio-local.log

echo "1. Общая статистика:"
echo "   Всего строк: $(wc -l < "$LOG_FILE")"
echo "   Размер файла: $(ls -lh "$LOG_FILE" | awk '{print $5}')"
echo

echo "2. Ошибки (ZodError):"
grep -c "ZodError" "$LOG_FILE" || echo "0"
echo

echo "3. Успешные сообщения:"
grep -c "Message from server.*result" "$LOG_FILE" || echo "0"
echo

echo "4. Инициализация:"
grep "protocol" "$LOG_FILE" | tail -1 | grep -o '"protocolVersion":"[^"]*"' || echo "Не найдено"
echo

echo "5. Зарегистрированные инструменты:"
grep "tools.*altegio" "$LOG_FILE" | tail -1 | jq -r '.tools[].name' 2>/dev/null || echo "Парсинг не удался"
echo

echo "6. Последние 5 событий:"
tail -5 "$LOG_FILE" | grep -E "info|error" | grep -o '\[.*\] \[.*\] .*' || tail -5 "$LOG_FILE"
echo

echo "=== Заключение ==="
if grep -q '"tools":\[' "$LOG_FILE"; then
    echo "✓ Сервер инициализирован"
    echo "✓ Инструменты зарегистрированы"
    echo "⚠ Есть ZodError от Claude Desktop (логи в stdout)"
else
    echo "✗ Проблемы с инициализацией"
fi
