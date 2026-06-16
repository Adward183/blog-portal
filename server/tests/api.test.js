const request = require('supertest');
const express = require('express');
const db = require('../db');
const authRoutes = require('../routes/auth');
const postRoutes = require('../routes/posts');
const commentRoutes = require('../routes/comments');

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/comments', commentRoutes);

let userToken = '';
let userId = '';
let postId = '';
let commentId = '';

beforeAll(async () => {
    const testUser = await db('users').where('email', 'testuser999@test.com').first();
    if (testUser) {
        const testPosts = await db('posts').where('author_id', testUser.id);
        for (let post of testPosts) {
            await db('likes').where('post_id', post.id).del();
            await db('comments').where('post_id', post.id).del();
            await db('tags').where('post_id', post.id).del();
        }
        await db('likes').where('user_id', testUser.id).del();
        await db('posts').where('author_id', testUser.id).del();
        await db('users').where('id', testUser.id).del();
    }
});

describe('1. АВТОРИЗАЦИЯ', () => {

    test('Регистрация нового пользователя', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({
                username: 'testuser999',
                email: 'testuser999@test.com',
                password: '123456'
            });
        
        expect(res.status).toBe(201);
        expect(res.body.token).toBeDefined();
        userToken = res.body.token;
        userId = res.body.user.id;
    });

    test('Вход с правильными данными', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'testuser999@test.com',
                password: '123456'
            });
        
        expect(res.status).toBe(200);
        expect(res.body.token).toBeDefined();
    });

    test('Вход с неправильным паролем', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'testuser999@test.com',
                password: 'wrong'
            });
        
        expect(res.status).toBe(400);
    });

});

describe('2. ПУБЛИКАЦИЯ ПОСТА', () => {

    beforeAll(async () => {
        await db('users').where({ id: userId }).update({ role: 'author' });
    });

    test('Создание поста', async () => {
        const res = await request(app)
            .post('/api/posts')
            .set('Authorization', 'Bearer ' + userToken)
            .send({
                title: 'Test post',
                content: 'Test content for API',
                category: 'Программирование',
                tags: ['test', 'api']
            });
        
        expect(res.status).toBe(201);
        expect(res.body.title).toBe('Test post');
        expect(res.body.status).toBe('draft');
        postId = res.body.id;
    });

    test('Отправка на модерацию', async () => {
        const res = await request(app)
            .patch('/api/posts/' + postId + '/submit')
            .set('Authorization', 'Bearer ' + userToken);
        
        expect(res.status).toBe(200);
    });

    test('Получение одного поста', async () => {
        const res = await request(app)
            .get('/api/posts/' + postId);
        
        expect(res.status).toBe(200);
        expect(res.body.title).toBe('Test post');
    });

    test('Получение опубликованных постов', async () => {
        const res = await request(app)
            .get('/api/posts/published');
        
        expect(res.status).toBe(200);
        expect(res.body.posts).toBeDefined();
        expect(res.body.pagination).toBeDefined();
    });

});

describe('3. КОММЕНТАРИИ', () => {

    test('Создание комментария', async () => {
        const res = await request(app)
            .post('/api/comments/' + postId)
            .set('Authorization', 'Bearer ' + userToken)
            .send({
                content: 'Test comment'
            });
        
        expect(res.status).toBe(201);
        expect(res.body.content).toBe('Test comment');
        commentId = res.body.id;
    });

    test('Получение комментариев поста', async () => {
        const res = await request(app)
            .get('/api/comments/' + postId);
        
        expect(res.status).toBe(200);
        expect(res.body.length).toBeGreaterThan(0);
    });

    test('Редактирование комментария', async () => {
        const res = await request(app)
            .put('/api/comments/' + commentId)
            .set('Authorization', 'Bearer ' + userToken)
            .send({
                content: 'Edited comment'
            });
        
        expect(res.status).toBe(200);
    });

    test('Удаление комментария', async () => {
        const res = await request(app)
            .delete('/api/comments/' + commentId)
            .set('Authorization', 'Bearer ' + userToken);
        
        expect(res.status).toBe(200);
    });

});

describe('4. ФИЛЬТРАЦИЯ И ПОИСК', () => {

    test('Поиск по названию', async () => {
        const res = await request(app)
            .get('/api/posts/published?search=Test');
        
        expect(res.status).toBe(200);
    });

    test('Фильтрация по категории', async () => {
        const res = await request(app)
            .get('/api/posts/published?category=' + encodeURIComponent('Программирование'));
        
        expect(res.status).toBe(200);
    });

    test('Поиск по тегу', async () => {
        const res = await request(app)
            .get('/api/posts/published?tag=test');
        
        expect(res.status).toBe(200);
    });

    test('Сортировка по популярности', async () => {
        const res = await request(app)
            .get('/api/posts/published?sort=popular');
        
        expect(res.status).toBe(200);
    });

    test('Пагинация', async () => {
        const res = await request(app)
            .get('/api/posts/published?page=1&limit=2');
        
        expect(res.status).toBe(200);
        expect(res.body.pagination.currentPage).toBe(1);
    });

});