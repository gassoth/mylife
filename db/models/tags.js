'use strict';
const { Model } = require("objection");

class Tags extends Model {
    static get tableName() {
        return 'tags';
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
                tag: { type: "string" },
                id_posts: { type: "integer" },
            }
        };
    }

    static get relationMappings() {
        return {
            posts: {
                relation: Model.BelongsToOneRelation,
                modelClass: __dirname + '/posts',
                join: {
                    from: 'tags.id_posts',
                    to: 'posts.id'
                }
            }
        };
    }
}

module.exports = Tags;