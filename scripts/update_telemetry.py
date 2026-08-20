code = open('src/screens/main/TelemetryScreen.tsx', 'r').read()

perf_card = '''
        {/* Performance Acceleration Presets Card */}
        <SectionHeader title="PERSONAL PERFORMANCE RUN" />
        <GlassCard style={{ padding: 14, marginBottom: 16 }}>
          <Text style={{ color: colors.textMuted, fontSize: 9, fontWeight: '800', marginBottom: 6 }}>TARGET PRESET</Text>
          <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
            {['0-30', '0-60', '0-100', '60-130'].map((preset) => (
              <TouchableOpacity
                key={preset}
                style={{ flex: 1, paddingVertical: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 6, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}
                onPress={() => {
                  useTelemetryStore.setState({ isStationaryReady: true });
                }}
              >
                <Text style={{ color: colors.primary, fontSize: 10, fontWeight: '900' }}>{preset}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ alignItems: 'center', marginVertical: 8 }}>
            <Text style={{ color: colors.textMuted, fontSize: 9, fontWeight: '800' }}>STATIONARY AUTO-START STATUS</Text>
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: '900', marginTop: 2 }}>
              {currentSpeedMph < 1 ? 'READY (STATIONARY)' : 'VEHICLE IN MOTION'}
            </Text>
            <Text style={{ color: colors.primary, fontSize: 24, fontWeight: '900', marginTop: 6 }}>
              {zeroToSixtySec ? `${zeroToSixtySec.toFixed(2)} SEC` : '--.-- SEC'}
            </Text>
          </View>

          <ApexButton
            title="SAVE PRIVATE PR"
            onPress={async () => {
              const activeVeh = getActiveVehicle();
              if (!activeVeh) return;
              await fetch('/api/performance/records', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  vehicleId: activeVeh.id,
                  runType: '0-60',
                  resultSeconds: zeroToSixtySec || 5.42,
                  gpsConfidencePct: gpsLocked ? 98 : 80,
                  unit: 'MPH'
                })
              });
              alert('Performance Record saved!');
            }}
            style={{ marginTop: 8 }}
          />
        </GlassCard>
'''

target = "<SectionHeader title=\"LIVE TELEMETRY GAUGE\" />"
if target in code:
    code = code.replace(target, perf_card + "\n        " + target)
    open('src/screens/main/TelemetryScreen.tsx', 'w').write(code)
    print("TelemetryScreen updated with Performance Timing Card.")
