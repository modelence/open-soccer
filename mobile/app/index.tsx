import { Redirect } from 'expo-router';
import { useSession } from 'modelence/client';

export default function Index() {
  const { user } = useSession();
  return <Redirect href={user ? '/(app)/home' : '/(auth)/sign-in'} />;
}
