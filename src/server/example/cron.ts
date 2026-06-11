import { time } from 'modelence';

export const dailyTestCron = {
  description: 'Daily cron job example',
  interval: time.days(1),
  handler: async () => {
    // This is just an example. Any code written here will run daily.
  },
};
