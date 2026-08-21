import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';

interface Props {
  driverName: string;
  rank: string;
  vehicle: {
    year: number;
    make: string;
    model: string;
    color: string;
    trim?: string | null;
    photoUrl?: string | null;
  };
  starLevel: number;
  rewardGc: number;
  remainingTimeStr: string;
  badges?: string[];
}

export const BountyDriverCard: React.FC<Props> = ({
  driverName,
  rank,
  vehicle,
  starLevel,
  rewardGc,
  remainingTimeStr,
  badges = [],
}) => {
  const starsStr = '★'.repeat(starLevel);
  const formattedVehicle = vehicle ? `${(vehicle.color || 'WHITE').toUpperCase()} ${vehicle.year} ${vehicle.make.toUpperCase()} ${vehicle.model.toUpperCase()}${vehicle.trim ? ` ${vehicle.trim.toUpperCase()}` : ''}` : 'TARGET VEHICLE';

  return (
    <View style={styles.cardContainer}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.driverHandle}>{driverName.toUpperCase()}</Text>
          <Text style={styles.rankText}>RANK // {rank.toUpperCase()}</Text>
        </View>
        <View style={styles.starBadge}>
          <Text style={styles.starText}>{starsStr}</Text>
        </View>
      </View>

      {vehicle.photoUrl ? (
        <Image source={{ uri: vehicle.photoUrl }} style={styles.vehicleImage} resizeMode="cover" />
      ) : null}

      <View style={styles.vehicleInfoBox}>
        <Text style={styles.vehicleLabel}>TARGET VEHICLE</Text>
        <Text style={styles.vehicleDetails}>{formattedVehicle}</Text>
      </View>

      <View style={styles.footerRow}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>BOUNTY REWARD</Text>
          <Text style={styles.statValue}>{rewardGc.toLocaleString()} GC</Text>
        </View>

        <View style={styles.statBoxRight}>
          <Text style={styles.statLabel}>TIME REMAINING</Text>
          <Text style={styles.timerValue}>{remainingTimeStr}</Text>
        </View>
      </View>

      {badges.length > 0 ? (
        <View style={styles.badgeRow}>
          {badges.map((b, i) => (
            <View key={i} style={styles.badgeChip}>
              <Text style={styles.badgeChipText}>{b}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#0F131A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,255,102,0.3)',
    padding: 16,
    marginVertical: 8,
    shadowColor: '#00FF66',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  driverHandle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },
  rankText: {
    color: '#00FF66',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  starBadge: {
    backgroundColor: 'rgba(255,204,0,0.15)',
    borderWidth: 1,
    borderColor: '#FFCC00',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  starText: {
    color: '#FFCC00',
    fontSize: 14,
    fontWeight: '900',
  },
  vehicleImage: {
    width: '100%',
    height: 140,
    borderRadius: 10,
    marginBottom: 12,
  },
  vehicleInfoBox: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  vehicleLabel: {
    color: '#808890',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 2,
  },
  vehicleDetails: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statBox: {
    flex: 1,
  },
  statBoxRight: {
    alignItems: 'flex-end',
  },
  statLabel: {
    color: '#808890',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  statValue: {
    color: '#00FF66',
    fontSize: 16,
    fontWeight: '900',
  },
  timerValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  badgeChip: {
    backgroundColor: 'rgba(0,255,102,0.1)',
    borderWidth: 1,
    borderColor: '#00FF66',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeChipText: {
    color: '#00FF66',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
