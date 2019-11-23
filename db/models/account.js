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

  // Each model must have a column (or a set of columns) that uniquely
  // identifies the rows. The column(s) can be specified using the `idColumn`
  // property. `idColumn` returns `id` by default and doesn't need to be
  // specified unless the model's primary key is something else.
  static get idColumn() {
    return 'id';
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

    
