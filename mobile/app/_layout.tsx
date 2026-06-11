import '../index';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AppProvider, useSession } from 'modelence/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

function Loading() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color="#6366f1" size="large" />
    </View>
  );
}

function RouteGuard() {
  const { user } = useSession();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const inAuthGroup = segments[0] === '(auth)';
    if (!user && !inAuthGroup) {
      router.replace('/(auth)/sign-in');
    } else if (user && inAuthGroup) {
      router.replace('/(app)/home');
    }
  }, [user, segments]);

  return <Slot />;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <StatusBar style="dark" />
        <AppProvider loadingElement={<Loading />}>
          <QueryClientProvider client={queryClient}>
            <RouteGuard />
          </QueryClientProvider>
        </AppProvider>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f3f4f6' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6' },
});
