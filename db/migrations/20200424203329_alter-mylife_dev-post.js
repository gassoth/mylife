exports.up = function(knex) {
    return Promise.all([
        knex.schema.alterTable('posts', function(table){
          table.specificType('tags', 'text[]').notNullable().defaultTo('{}');
          table.index('tags','tags_index','GIN');
        })
    ])
};

exports.down = function(knex) {
    return Promise.all([
        knex.schema.alterTable('posts', function(table){
          table.dropIndex(['tags'], 'tags_index');
          table.dropColumn('tags');
        })
    ])
};
