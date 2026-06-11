import { Store, schema } from 'modelence/server';

export const dbExampleItems = new Store('exampleItems', {
  schema: {
    title: schema.string(),
    createdAt: schema.date(),
    userId: schema.userId(),
  },
  indexes: []
});
