exports.up = async function(knex) {
    await knex.schema.createTable('likes', (table) => {
        table.increments('id').primary();
        table.integer('user_id').unsigned().references('id').inTable('users');
        table.integer('post_id').unsigned().references('id').inTable('posts');
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.unique(['user_id', 'post_id']);
    });
};

exports.down = async function(knex) {
    await knex.schema.dropTableIfExists('likes');
};