require('dotenv').config({path: './.env'});

module.exports = {
  development: {
    client: 'pg',
    connection:'postgres://postgres:password@localhost/mylife_dev',
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
	  port: process.env.DATABASE_PORT,
	  host: process.env.DATABASE_URL,
	  user: process.env.DATABASE_USER,
	  password: process.env.DATABASE_PASSWORD,
	  database: process.env.DATABASE_NAME,
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
	  port: process.env.DATABASE_PORT,
	  host: process.env.DATABASE_URL,
	  user: process.env.DATABASE_USER,
	  password: process.env.DATABASE_PASSWORD,
	  database: process.env.DATABASE_NAME,
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
