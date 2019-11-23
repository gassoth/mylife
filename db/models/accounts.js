'use strict';
//const Knex = require('knex');
//const connection = require('../../knexfile');
const { Model } = require("objection");

//const knexConnection = Knex(connection.development);
//Model.knex(knexConnection);

class Account extends Model {
  static get tableName() {
    return 'account';
  }

    static get emailColumn() {
	return 'email';
    }

    static get jsonSchema() {
	return {
	    type: "object",

	    properties: {
		id: { type: "integer" },
		email: { type: "string" },
		password: { type: "string" },
		permission: { type: "integer" },
		generated_username: { type: "string" },
		date_created: { type: "string", format: "date-time" }
	    }
	};
    }

    static get reslationMappings() {
	return;
    }
    
}

module.exports = Account;

    
