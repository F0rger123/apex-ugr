import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { UserVehicle } from '../../types/database.types';
import { GlassCard } from '../common/GlassCard';
import { MatrixBadge } from '../common/MatrixBadge';
import { colors } from '../../config/colors';
import { ShieldCheck, Zap, Gauge, Flame } from 'lucide-react-native';

interface VehicleCardProps {
  vehicle: UserVehicle;
  totalBuildValue?: number;
  onPress?: () => void;
  onPlaySound?: () => void;
}

export const VehicleCard: React.FC<VehicleCardProps> = ({
  vehicle,
  totalBuildValue = 0,
  onPress,
  onPlaySound,
}) => {
  const photoUrl = vehicle.photos[0] || 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?q=80&w=800&auto=format&fit=crop';

  return (
    <GlassCard activeGlow={vehicle.is_primary} onPress={onPress} style={styles.cardContainer}>
      {/* Vehicle Hero Image */}
      <View style={styles.imageContainer}>
        <Image source={{ uri: photoUrl }} style={styles.image} resizeMode="cover" />
        <View style={styles.imageOverlay}>
          {vehicle.is_primary && (
            <MatrixBadge label="PRIMARY RIDE" variant="green" style={styles.badgeTopLeft} />
          )}
          <MatrixBadge label={vehicle.drivetrain} variant="silver" style={styles.badgeTopRight} />
        </View>
      </View>

      {/* Vehicle Title & Trim */}
      <View style={styles.detailsHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.yearMakeText}>
            {vehicle.year} {vehicle.make}
          </Text>
          <Text style={styles.modelText}>{vehicle.model} {vehicle.trim ? `• ${vehicle.trim}` : ''}</Text>
          {vehicle.nickname && <Text style={styles.nicknameText}>"{vehicle.nickname}"</Text>}
        </View>
        {onPlaySound && (
          <TouchableOpacity style={styles.soundBtn} onPress={onPlaySound}>
            <Flame size={16} color={colors.primary} />
            <Text style={styles.soundText}>REV</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Specs Grid */}
      <View style={styles.specsGrid}>
        <View style={styles.specBox}>
          <Text style={styles.specLabel}>HORSEPOWER</Text>
          <Text style={styles.specValGreen}>{vehicle.horsepower} WHP</Text>
        </View>
        <View style={styles.specBox}>
          <Text style={styles.specLabel}>TORQUE</Text>
          <Text style={styles.specVal}>{vehicle.torque} LB-FT</Text>
        </View>
        <View style={styles.specBox}>
          <Text style={styles.specLabel}>0-60 MPH</Text>
          <Text style={styles.specValGreen}>{vehicle.zero_to_sixty_sec || '2.0'}s</Text>
        </View>
        <View style={styles.specBox}>
          <Text style={styles.specLabel}>TOP SPEED</Text>
          <Text style={styles.specVal}>{vehicle.top_speed_mph} MPH</Text>
        </View>
      </View>

      {/* Footer Info */}
      <View style={styles.footerRow}>
        <Text style={styles.engineText}>{vehicle.engine}</Text>
        {totalBuildValue > 0 && (
          <Text style={styles.buildValText}>
            MOD INVESTED: <Text style={{ color: colors.primary }}>${totalBuildValue.toLocaleString()}</Text>
          </Text>
        )}
      </View>
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    padding: 0,
    marginBottom: 16,
  },
  imageContainer: {
    height: 190,
    width: '100%',
    backgroundColor: colors.surface,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  badgeTopLeft: {},
  badgeTopRight: {},
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    paddingBottom: 8,
  },
  yearMakeText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  modelText: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
    marginTop: 2,
  },
  nicknameText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
    fontStyle: 'italic',
    marginTop: 2,
  },
  soundBtn: {
    backgroundColor: 'rgba(0, 255, 102, 0.12)',
    borderColor: 'rgba(0, 255, 102, 0.4)',
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  soundText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '900',
    marginLeft: 4,
  },
  specsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: 12,
    marginHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  specBox: {
    alignItems: 'center',
    flex: 1,
  },
  specLabel: {
    color: colors.textMuted,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  specVal: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
    marginTop: 2,
  },
  specValGreen: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '900',
    marginTop: 2,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 10,
  },
  engineText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
  },
  buildValText: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '800',
  },
});
