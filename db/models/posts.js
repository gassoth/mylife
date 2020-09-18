'use strict';
const { Model } = require("objection");
const Comments = require('./comments');

class Posts extends Model {
    static get tableName() {
        return 'posts';
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
                title: { type: "string" },
                body_delta: { type: "string" },
                body_html: { type: "string" },
                date_posted: { type: "string", format: "date-time" },
                author: { type: "string" },
                visibility: { type: "integer" },
                id_account: { type: "integer" },
                tags: { type: "string[]"},
                body: { type: "string" }
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
                    from: 'posts.id_account',
                    to: 'account.id'
                }
            },
            comments: {
                relation: Model.HasManyRelation,
                modelClass: Comments,
                join: {
                    from: 'posts.id',
                    to: 'comments.id_posts'
                }
            },
            read: {
                relation: Model.ManyToManyRelation,
                modelClass: __dirname + '/account',
                join: {
                  from: 'posts.id',
                  // ManyToMany relation needs the `through` object to describe the join table.
                  through: {
                    from: 'read.id_posts',
                    to: 'read.id_account'
                  },
                  to: 'account.id'
                }
            },
            bookmarks: {
                relation: Model.ManyToManyRelation,
                modelClass: __dirname + '/account',
                join: {
                  from: 'posts.id',
                  // ManyToMany relation needs the `through` object to describe the join table.
                  through: {
                    from: 'bookmarks.id_post',
                    to: 'bookmarks.id_account'
                  },
                  to: 'account.id'
                }
            },
            tags: {
                relation: Model.HasManyRelation,
                modelClass: __dirname + '/tags',
                join: {
                    from: 'posts.id',
                    to: 'tags.id_posts'
                }
            }             
        };
    }
}

module.exports = Posts;