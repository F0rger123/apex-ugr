import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ApexHeader } from '../../components/common/ApexHeader';
import { SectionHeader } from '../../components/common/SectionHeader';
import { GlassCard } from '../../components/common/GlassCard';
import { ApexButton } from '../../components/common/ApexButton';
import { colors } from '../../config/colors';
import { supabase } from '../../config/supabase';
import { ShieldAlert, CheckCircle, Ban, AlertTriangle } from 'lucide-react-native';

export const AdminDashboardScreen = ({ navigation }: any) => {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('moderation_reports')
      .select('*, profiles!moderation_reports_reporter_id_fkey(username), reported_profile:profiles!moderation_reports_reported_id_fkey(username)')
      .order('created_at', { ascending: false })
      .limit(20);
      
    if (data) setReports(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleAction = async (reportId: string, status: 'resolved' | 'dismissed') => {
    await supabase.from('moderation_reports').update({ status }).eq('id', reportId);
    fetchReports();
  };

  return (
    <View style={styles.container}>
      <ApexHeader showBack title="APEX ADMIN SYSTEM" onBackPress={() => navigation.goBack()} />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <SectionHeader title="ACTIVE MODERATION QUEUE" />
        
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
        ) : reports.length === 0 ? (
          <GlassCard style={styles.emptyCard}>
            <CheckCircle size={32} color={colors.primary} />
            <Text style={styles.emptyText}>QUEUE CLEAR</Text>
          </GlassCard>
        ) : (
          reports.map((report) => (
            <GlassCard key={report.id} style={styles.reportCard}>
              <View style={styles.reportHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <ShieldAlert size={14} color={report.status === 'pending' ? colors.warning : colors.textMuted} />
                  <Text style={styles.reportType}>{report.report_type.toUpperCase()}</Text>
                </View>
                <Text style={styles.reportStatus}>{report.status.toUpperCase()}</Text>
              </View>

              <Text style={styles.reportReason}>"{report.reason}"</Text>
              
              <View style={styles.usersRow}>
                <Text style={styles.userText}>Reporter: @{report.profiles?.username || 'Unknown'}</Text>
                <Text style={styles.userText}>Target: @{report.reported_profile?.username || 'Unknown'}</Text>
              </View>

              {report.status === 'pending' && (
                <View style={styles.actionsRow}>
                  <ApexButton 
                    title="DISMISS" 
                    variant="outline" 
                    size="sm" 
                    style={{ flex: 1 }} 
                    onPress={() => handleAction(report.id, 'dismissed')} 
                  />
                  <ApexButton 
                    title="BAN USER" 
                    variant="danger" 
                    size="sm" 
                    style={{ flex: 1 }} 
                    icon={<Ban size={14} color={colors.background} />}
                    onPress={() => handleAction(report.id, 'resolved')} 
                  />
                </View>
              )}
            </GlassCard>
          ))
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  emptyCard: { alignItems: 'center', padding: 40, gap: 10 },
  emptyText: { color: colors.primary, fontSize: 16, fontWeight: '900', letterSpacing: 2 },
  reportCard: { marginBottom: 12 },
  reportHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  reportType: { color: colors.warning, fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  reportStatus: { color: colors.textSecondary, fontSize: 10, fontWeight: '800' },
  reportReason: { color: colors.text, fontSize: 14, fontStyle: 'italic', marginBottom: 12 },
  usersRow: { backgroundColor: colors.surface, padding: 10, borderRadius: 8, marginBottom: 12 },
  userText: { color: colors.textMuted, fontSize: 11, marginBottom: 2 },
  actionsRow: { flexDirection: 'row', gap: 10 }
});
