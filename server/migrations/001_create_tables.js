exports.up = async function(knex) {
    // Пользователи
    await knex.schema.createTable('users', (table) => {
        table.increments('id').primary();
        table.string('username', 50).notNullable().unique();
        table.string('email', 100).notNullable().unique();
        table.string('password', 255).notNullable();
        table.enu('role', ['user', 'author', 'moderator', 'admin']).defaultTo('user');
        table.string('avatar', 255).defaultTo('');
        table.string('bio', 500).defaultTo('');
        table.timestamp('created_at').defaultTo(knex.fn.now());
    });

    // Посты
    await knex.schema.createTable('posts', (table) => {
        table.increments('id').primary();
        table.string('title', 200).notNullable();
        table.string('slug', 200);
        table.text('content').notNullable();
        table.string('excerpt', 500);
        table.integer('author_id').unsigned().references('id').inTable('users');
        table.string('category', 50).notNullable();
        table.enu('status', ['draft', 'review', 'published']).defaultTo('draft');
        table.string('featured_image', 255).defaultTo('');
        table.integer('view_count').defaultTo(0);
        table.timestamp('published_at');
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.timestamp('updated_at').defaultTo(knex.fn.now());
    });

    // Теги
    await knex.schema.createTable('tags', (table) => {
        table.increments('id').primary();
        table.string('name', 50).notNullable();
        table.integer('post_id').unsigned().references('id').inTable('posts');
    });

    // Комментарии
    await knex.schema.createTable('comments', (table) => {
        table.increments('id').primary();
        table.text('content').notNullable();
        table.integer('author_id').unsigned().references('id').inTable('users');
        table.integer('post_id').unsigned().references('id').inTable('posts');
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.timestamp('updated_at').defaultTo(knex.fn.now());
    });
};

exports.down = async function(knex) {
    await knex.schema.dropTableIfExists('comments');
    await knex.schema.dropTableIfExists('tags');
    await knex.schema.dropTableIfExists('posts');
    await knex.schema.dropTableIfExists('users');
};