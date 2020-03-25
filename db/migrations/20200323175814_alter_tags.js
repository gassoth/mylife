
exports.up = function(knex) {
    return Promise.all([
        knex.schema.alterTable('tags', function(table){
          table.unique(['tag', 'id_posts']);
        })
    ])
};

exports.down = function(knex) {
    return Promise.all([
        knex.schema.alterTable('tags', function(table){
            table.dropUnique(['tag', 'id_posts']);
        })
    ])
};
