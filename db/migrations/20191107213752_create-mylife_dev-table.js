exports.up = function(knex) {
    let createQuery = `CREATE TABLE account (
	id serial PRIMARY KEY,
	email varchar (50) NOT NULL,
	password varchar (50) NOT NULL,
	permission int NOT NULL DEFAULT 0,
	generated_username varchar (50) UNIQUE DEFAULT 'anon',
	date_created timestamp NOT NULL
    );`
    return knex.raw(createQuery);
  
};

exports.down = function(knex) {
    let dropQuery = `DROP TABLE account;`
    return knex.raw(dropQuery);
};
