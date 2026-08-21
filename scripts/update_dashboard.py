code = open('src/screens/main/DashboardScreen.tsx', 'r').read()

imports = '''import { DailyChestModal } from '../../components/dailyChest/DailyChestModal';
import { CarOfTheWeekModal } from '../../components/cotw/CarOfTheWeekModal';
import { ConvoyRadioHUD } from '../../components/radio/ConvoyRadioHUD';
import { useDailyChestStore } from '../../stores/dailyChestStore';
import { Sparkles, Gift, Award, Settings as SettingsIcon } from 'lucide-react-native';
'''

state_and_modals = '''
  const [showChestModal, setShowChestModal] = useState(false);
  const [showCotwModal, setShowCotwModal] = useState(false);
  const { fetchStatus, available } = useDailyChestStore();

  useEffect(() => {
    fetchStatus();
  }, []);
'''

hud_cards = '''
        {/* Convoy Radio Live Overlay */}
        <ConvoyRadioHUD />

        {/* Quick Expansion Access Bar */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
          <TouchableOpacity
            style={{ flex: 1, backgroundColor: 'rgba(0,255,102,0.1)', borderWidth: 1, borderColor: colors.primary, borderRadius: 8, padding: 10, alignItems: 'center' }}
            onPress={() => setShowChestModal(true)}
          >
            <Gift size={18} color={colors.primary} />
            <Text style={{ color: colors.primary, fontSize: 9, fontWeight: '900', marginTop: 4 }}>DAILY CHEST</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: 10, alignItems: 'center' }}
            onPress={() => navigation.navigate('SeasonHub')}
          >
            <Zap size={18} color={colors.primary} />
            <Text style={{ color: colors.text, fontSize: 9, fontWeight: '900', marginTop: 4 }}>SEASON HUB</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: 10, alignItems: 'center' }}
            onPress={() => setShowCotwModal(true)}
          >
            <Award size={18} color={colors.primary} />
            <Text style={{ color: colors.text, fontSize: 9, fontWeight: '900', marginTop: 4 }}>CAR OF WEEK</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: 10, alignItems: 'center' }}
            onPress={() => navigation.navigate('Settings')}
          >
            <SettingsIcon size={18} color={colors.textMuted} />
            <Text style={{ color: colors.textMuted, fontSize: 9, fontWeight: '900', marginTop: 4 }}>SETTINGS</Text>
          </TouchableOpacity>
        </View>

        <DailyChestModal visible={showChestModal} onClose={() => setShowChestModal(false)} />
        <CarOfTheWeekModal visible={showCotwModal} onClose={() => setShowCotwModal(false)} />
'''

if 'import { DailyChestModal }' not in code:
    code = imports + code
    code = code.replace('export const DashboardScreen = ({ navigation }: any) => {', 'export const DashboardScreen = ({ navigation }: any) => {\n' + state_and_modals)
    target = '<ScrollView style={styles.content} showsVerticalScrollIndicator={false}>'
    code = code.replace(target, target + '\n' + hud_cards)
    open('src/screens/main/DashboardScreen.tsx', 'w').write(code)
    print("DashboardScreen updated with expansion triggers.")
