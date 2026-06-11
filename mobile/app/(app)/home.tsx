import { StyleSheet, Text, View } from 'react-native';
import { useSession } from 'modelence/client';

export default function HomeScreen() {
  const { user } = useSession();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Home</Text>
      <Text style={styles.subtitle}>Signed in as {user?.email}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, backgroundColor: '#f3f4f6' },
  title: { fontSize: 28, fontWeight: '700', color: '#111827' },
  subtitle: { marginTop: 8, fontSize: 15, color: '#6b7280' },
});
