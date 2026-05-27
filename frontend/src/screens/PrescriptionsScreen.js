import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { getByElderly } from '../api/prescriptions';
import { useSilentPolling } from '../utils/useSilentPolling';

export default function PrescriptionsScreen({ navigation }) {
  const { user } = useAuth();
  const [list, setList] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async ({ silent } = {}) => {
    if (!user?.id) return;
    try {
      const res = await getByElderly(user.id);
      setList(res.data?.data || []);
    } catch (e) {
      if (!silent) console.warn(e);
    }
  };

  useEffect(() => {
    load();
  }, [user?.id]);

  useSilentPolling(load, [user?.id], 3000, false);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Đơn thuốc</Text>
      </View>
      <FlatList
        data={list}
        keyExtractor={(item) => String(item.id)}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={async () => {
            setRefreshing(true);
            await load();
            setRefreshing(false);
          }} />
        }
        ListEmptyComponent={<Text style={styles.empty}>Chưa có đơn thuốc</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.item}
            onPress={() => navigation.navigate('PrescriptionDetail', { id: item.id })}
          >
            <Text style={styles.itemTitle}>{item.title}</Text>
            <Text style={styles.itemSub}>{item.doctorName || 'Không rõ bác sĩ'}</Text>
            {item.medications?.length > 0 && (
              <Text style={styles.itemMed}>
                {item.medications.length} loại thuốc
              </Text>
            )}
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 16,
    backgroundColor: '#0f766e',
  },
  title: {
    fontSize: 20,
    color: '#fff',
    fontWeight: '600',
  },
  empty: {
    padding: 24,
    textAlign: 'center',
    color: '#999',
  },
  item: {
    backgroundColor: '#fff',
    margin: 8,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 8,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  itemSub: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  itemMed: {
    fontSize: 12,
    color: '#0f766e',
    marginTop: 4,
  },
});
