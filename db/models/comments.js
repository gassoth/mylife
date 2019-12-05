'use strict';
const { Model } = require("objection");

class Comments extends Model {
    static get tableName() {
        return 'comments';
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
                author: { type: "string" },
                body: { type: "string" },
                date_posted: { type: "string", format: "date-time" },
                id_posts: { type: "integer" },
                id_account: { type: "integer" }
            }
        };
    }

    static get relationMappings() {
        return {
            account: {
                relation: Model.BelongsToOneRelation,
                // The related model. This can be either a Model subclass constructor or an
                // absolute file path to a module that exports one. We use the file path version
                // here to prevent require loops.
                modelClass: __dirname + '/account',
                join: {
                    from: 'comments.id_account',
                    to: 'account.id'
                }
            },
            posts: {
                relation: Model.BelongsToOneRelation,
                modelClass: __dirname + '/posts',
                join: {
                    from: 'comments.id_posts',
                    to: 'posts.id'
                }
            }
        };
    }
}

module.exports = Comments;