import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { useBountyStore } from '../../stores/bountyStore';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export const BountyOptInModal: React.FC<Props> = ({ visible, onClose }) => {
  const { settings, updateSettings } = useBountyStore();
  const [bountyEnabled, setBountyEnabled] = useState(settings?.bounty_mode_enabled || false);
  const [notifsEnabled, setNotifsEnabled] = useState(settings?.notifications_enabled ?? true);
  const [showPhoto, setShowPhoto] = useState(settings?.show_public_photo ?? true);
  const [allowMostWanted, setAllowMostWanted] = useState(settings?.allow_most_wanted ?? true);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAgreeAndEnable = async () => {
    setError(null);
    const success = await updateSettings({
      bounty_mode_enabled: true,
      notifications_enabled: notifsEnabled,
      show_public_photo: showPhoto,
      allow_most_wanted: allowMostWanted,
      agreed: true,
    });
    if (success) {
      onClose();
    } else {
      setError('Failed to enable Bounty Mode. Make sure an active vehicle is configured.');
    }
  };

  const handleDisable = async () => {
    setError(null);
    const success = await updateSettings({
      bounty_mode_enabled: false,
    });
    if (success) {
      setBountyEnabled(false);
      onClose();
    } else {
      setError('Cannot disable Bounty Mode while locked in an active session.');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <Text style={styles.headerBadge}>APEX UGR // SAFETY AGREEMENT</Text>
          <Text style={styles.title}>BOUNTY MODE</Text>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <ScrollView style={styles.scrollArea}>
            <Text style={styles.description}>
              By participating in Apex Bounty Mode, you voluntarily opt in to random, privacy-safe proximity hunts and agree to the following safety rules:
            </Text>

            <View style={styles.bulletList}>
              <Text style={styles.bullet}>• Follow all applicable traffic laws and posted speed limits</Text>
              <Text style={styles.bullet}>• Drive responsibly and avoid reckless acceleration or maneuvers</Text>
              <Text style={styles.bullet}>• Avoid physical confrontation, stopping, or blocking vehicles</Text>
              <Text style={styles.bullet}>• Never trespass onto private or restricted property</Text>
              <Text style={styles.bullet}>• Interact with Apex controls only when parked or safely stopped</Text>
              <Text style={styles.bullet}>• Follow all official Apex UGR Bounty Rules</Text>
            </View>

            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Bounty Notifications</Text>
              <Switch value={notifsEnabled} onValueChange={setNotifsEnabled} trackColor={{ false: '#333', true: '#00FF66' }} />
            </View>

            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Show Public Vehicle Photo</Text>
              <Switch value={showPhoto} onValueChange={setShowPhoto} trackColor={{ false: '#333', true: '#00FF66' }} />
            </View>

            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Allow Most Wanted Display</Text>
              <Switch value={allowMostWanted} onValueChange={setAllowMostWanted} trackColor={{ false: '#333', true: '#00FF66' }} />
            </View>
          </ScrollView>

          <View style={styles.actionsContainer}>
            {settings?.bounty_mode_enabled ? (
              <TouchableOpacity style={styles.disableButton} onPress={handleDisable}>
                <Text style={styles.disableButtonText}>DISABLE BOUNTY MODE</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.agreeButton} onPress={handleAgreeAndEnable}>
                <Text style={styles.agreeButtonText}>AGREE & ENABLE</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>CANCEL</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#0F131A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,255,102,0.3)',
    padding: 20,
    maxHeight: '85%',
  },
  headerBadge: {
    color: '#00FF66',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 12,
  },
  errorText: {
    color: '#FF3366',
    fontSize: 12,
    marginBottom: 10,
  },
  scrollArea: {
    marginBottom: 16,
  },
  description: {
    color: '#A0A8B0',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  bulletList: {
    marginBottom: 16,
    gap: 6,
  },
  bullet: {
    color: '#D0D8E0',
    fontSize: 12,
    lineHeight: 16,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  settingLabel: {
    color: '#E0E8F0',
    fontSize: 13,
    fontWeight: '600',
  },
  actionsContainer: {
    gap: 10,
  },
  agreeButton: {
    backgroundColor: '#00FF66',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  agreeButtonText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
  disableButton: {
    backgroundColor: '#FF3366',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  disableButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#A0A8B0',
    fontSize: 13,
    fontWeight: '700',
  },
});
