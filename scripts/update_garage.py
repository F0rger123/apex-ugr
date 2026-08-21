code = open('src/screens/main/GarageScreen.tsx', 'r').read()

imports = '''import { ApexCameraModal } from '../../components/camera/ApexCameraModal';
import { Camera, QrCode } from 'lucide-react-native';
'''

state = '''
  const [showCameraModal, setShowCameraModal] = useState(false);
'''

action_bar = '''
        {/* Camera & QR Bar */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
          <TouchableOpacity
            style={{ flex: 1, backgroundColor: 'rgba(0,255,102,0.1)', borderWidth: 1, borderColor: colors.primary, borderRadius: 8, padding: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}
            onPress={() => setShowCameraModal(true)}
          >
            <Camera size={16} color={colors.primary} />
            <Text style={{ color: colors.primary, fontSize: 10, fontWeight: '900' }}>APEX CAMERA MODE</Text>
          </TouchableOpacity>
        </View>

        <ApexCameraModal visible={showCameraModal} onClose={() => setShowCameraModal(false)} />
'''

if 'ApexCameraModal' not in code:
    code = imports + code
    code = code.replace('export const GarageScreen = ({ navigation }: any) => {', 'export const GarageScreen = ({ navigation }: any) => {\n' + state)
    target = '<ScrollView style={styles.content} showsVerticalScrollIndicator={false}>'
    code = code.replace(target, target + '\n' + action_bar)
    open('src/screens/main/GarageScreen.tsx', 'w').write(code)
    print("GarageScreen updated with Camera Mode.")
