const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

// Все опубликованные посты
router.get('/published', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        let query = db('posts')
            .join('users', 'posts.author_id', 'users.id')
            .where('posts.status', 'published');

        if (req.query.category) {
            query = query.where('posts.category', req.query.category);
        }

        if (req.query.search) {
            query = query.where(function() {
                this.where('posts.title', 'ilike', `%${req.query.search}%`)
                    .orWhere('posts.content', 'ilike', `%${req.query.search}%`);
            });
        }

        if (req.query.tag) {
            query = query.whereIn('posts.id', function() {
                this.select('post_id').from('tags').where('name', req.query.tag);
            });
        }

        let orderBy = 'posts.published_at';
        let orderDir = 'desc';

        if (req.query.sort === 'popular') {
            orderBy = 'posts.view_count';
        }

        const countResult = await query.clone().count('posts.id as count').first();
        const count = parseInt(countResult.count);

        const posts = await query.clone()
            .select(
                'posts.id', 'posts.title', 'posts.slug', 'posts.excerpt',
                'posts.content', 'posts.category', 'posts.status',
                'posts.featured_image', 'posts.view_count',
                'posts.published_at', 'posts.created_at', 'posts.author_id',
                'users.username as author_name', 'users.avatar as author_avatar'
            )
            .orderBy(orderBy, orderDir)
            .limit(limit)
            .offset(offset);

        for (let post of posts) {
            const tags = await db('tags').where({ post_id: post.id }).select('name');
            post.tags = tags.map(t => t.name);
        }

        res.json({
            posts,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(count / limit) || 0,
                totalPosts: count
            }
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Категории
router.get('/categories/list', async (req, res) => {
    try {
        const categories = await db('posts')
            .where('status', 'published')
            .select('category')
            .count('id as count')
            .groupBy('category')
            .orderBy('count', 'desc');

        res.json(categories);
    } catch (error) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Мои посты
router.get('/my/all', authenticate, async (req, res) => {
    try {
        const posts = await db('posts')
            .where({ author_id: req.user.id })
            .orderBy('created_at', 'desc');
        res.json(posts);
    } catch (error) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Посты на модерации
router.get('/review/all', authenticate, authorize('moderator', 'admin'), async (req, res) => {
    try {
        const posts = await db('posts')
            .join('users', 'posts.author_id', 'users.id')
            .where('posts.status', 'review')
            .select('posts.*', 'users.username as author_name')
            .orderBy('posts.created_at', 'desc');
        res.json(posts);
    } catch (error) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Один пост
router.get('/:id', async (req, res) => {
    try {
        const post = await db('posts')
            .join('users', 'posts.author_id', 'users.id')
            .where('posts.id', req.params.id)
            .select(
                'posts.*',
                'users.username as author_name',
                'users.avatar as author_avatar',
                'users.bio as author_bio'
            )
            .first();

        if (!post) {
            return res.status(404).json({ error: 'Пост не найден' });
        }

        const tags = await db('tags').where({ post_id: post.id }).select('name');
        post.tags = tags.map(t => t.name);

        await db('posts').where({ id: post.id }).increment('view_count', 1);

        res.json(post);
    } catch (error) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Создать пост
router.post('/', authenticate, authorize('author', 'moderator', 'admin'), async (req, res) => {
    try {
        const { title, content, excerpt, category, tags, featuredImage } = req.body;

        const slug = title
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/--+/g, '-')
            .trim();

        const [post] = await db('posts').insert({
            title,
            slug,
            content,
            excerpt: excerpt || content.substring(0, 200),
            category,
            author_id: req.user.id,
            featured_image: featuredImage || 'https://abrakadabra.fun/uploads/posts/2022-01/1641206099_7-abrakadabra-fun-p-interesnii-belii-fon-8.jpg',
            status: 'draft'
        }).returning('*');

        if (tags && tags.length > 0) {
            const tagList = Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim());
            for (let tagName of tagList) {
                if (tagName) {
                    await db('tags').insert({ name: tagName, post_id: post.id });
                }
            }
        }

        res.status(201).json(post);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Обновить пост
router.put('/:id', authenticate, async (req, res) => {
    try {
        const post = await db('posts')
            .where({ id: req.params.id, author_id: req.user.id })
            .first();

        if (!post) {
            return res.status(404).json({ error: 'Пост не найден' });
        }

        const { title, content, excerpt, category, tags, featuredImage } = req.body;

        await db('posts').where({ id: post.id }).update({
            title: title || post.title,
            content: content || post.content,
            excerpt: excerpt || post.excerpt,
            category: category || post.category,
            featured_image: featuredImage !== undefined ? featuredImage : post.featured_image,
            updated_at: new Date()
        });

        if (tags) {
            await db('tags').where({ post_id: post.id }).del();
            const tagList = Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim());
            for (let tagName of tagList) {
                if (tagName) {
                    await db('tags').insert({ name: tagName, post_id: post.id });
                }
            }
        }

        res.json({ message: 'Обновлено' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Отправить на модерацию
router.patch('/:id/submit', authenticate, authorize('author', 'moderator', 'admin'), async (req, res) => {
    try {
        const post = await db('posts')
            .where({ id: req.params.id, author_id: req.user.id, status: 'draft' })
            .first();

        if (!post) {
            return res.status(404).json({ error: 'Пост не найден' });
        }

        await db('posts').where({ id: post.id }).update({ status: 'review' });
        res.json({ message: 'Отправлено на модерацию' });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Модерировать пост
router.patch('/:id/moderate', authenticate, authorize('moderator', 'admin'), async (req, res) => {
    try {
        const { action } = req.body;
        const post = await db('posts').where({ id: req.params.id }).first();

        if (!post) {
            return res.status(404).json({ error: 'Пост не найден' });
        }

        if (action === 'approve') {
            await db('posts').where({ id: post.id }).update({
                status: 'published',
                published_at: new Date()
            });
        } else if (action === 'reject') {
            await db('posts').where({ id: post.id }).update({ status: 'draft' });
        }

        res.json({ message: 'Готово' });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Удалить пост
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const post = await db('posts')
            .where({ id: req.params.id, author_id: req.user.id })
            .first();

        if (!post) {
            return res.status(404).json({ error: 'Пост не найден' });
        }

        await db('tags').where({ post_id: post.id }).del();
        await db('comments').where({ post_id: post.id }).del();
        await db('likes').where({ post_id: post.id }).del();
        await db('posts').where({ id: post.id }).del();

        res.json({ message: 'Пост удалён' });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Лайк
router.post('/:id/like', authenticate, async (req, res) => {
    try {
        const existing = await db('likes')
            .where({ user_id: req.user.id, post_id: req.params.id })
            .first();

        if (existing) {
            await db('likes').where({ id: existing.id }).del();
            res.json({ liked: false });
        } else {
            await db('likes').insert({
                user_id: req.user.id,
                post_id: req.params.id
            });
            res.json({ liked: true });
        }
    } catch (error) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Статус лайка
router.get('/:id/like', authenticate, async (req, res) => {
    try {
        const existing = await db('likes')
            .where({ user_id: req.user.id, post_id: req.params.id })
            .first();

        const count = await db('likes')
            .where({ post_id: req.params.id })
            .count('id as count')
            .first();

        res.json({
            liked: !!existing,
            count: parseInt(count.count)
        });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

module.exports = router;