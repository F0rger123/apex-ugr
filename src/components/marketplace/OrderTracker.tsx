import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MarketplaceOrder } from '../../types/database.types';
import { colors } from '../../config/colors';
import { Package, Truck, CheckCircle2, Clock } from 'lucide-react-native';

interface OrderTrackerProps {
  order: MarketplaceOrder;
}

export const OrderTracker: React.FC<OrderTrackerProps> = ({ order }) => {
  const steps = [
    { key: 'processing', label: 'Processing', icon: Clock },
    { key: 'shipped', label: 'Shipped', icon: Package },
    { key: 'in_transit', label: 'In Transit', icon: Truck },
    { key: 'delivered', label: 'Delivered', icon: CheckCircle2 },
  ];

  const getStepIndex = (status: string) => {
    switch (status) {
      case 'processing': return 0;
      case 'shipped': return 1;
      case 'in_transit': return 2;
      case 'delivered': return 3;
      default: return 0;
    }
  };

  const currentStep = getStepIndex(order.shipping_status);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.orderId}>ORDER #{order.id}</Text>
          <Text style={styles.tracking}>TRACKING: {order.tracking_number}</Text>
        </View>
        <Text style={styles.total}>${order.total_amount.toLocaleString()}</Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.timeline}>
        {steps.map((step, idx) => {
          const IconComp = step.icon;
          const isDone = idx <= currentStep;
          const isCurrent = idx === currentStep;

          return (
            <React.Fragment key={step.key}>
              <View style={styles.stepBox}>
                <View
                  style={[
                    styles.iconCircle,
                    isDone ? styles.doneCircle : styles.pendingCircle,
                    isCurrent && styles.currentGlowCircle,
                  ]}
                >
                  <IconComp size={14} color={isDone ? colors.background : colors.textMuted} />
                </View>
                <Text style={[styles.stepLabel, isDone ? styles.doneLabel : styles.pendingLabel]}>
                  {step.label}
                </Text>
              </View>

              {idx < steps.length - 1 && (
                <View
                  style={[
                    styles.line,
                    idx < currentStep ? styles.doneLine : styles.pendingLine,
                  ]}
                />
              )}
            </React.Fragment>
          );
        })}
      </View>

      <Text style={styles.address}>Destination: {order.shipping_address}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  orderId: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  tracking: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '800',
    marginTop: 2,
  },
  total: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
  },
  timeline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 8,
  },
  stepBox: {
    alignItems: 'center',
    flex: 1,
  },
  iconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneCircle: {
    backgroundColor: colors.primary,
  },
  pendingCircle: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  currentGlowCircle: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
  stepLabel: {
    fontSize: 9,
    fontWeight: '800',
    marginTop: 4,
  },
  doneLabel: {
    color: colors.text,
  },
  pendingLabel: {
    color: colors.textMuted,
  },
  line: {
    height: 2,
    flex: 1,
    marginTop: -14,
  },
  doneLine: {
    backgroundColor: colors.primary,
  },
  pendingLine: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  address: {
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 10,
    fontStyle: 'italic',
  },
});
