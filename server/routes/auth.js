const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

// Регистрация
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        const existing = await db('users').where({ email }).first();

        if (existing) {
            return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const [result] = await db('users').insert({
            username,
            email,
            password: hashedPassword,
            role: 'user',
            avatar: 'https://raw.githubusercontent.com/itchief/modx-solutions/main/Login/04-upload-photo/01-default.svg'
        }).returning(['id', 'username', 'email', 'role', 'avatar', 'bio', 'created_at']);

        const token = jwt.sign({ userId: result.id }, process.env.JWT_SECRET, { expiresIn: '30d' });

        res.status(201).json({ token, user: result });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Вход
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await db('users').where({ email }).first();
        if (!user) {
            return res.status(400).json({ error: 'Неверный email или пароль' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Неверный email или пароль' });
        }

        delete user.password;
        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });

        res.json({ token, user });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Текущий пользователь
router.get('/me', authenticate, async (req, res) => {
    res.json(req.user);
});

// Обновить профиль
router.put('/profile', authenticate, async (req, res) => {
    try {
        const { username, bio, avatar } = req.body;

        const updateData = {};
        if (username) updateData.username = username;
        if (bio !== undefined) updateData.bio = bio;
        if (avatar) updateData.avatar = avatar;

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: 'Нет данных для обновления' });
        }

        const updated = await db('users')
            .where({ id: req.user.id })
            .update(updateData)
            .returning(['id', 'username', 'email', 'role', 'avatar', 'bio', 'created_at']);

        res.json(updated[0]);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Статистика
router.get('/stats', authenticate, async (req, res) => {
    try {
        const postsCount = await db('posts')
            .where({ author_id: req.user.id })
            .count('id as count')
            .first();

        const viewsResult = await db('posts')
            .where({ author_id: req.user.id })
            .sum('view_count as total')
            .first();

        const commentsCount = await db('comments')
            .where({ author_id: req.user.id })
            .count('id as count')
            .first();

        res.json({
            posts: parseInt(postsCount.count),
            views: parseInt(viewsResult.total) || 0,
            comments: parseInt(commentsCount.count)
        });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Публичный профиль
router.get('/profile/:id', async (req, res) => {
    try {
        const user = await db('users')
            .where({ id: req.params.id })
            .select('id', 'username', 'avatar', 'bio', 'role', 'created_at')
            .first();

        if (!user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        const postsCount = await db('posts')
            .where({ author_id: user.id, status: 'published' })
            .count('id as count')
            .first();

        const posts = await db('posts')
            .where({ author_id: user.id, status: 'published' })
            .orderBy('published_at', 'desc')
            .limit(10);

        res.json({ user, postsCount: parseInt(postsCount.count), posts });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

module.exports = router;
