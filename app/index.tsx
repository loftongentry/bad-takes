import { Info } from '@tamagui/lucide-icons'
import { useRouter } from 'expo-router'
import { Button, Card, Separator, Text, View } from 'tamagui'

const TEXT_COLOR = '#D0CCC3'
const SECONDARY_TEXT_COLOR = '#A8A49D'

export default function WelcomeScreen() {
  const router = useRouter()

  return (
    <View
      flex={1}
      alignItems="center"
      justifyContent="center"
      paddingHorizontal="$5"
    >
      <Card
        width="100%"
        maxWidth={320}
        minHeight={340}
        paddingVertical={44}
        paddingHorizontal={28}
        borderRadius={18}
        justifyContent='center'
        alignItems='center'
        bordered
      >
        <Text
          textAlign="center"
          color={TEXT_COLOR}
          fontSize={56}
          fontWeight="900"
          lineHeight={56}
        >
          Bad{'\n'}Takes
        </Text>

        <Text
          textAlign="center"
          color={TEXT_COLOR}
          marginTop="$5"
          opacity={0.85}
          fontSize={16}
        >
          Defend the indefensible.
        </Text>
      </Card>

      <View
        width="100%"
        maxWidth={380}
        marginTop="$6"
        gap="$4"
      >
        <Button
          height={56}
          borderRadius={14}
          bordered
          onPress={() => router.push('/create')}
        >
          <Text color={TEXT_COLOR} fontSize={20} fontWeight="800">
            Create Game
          </Text>
        </Button>

        <Button
          height={56}
          borderRadius={14}
          bordered
          onPress={() => router.push('/join')}
        >
          <Text color={TEXT_COLOR} fontSize={20} fontWeight="800">
            Join Game
          </Text>
        </Button>
        <Separator />
        <Button
          height={58}
          borderRadius={14}
          bordered
          onPress={() => router.push('/how-to-play')}
          icon={<Info color={TEXT_COLOR} size={24} />}
        >
          <Text color={TEXT_COLOR} fontSize={20} fontWeight="800">
            How to Play
          </Text>
        </Button>
      </View>
    </View>
  )
}
