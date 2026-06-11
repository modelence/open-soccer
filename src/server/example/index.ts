import z from 'zod';
import { AuthError } from 'modelence';
import { Module, ObjectId, UserInfo, getConfig } from 'modelence/server';
import { dbExampleItems } from './db';
import { dailyTestCron } from './cron';

export default new Module('example', {
  configSchema: {
    modelenceDemoUsername: {
      type: 'string',
      default: 'demo@modelence.dev',
      isPublic: true,
    },
    modelenceDemoPassword: {
      type: 'string',
      default: '12345678',
      isPublic: true,
    },
    itemsPerPage: {
      type: 'number',
      default: 5,
      isPublic: false,
    },
  },

  stores: [dbExampleItems],
  
  queries: {
    getItem: async (args: unknown, { user }: { user: UserInfo | null }) => {
      if (!user) {
        throw new AuthError('Not authenticated');
      }

      const { itemId } = z.object({ itemId: z.string() }).parse(args);
      const exampleItem = await dbExampleItems.requireOne({ _id: new ObjectId(itemId) });

      if (exampleItem.userId.toString() !== user.id) {
        throw new AuthError('Not authorized');
      }

      return {
        title: exampleItem.title,
        createdAt: exampleItem.createdAt,
      };
    },

    getItems: async (_args: unknown, { user }: { user: UserInfo | null }) => {
      if (!user) {
        throw new AuthError('Not authenticated');
      }

      const itemsPerPage = getConfig('example.itemsPerPage') as number;
      const exampleItems = await dbExampleItems.fetch({
        userId: new ObjectId(user.id),
      }, { limit: itemsPerPage })
      return exampleItems.map((item) => ({
        _id: item._id.toString(),
        title: item.title,
        createdAt: item.createdAt,
      }));
    }
  },

  mutations: {
    createItem: async (args: unknown, { user }: { user: UserInfo | null }) => {
      if (!user) {
        throw new AuthError('Not authenticated');
      }

      const { title } = z.object({ title: z.string() }).parse(args);

      await dbExampleItems.insertOne({ title, createdAt: new Date(), userId: new ObjectId(user.id) });
    },

    updateItem: async (args: unknown, { user }: { user: UserInfo | null }) => {
      if (!user) {
        throw new AuthError('Not authenticated');
      }

      const { itemId, title } = z.object({ itemId: z.string(), title: z.string() }).parse(args);

      const exampleItem = await dbExampleItems.requireOne({ _id: new ObjectId(itemId) });
      if (exampleItem.userId.toString() !== user.id) {
        throw new AuthError('Not authorized');
      }

      const { modifiedCount } = await dbExampleItems.updateOne({ _id: new ObjectId(itemId) }, { $set: { title } });

      if (modifiedCount === 0) {
        throw new Error('Item not found');
      }
    },
  },

  cronJobs: {
    dailyTest: dailyTestCron
  }
});
