'use strict';
const { Model } = require("objection");

class Tickets extends Model {
    static get tableName() {
        return 'tickets';
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
                ticket_code: { type: "string" },
                date_created: { type: "string", format: "date-time" },
                id_account: { type: "integer" }
            }
        };
    }

    static get relationMappings() {
        return {
            posts: {
                relation: Model.BelongsToOneRelation,
                modelClass: __dirname + '/account',
                join: {
                    from: 'tickets.id_account',
                    to: 'account.id'
                }
            }
        };
    }
}

module.exports = Tickets;