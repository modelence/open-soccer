import { startApp } from 'modelence/server';
import exampleModule from '@/server/example';
import { createDemoUser } from '@/server/migrations/createDemoUser';

startApp({
  modules: [exampleModule /* Add your modules here */],

  security: {
    frameAncestors: ['https://modelence.com', 'https://*.modelence.com', 'http://localhost:*', 'https://*.exp.direct'],
  },

  migrations: [{
    version: 1,
    description: 'Create demo user',
    handler: createDemoUser,
  }],
});
