
exports.up = function(knex) {
    return Promise.all([
        knex.schema.createTable('tags', function(table){
          table.increments('id').primary();
          table.string('tag', 100).notNullable();
          table.integer('id_post').references('id').inTable('posts').notNullable().onDelete('CASCADE');
        })
    ])  
};

exports.down = function(knex) {
    return Promise.all([
        knex.schema.dropTable('tags')
    ])
};
