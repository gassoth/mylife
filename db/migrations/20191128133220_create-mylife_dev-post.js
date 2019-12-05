exports.up = function(knex) {
    let createQuery = `CREATE TABLE posts ( 
        id serial PRIMARY KEY, 
        title varchar (250) NOT NULL, 
        body text NOT NULL, 
        date_posted timestamp NOT NULL, 
        author varchar (250) NOT NULL, 
        visibility int NOT NULL DEFAULT 1, 
        id_account int REFERENCES account (id) ON DELETE CASCADE NOT NULL
        );`
        return knex.raw(createQuery);
};

exports.down = function(knex) {
    let dropQuery = `DROP TABLE posts;`
    return knex.raw(dropQuery);  
};