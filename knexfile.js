require('dotenv').config({path: './.env'});

module.exports = {
  development: {
    client: 'pg',
    connection:'postgres://titopei:password@localhost/mylife_dev',
    migrations: {
      directory: './db/migrations'
    },
    seeds: {
      directory: './db/seeds/dev'
    },
    useNullAsDefault: true
  },

  test: {
    client: 'pg',
      connection: {
	  port: 5432,
	  host: process.env.DATABASE_URL,
	  user: 'postgres',
	  password: process.env.DATABASE_PASSWORD,
	  database: 'postgres'
      },
    migrations: {
      directory: './db/migrations'
    },
    seeds: {
      directory: './db/seeds/test'
    },
    useNullAsDefault: true
  },

  production: {
    client: 'pg',
      connection: {
	  port: 5432,
	  host: process.env.DATABASE_URL,
	  user: 'postgres',
	  password: process.env.DATABASE_PASSWORD,
	  database: 'postgres'
      },
    migrations: {
      directory: './db/migrations'
    },
    seeds: {
      directory: './db/seeds/production'
    },
    useNullAsDefault: true
  }
}
