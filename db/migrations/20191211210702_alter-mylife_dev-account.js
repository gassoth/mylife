
exports.up = function(knex) {
    return Promise.all([
        knex.schema.alterTable('account', function(table){
          table.string('about', 1000).notNullable().defaultTo('This is some about text.  This is all I want you to know about me.  This is the content I post.');
          table.timestamp('last_logged', { useTz: true }).defaultTo(null);
        })
    ])
};

exports.down = function(knex) {
    return Promise.all([
        knex.schema.alterTable('account', function(table){
          table.dropColumn('about');
          table.dropColumn('last_logged');
        })
    ])
};
