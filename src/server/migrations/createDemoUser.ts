import { dbUsers } from 'modelence/server';
import bcrypt from 'bcrypt';

export async function createDemoUser() {
  const hash = await bcrypt.hash('12345678', 10);

  const email = 'demo@modelence.dev';
  await dbUsers.insertOne({
    handle: email,
    status: 'active',
    emails: [{
      address: email,
      verified: true,
    }],
    createdAt: new Date(),
    authMethods: {
      password: {
        hash,
      },
    },
  });
}
