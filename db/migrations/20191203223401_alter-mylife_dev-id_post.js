
exports.up = function(knex) {
    return Promise.all([
        knex.schema.alterTable('comments', function(table){
          table.renameColumn('id_post', 'id_posts');
        }),
        knex.schema.alterTable('tags', function(table){
          table.renameColumn('id_post', 'id_posts');
        }),
        knex.schema.alterTable('read', function(table){
          table.renameColumn('id_post', 'id_posts');
        })
    ])
};

exports.down = function(knex) {
    return Promise.all([
        knex.schema.alterTable('comments', function(table){
          table.renameColumn('id_posts', 'id_post');
        }),
        knex.schema.alterTable('tags', function(table){
          table.renameColumn('id_posts', 'id_post');
        }),
        knex.schema.alterTable('read', function(table){
          table.renameColumn('id_posts', 'id_post');
        })
    ])  
};
