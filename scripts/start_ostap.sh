#!/bin/bash
# Переходим в корневую директорию проекта (на уровень выше от папки scripts)
cd /home/boba/repos/OstapMemory

# Запускаем контейнеры в фоне
docker compose up -d

# Небольшая пауза, чтобы фронтенд точно успел ответить
sleep 2

# Открываем Chrome в режиме отдельного окна-приложения
google-chrome --app=http://localhost:5174
