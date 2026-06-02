const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

// Получить комментарии
router.get('/:postId', async (req, res) => {
    try {
        const comments = await db('comments')
            .join('users', 'comments.author_id', 'users.id')
            .where('comments.post_id', req.params.postId)
            .select(
                'comments.*',
                'users.username as author_name',
                'users.avatar as author_avatar'
            )
            .orderBy('comments.created_at', 'desc');

        res.json(comments);
    } catch (error) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Создать комментарий
router.post('/:postId', authenticate, async (req, res) => {
    try {
        const { content } = req.body;

        const [comment] = await db('comments').insert({
            content,
            author_id: req.user.id,
            post_id: req.params.postId
        }).returning('*');

        comment.author_name = req.user.username;
        comment.author_avatar = req.user.avatar;

        res.status(201).json(comment);
    } catch (error) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Обновить комментарий
router.put('/:id', authenticate, async (req, res) => {
    try {
        const comment = await db('comments')
            .where({ id: req.params.id, author_id: req.user.id })
            .first();

        if (!comment) {
            return res.status(404).json({ error: 'Комментарий не найден' });
        }

        const { content } = req.body;
        await db('comments').where({ id: comment.id }).update({
            content: content,
            updated_at: new Date()
        });

        res.json({ message: 'Обновлено' });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Удалить комментарий
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const comment = await db('comments')
            .where({ id: req.params.id, author_id: req.user.id })
            .first();

        if (!comment) {
            return res.status(404).json({ error: 'Комментарий не найден' });
        }

        await db('comments').where({ id: comment.id }).del();
        res.json({ message: 'Удалено' });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

module.exports = router;