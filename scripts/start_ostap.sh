#!/bin/bash
# Скрипт запуска OstapMemory
# Переходим в корень проекта
cd "$(dirname "$0")/.."

# Поднимаем новый стек OstapMemory (Vue 3) из папки OM/
docker compose -f OM/docker-compose.yml up -d

# Пауза, чтобы dev-сервер Vite успел подняться
sleep 5

# Открываем Chrome в режиме веб-приложения (с новым портом 8502)
google-chrome --app=http://localhost:8502 || xdg-open http://localhost:8502
