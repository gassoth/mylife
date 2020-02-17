exports.up = function(knex) {
    return Promise.all([
        knex.schema.alterTable('posts', function(table){
          table.renameColumn('body','body_delta');
          table.text('body_html').notNullable();
        })
    ])
};

exports.down = function(knex) {
    return Promise.all([
        knex.schema.alterTable('posts', function(table){
          table.renameColumn('body_delta','body');
          table.dropColumn('body_html');
        })
    ])
};