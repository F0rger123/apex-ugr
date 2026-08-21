code = open('src/screens/main/ProfileScreen.tsx', 'r').read()

imports = '''import { ApexIDModal } from '../../components/profile/ApexIDModal';
import { QrCode, Calendar, Settings as SettingsIcon } from 'lucide-react-native';
'''

state = '''
  const [showApexIdModal, setShowApexIdModal] = useState(false);
'''

buttons = '''
          {/* Expansion Profile Actions */}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
            <TouchableOpacity
              style={{ flex: 1, backgroundColor: 'rgba(0,255,102,0.1)', borderWidth: 1, borderColor: colors.primary, borderRadius: 8, padding: 10, alignItems: 'center' }}
              onPress={() => setShowApexIdModal(true)}
            >
              <QrCode size={18} color={colors.primary} />
              <Text style={{ color: colors.primary, fontSize: 9, fontWeight: '900', marginTop: 4 }}>MY APEX ID QR</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: 10, alignItems: 'center' }}
              onPress={() => navigation.navigate('YearlyRecap')}
            >
              <Calendar size={18} color={colors.primary} />
              <Text style={{ color: colors.text, fontSize: 9, fontWeight: '900', marginTop: 4 }}>RECAP 2026</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: 10, alignItems: 'center' }}
              onPress={() => navigation.navigate('Settings')}
            >
              <SettingsIcon size={18} color={colors.textMuted} />
              <Text style={{ color: colors.textMuted, fontSize: 9, fontWeight: '900', marginTop: 4 }}>SETTINGS</Text>
            </TouchableOpacity>
          </View>

          <ApexIDModal
            visible={showApexIdModal}
            onClose={() => setShowApexIdModal(false)}
            apexId="AK-7F29"
            username={user?.username || 'APEX PILOT'}
          />
'''

if 'ApexIDModal' not in code:
    code = imports + code
    code = code.replace('export const ProfileScreen = ({ navigation }: any) => {', 'export const ProfileScreen = ({ navigation }: any) => {\n' + state)
    target = '<SectionHeader title="BOUNTY NETWORK PERFORMANCE" />'
    code = code.replace(target, buttons + '\n' + target)
    open('src/screens/main/ProfileScreen.tsx', 'w').write(code)
    print("ProfileScreen updated with Apex ID & Recap actions.")
