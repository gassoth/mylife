'use strict';
const { Model } = require("objection");
const Posts = require('./posts');
const Comments = require('./comments');

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
        about: { type: "string" },
        permission: { type: "integer" },
        generated_username: { type: "string" },
        date_created: { type: "string", format: "date-time" },
        last_logged: { type: "string", format: "date-time" }
      }
    };
  }

  static get relationMappings() {
    return {
      posts: {
        relation: Model.HasManyRelation,
        // The related model. This can be either a Model subclass constructor or an
        // absolute file path to a module that exports one.
        modelClass: Posts,
        join: {
          from: 'account.id',
          to: 'posts.id_account'
        }
      },
      comments: {
        relation: Model.HasManyRelation,
        modelClass: Comments,
        join: {
          from: 'account.id',
          to: 'comments.id_account'
        }
      },
      subscriber: {
        relation: Model.ManyToManyRelation,
        modelClass: Account,
        join: {
          from: 'account.id',
          through: {
            from: 'subscriptions.id_subscriber',
            to: 'subscriptions.id_subscribed'
          },
          to: 'account.id'
        }
      },
      subscribed: {
        relation: Model.ManyToManyRelation,
        modelClass: Account,
        join: {
          from: 'account.id',
          through: {
            from: 'subscriptions.id_subscribed',
            to: 'subscriptions.id_subscriber'
          },
          to: 'account.id'
        }
      },
      read: {
        relation: Model.ManyToManyRelation,
        modelClass: Posts,
        join: {
          from: 'account.id',
          // ManyToMany relation needs the `through` object to describe the join table.
          through: {
            from: 'read.id_account',
            to: 'read.id_posts'
          },
          to: 'posts.id'
        }

      }
    };
  }
}
module.exports = Account;