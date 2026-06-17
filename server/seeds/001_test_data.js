const bcrypt = require('bcryptjs');

exports.seed = async function(knex) {
    await knex('likes').del();
    await knex('comments').del();
    await knex('tags').del();
    await knex('posts').del();
    await knex('users').del();

    const salt = await bcrypt.genSalt(10);
    const password = await bcrypt.hash('123456', salt);

    const [admin] = await knex('users').insert({
        username: 'Admin',
        email: 'admin@blog.com',
        password: password,
        role: 'admin',
        avatar: 'https://via.placeholder.com/150',
        bio: 'Администратор портала'
    }).returning('id');

    const [moder] = await knex('users').insert({
        username: 'Moderator',
        email: 'moder@blog.com',
        password: password,
        role: 'moderator',
        avatar: 'https://via.placeholder.com/150',
        bio: 'Модератор'
    }).returning('id');

    const [author] = await knex('users').insert({
        username: 'Author',
        email: 'author@blog.com',
        password: password,
        role: 'author',
        avatar: 'https://via.placeholder.com/150',
        bio: 'Автор статей'
    }).returning('id');

    const [reader] = await knex('users').insert({
        username: 'Reader',
        email: 'reader@blog.com',
        password: password,
        role: 'user',
        avatar: 'https://via.placeholder.com/150',
        bio: 'Читатель'
    }).returning('id');

    const posts = [
        {
            title: 'Введение в JavaScript',
            slug: 'vvedenie-v-javascript',
            content: 'JavaScript — это язык программирования, который используется для создания интерактивных веб-страниц. В этой статье мы рассмотрим основы языка, переменные, функции и циклы.',
            excerpt: 'Основы JavaScript для начинающих разработчиков',
            category: 'Программирование',
            author_id: author.id,
            status: 'published',
            featured_image: 'https://via.placeholder.com/350x200',
            view_count: 150,
            published_at: knex.fn.now()
        },
        {
            title: 'Основы CSS Grid',
            slug: 'osnovy-css-grid',
            content: 'CSS Grid Layout — это система двумерного макета для веб-дизайна. Она позволяет создавать сложные макеты с помощью строк и столбцов.',
            excerpt: 'Изучаем современную раскладку на CSS Grid',
            category: 'Дизайн',
            author_id: author.id,
            status: 'published',
            featured_image: 'https://via.placeholder.com/350x200',
            view_count: 89,
            published_at: knex.fn.now()
        },
        {
            title: 'Будущее искусственного интеллекта',
            slug: 'buduschee-ii',
            content: 'Искусственный интеллект продолжает развиваться быстрыми темпами. В этой статье мы рассмотрим последние достижения и прогнозы на будущее.',
            excerpt: 'Что нас ждёт в мире AI в ближайшие годы',
            category: 'Технологии',
            author_id: admin.id,
            status: 'published',
            featured_image: 'https://via.placeholder.com/350x200',
            view_count: 230,
            published_at: knex.fn.now()
        },
        {
            title: 'Черновик статьи про Python',
            slug: 'chernovik-python',
            content: 'Эта статья про Python ещё не готова...',
            excerpt: 'Незаконченная статья про Python',
            category: 'Программирование',
            author_id: author.id,
            status: 'draft',
            view_count: 0
        },
        {
            title: 'Статья на модерации',
            slug: 'na-moderacii',
            content: 'Эта статья ждёт проверки модератором перед публикацией.',
            excerpt: 'Статья на проверке',
            category: 'Наука',
            author_id: author.id,
            status: 'review',
            view_count: 0
        }
    ];

    for (let post of posts) {
        const [p] = await knex('posts').insert(post).returning('id');

        if (post.slug === 'vvedenie-v-javascript') {
            await knex('tags').insert([
                { name: 'JavaScript', post_id: p.id },
                { name: 'Начинающим', post_id: p.id }
            ]);
        }
        if (post.slug === 'osnovy-css-grid') {
            await knex('tags').insert([
                { name: 'CSS', post_id: p.id },
                { name: 'Дизайн', post_id: p.id }
            ]);
        }
        if (post.slug === 'buduschee-ii') {
            await knex('tags').insert([
                { name: 'AI', post_id: p.id },
                { name: 'Технологии', post_id: p.id }
            ]);
        }
    }

       const jsPost = await knex('posts').where('slug', 'vvedenie-v-javascript').first();

    await knex('comments').insert({
        content: 'Отличная статья! Очень помогла разобраться с основами JavaScript.',
        author_id: reader.id,
        post_id: jsPost.id
    });

    await knex('comments').insert({
        content: 'А когда будет продолжение про продвинутые темы?',
        author_id: moder.id,
        post_id: jsPost.id
    });

    await knex('likes').insert({
        user_id: reader.id,
        post_id: jsPost.id
    });

    await knex('likes').insert({
        user_id: moder.id,
        post_id: jsPost.id
    });
};