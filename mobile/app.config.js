const modelenceBaseUrl =
  process.env.MODELENCE_SITE_URL ?? 'https://localhost:3000';

module.exports = {
  expo: {
    name: 'Modelence Mobile',
    slug: 'modelence-mobile',
    scheme: 'modelence-mobile',
    version: '0.1.0',
    orientation: 'portrait',
    userInterfaceStyle: 'light',
    ios: {
      supportsTablet: true,
    },
    android: {
      adaptiveIcon: {
        backgroundColor: '#ffffff',
      },
    },
    web: {
      bundler: 'metro',
    },
    extra: {
      modelenceBaseUrl,
    },
  },
};
