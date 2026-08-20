import React, { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, RefreshControl } from 'react-native';
import { useBountyStore } from '../../stores/bountyStore';
import { BountySession } from '../../types/database.types';

interface Props {
  navigation?: any;
}

export const MostWantedScreen: React.FC<Props> = ({ navigation }) => {
  const { mostWanted, fetchMostWanted, joinHunt, isLoading } = useBountyStore();

  useEffect(() => {
    fetchMostWanted();
  }, []);

  const handleJoin = async (session: BountySession) => {
    const success = await joinHunt(session.id);
    if (success) {
      navigation?.navigate('BountyHuntScreen');
    }
  };

  const renderItem = ({ item }: { item: BountySession }) => {
    const starsStr = '★'.repeat(item.starLevel || item.star_level);
    const vehicle = item.vehicle;
    const vehicleTitle = vehicle
      ? `${(vehicle.color || 'WHITE').toUpperCase()} ${vehicle.year} ${vehicle.make.toUpperCase()} ${vehicle.model.toUpperCase()}${vehicle.trim ? ` ${vehicle.trim.toUpperCase()}` : ''}`
      : 'TARGET VEHICLE';

    const mins = Math.floor((item.remainingSeconds || 600) / 60);
    const secs = (item.remainingSeconds || 600) % 60;
    const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    return (
      <View style={styles.bountyCard}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.targetUsername}>{(item.targetUsername || 'NIGHTSHIFT').toUpperCase()}</Text>
            <Text style={styles.targetRank}>RANK // {(item.targetRank || 'DIAMOND').toUpperCase()}</Text>
          </View>

          <View style={styles.starsBadge}>
            <Text style={styles.starsText}>{starsStr}</Text>
          </View>
        </View>

        {vehicle?.photoUrl ? (
          <Image source={{ uri: vehicle.photoUrl }} style={styles.vehiclePhoto} resizeMode="cover" />
        ) : null}

        <View style={styles.vehicleBox}>
          <Text style={styles.vehicleText}>{vehicleTitle}</Text>
        </View>

        <View style={styles.statsRow}>
          <View>
            <Text style={styles.statLabel}>BOUNTY REWARD</Text>
            <Text style={styles.rewardText}>{(item.rewardGc || item.reward_gc || 2500).toLocaleString()} GC</Text>
          </View>

          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.statLabel}>TIME REMAINING</Text>
            <Text style={styles.timeText}>{timeStr}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.joinButton} onPress={() => handleJoin(item)}>
          <Text style={styles.joinButtonText}>JOIN HUNT</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.topHeader}>
        <Text style={styles.headerBadge}>APEX NETWORK // HIGH-STAR TARGETS</Text>
        <Text style={styles.headerTitle}>MOST WANTED</Text>
      </View>

      <FlatList
        data={mostWanted}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={fetchMostWanted} tintColor="#00FF66" />
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>NO HIGH-STAR TARGETS ACTIVE</Text>
            <Text style={styles.emptyText}>When eligible drivers reach ★3 or higher, they will appear on the Most Wanted grid.</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0D14',
  },
  topHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerBadge: {
    color: '#00FF66',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1,
  },
  listContent: {
    padding: 16,
    gap: 16,
  },
  bountyCard: {
    backgroundColor: '#0F131A',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,255,102,0.3)',
    padding: 14,
    shadowColor: '#00FF66',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  targetUsername: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  targetRank: {
    color: '#00FF66',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  starsBadge: {
    backgroundColor: 'rgba(255,204,0,0.15)',
    borderWidth: 1,
    borderColor: '#FFCC00',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  starsText: {
    color: '#FFCC00',
    fontSize: 13,
    fontWeight: '900',
  },
  vehiclePhoto: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    marginBottom: 10,
  },
  vehicleBox: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 6,
    padding: 8,
    marginBottom: 10,
  },
  vehicleText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statLabel: {
    color: '#808890',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  rewardText: {
    color: '#00FF66',
    fontSize: 15,
    fontWeight: '900',
  },
  timeText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  joinButton: {
    backgroundColor: '#00FF66',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  joinButtonText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
  },
  emptyBox: {
    padding: 24,
    alignItems: 'center',
  },
  emptyTitle: {
    color: '#00FF66',
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 6,
  },
  emptyText: {
    color: '#808890',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
});
