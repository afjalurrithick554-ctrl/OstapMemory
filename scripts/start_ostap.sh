#!/bin/bash
# Скрипт запуска OstapMemory
# Переходим в корень проекта
cd "$(dirname "$0")/.."

# Поднимаем Docker-контейнеры в фоновом режиме
docker compose up -d

# Небольшая пауза, чтобы фронтенд успел подняться
sleep 2

# Открываем Chrome в режиме веб-приложения (с новым портом 8502)
google-chrome --app=http://localhost:8502 || xdg-open http://localhost:8502
