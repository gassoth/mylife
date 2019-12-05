exports.up = function(knex) {
    let createQuery = `ALTER TABLE account ALTER COLUMN password TYPE varchar (100);`
    return knex.raw(createQuery);
};

exports.down = function(knex) {
    let undoQuery = `ALTER TABLE account ALTER COLUMN password TYPE varchar (50);`
    return knex.raw(undoQuery);
};
