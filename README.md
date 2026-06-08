# Blog Portal

Платформа для публикации статей с модерацией.


## Стек

Backend: Node.js + Express
База данных: PostgreSQL + Knex
Аутентификация: JWT
Фронтенд: HTML, CSS, JavaScript


## Роли

user — читать статьи, комментировать, лайкать
author — всё выше + писать статьи, отправлять на модерацию
moderator — всё выше + одобрять/отклонять посты
admin — всё выше
Назначение ролей:

Роли назначаются администратором через базу данных.

Через pgAdmin:
1. Открыть pgAdmin → blogportal → Tables → users
2. Правой кнопкой → View/Edit Data → All Rows
3. Изменить поле role на нужное: user, author, moderator, admin
4. Нажать Save

Или через SQL запрос:
UPDATE users SET role = 'author' WHERE email = 'user@example.com';

## Статусы постов

draft — черновик
review — на проверке
published — опубликован


## Установка и запуск

1. Установить PostgreSQL с postgresql.org
2. Создать базу данных blogportal через pgAdmin

3. Перейти в папку server и установить зависимости:

- cd server
- npm install

4. Создать файл .env в папке server:

PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=ваш_пароль
DB_NAME=blogportal
JWT_SECRET=blog_portal_secret_key

5. Создать таблицы:

npx knex migrate:latest --knexfile knexfile.js

6. Запустить сервер:

npm run dev

7. Открыть client/html/index.html через Live Server


## API

Регистрация
POST /api/auth/register

Вход
POST /api/auth/login

Профиль
GET /api/auth/me
PUT /api/auth/profile
GET /api/auth/stats
GET /api/auth/profile/:id

Посты
GET /api/posts/published
GET /api/posts/categories/list
GET /api/posts/my/all
GET /api/posts/review/all
GET /api/posts/:id
POST /api/posts
PUT /api/posts/:id
PATCH /api/posts/:id/submit
PATCH /api/posts/:id/moderate
DELETE /api/posts/:id
POST /api/posts/:id/like
GET /api/posts/:id/like

Комментарии
GET /api/comments/:postId
POST /api/comments/:postId
PUT /api/comments/:id
DELETE /api/comments/:id


## Параметры запросов

Посты с пагинацией:
GET /api/posts/published?page=1&limit=3

Поиск:
GET /api/posts/published?search=текст

Фильтр по категории:
GET /api/posts/published?category=Программирование

Фильтр по тегу:
GET /api/posts/published?tag=JavaScript

Сортировка:
GET /api/posts/published?sort=popular


## Скриншоты

Главная страница
Страница поста
Профиль
Редактор
Модерация


## Тесты

Запуск:

npm test

16 тестов: регистрация, вход, публикация, комментарии, фильтрация, пагинация.
