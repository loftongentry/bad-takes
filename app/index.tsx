import { useRouter } from 'expo-router'
import { Card, Separator, Text, View } from 'tamagui'
import { PrimaryButton } from '../src/ui/PrimaryButton'
import { HowToPlay } from '../src/ui/HowToPlay'
import { COLORS } from '../src/ui/theme'

export default function WelcomeScreen() {
  const router = useRouter()

  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
      }}
    >
      <Card
        style={{
          width: '100%',
          maxWidth: 320,
          minHeight: 340,
          paddingVertical: 44,
          paddingHorizontal: 28,
          borderRadius: 18,
          justifyContent: 'center',
          alignItems: 'center',
        }}
        bordered
      >
        <Text
          style={{
            textAlign: 'center',
            color: COLORS.light,
            fontSize: 56,
            fontWeight: '900',
            lineHeight: 56,
          }}
        >
          Bad{'\n'}Takes
        </Text>

        <Text
          style={{
            textAlign: 'center',
            color: COLORS.light,
            marginTop: 20,
            opacity: 0.85,
            fontSize: 16,
          }}
        >
          Defend the indefensible.
        </Text>
      </Card>

      <View
        style={{
          width: '100%',
          maxWidth: 380,
          marginTop: 24,
          gap: 16,
        }}
      >
        <PrimaryButton
          onPress={() => router.push('/create')}
        >
          Create Game
        </PrimaryButton>

        <PrimaryButton
          onPress={() => router.push('/join')}
        >
          Join Game
        </PrimaryButton>

        <Separator style={{ margin: 10 }} />
        
        <HowToPlay />
      </View>
    </View>
  )
}

