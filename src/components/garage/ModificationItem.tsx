import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { VehicleModification } from '../../types/database.types';
import { MatrixBadge } from '../common/MatrixBadge';
import { colors } from '../../config/colors';
import { Wrench, Trash2, ArrowUpRight } from 'lucide-react-native';

interface ModificationItemProps {
  modification: VehicleModification;
  onDelete?: () => void;
}

export const ModificationItem: React.FC<ModificationItemProps> = ({ modification, onDelete }) => {
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.leftInfo}>
          <MatrixBadge label={modification.category} variant="silver" size="sm" />
          <Text style={styles.brandText}>{modification.brand}</Text>
        </View>
        <Text style={styles.priceText}>${Number(modification.price).toLocaleString()}</Text>
      </View>

      <Text style={styles.partName}>{modification.part_name}</Text>
      {modification.notes && <Text style={styles.notesText}>{modification.notes}</Text>}

      <View style={styles.footerRow}>
        <View style={styles.gainsRow}>
          {modification.hp_gain > 0 && (
            <MatrixBadge label={`+${modification.hp_gain} WHP`} variant="green" size="sm" />
          )}
          {modification.torque_gain > 0 && (
            <MatrixBadge label={`+${modification.torque_gain} TQ`} variant="gold" size="sm" style={{ marginLeft: 6 }} />
          )}
          <Text style={styles.sourceText}>via {modification.purchase_source}</Text>
        </View>

        {onDelete && (
          <TouchableOpacity style={styles.deleteBtn} onPress={onDelete}>
            <Trash2 size={14} color={colors.danger} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    marginLeft: 8,
    letterSpacing: 0.5,
  },
  priceText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '900',
  },
  partName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
    marginTop: 6,
  },
  notesText: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 4,
    fontStyle: 'italic',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  gainsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sourceText: {
    color: colors.textMuted,
    fontSize: 10,
    marginLeft: 8,
  },
  deleteBtn: {
    padding: 4,
  },
});
