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
    connection:'postgres://postgres:***REMOVED***@***REMOVED***:5432/postgres',
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
	  password: '***REMOVED***',
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
