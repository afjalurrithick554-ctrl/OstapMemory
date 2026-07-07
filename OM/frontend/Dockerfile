# Фронтенд OstapMemory — dev-режим (Vite) для ФАЗЫ 0.
# Prod-сборку с nginx добавим на этапе polish.
FROM node:20-slim

WORKDIR /app

# Кэшируем установку зависимостей отдельным слоем
COPY package.json package-lock.json* ./
RUN npm install

# Остальной код монтируется томом в docker-compose (hot-reload),
# но копируем и в образ, чтобы он был самодостаточным
COPY . .

EXPOSE 8502

# --host обязателен, чтобы Vite слушал на 0.0.0.0 внутри контейнера
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "8502"]
