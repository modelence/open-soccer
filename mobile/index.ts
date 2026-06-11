import Constants from 'expo-constants';
import { Dimensions, PixelRatio } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { configureClient } from 'modelence/client';

const AUTH_TOKEN_KEY = 'modelence.authToken';

const configuredBaseUrl = Constants.expoConfig?.extra?.modelenceBaseUrl as
  | string
  | undefined;

if (!configuredBaseUrl) {
  throw new Error('Missing "extra.modelenceBaseUrl" in app.json');
}

const baseUrl: string = configuredBaseUrl;

// In-memory cache so the synchronous getAuthToken can serve a value that is
// persisted asynchronously in AsyncStorage. Starts undefined ("not logged in")
// and is rehydrated from storage after registration (see below).
let authToken: string | undefined;

configureClient({
  baseUrl,
  getAuthToken: () => authToken,
  setAuthToken: (token) => {
    authToken = token ?? undefined;

    const write =
      token == null
        ? AsyncStorage.removeItem(AUTH_TOKEN_KEY)
        : AsyncStorage.setItem(AUTH_TOKEN_KEY, token);

    write.catch((error) => {
      console.error('Failed to persist auth token to storage', error);
    });
  },
  getClientInfo: () => ({
    screenWidth: Dimensions.get('screen').width,
    screenHeight: Dimensions.get('screen').height,
    windowWidth: Dimensions.get('window').width,
    windowHeight: Dimensions.get('window').height,
    pixelRatio: PixelRatio.get(),
    orientation: null,
  }),
});

// Rehydrate the persisted auth token in the background. Until this resolves,
// getAuthToken() returns undefined — i.e. "not logged in yet", which is the
// same state as a cold install, so the app renders correctly either way and
// simply picks up the restored session once the read completes.
AsyncStorage.getItem(AUTH_TOKEN_KEY)
  .then((stored) => {
    authToken = stored ?? undefined;
  })
  .catch((error) => {
    console.error('Failed to load auth token from storage', error);
  });
