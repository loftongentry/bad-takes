import { Text, View, Button } from "tamagui"
import { ArrowLeft } from '@tamagui/lucide-icons'
import { COLORS } from "./theme"

function BackIconButton({ onPress }: { onPress?: () => void }) {
  return (
    <Button
      bordered
      onPress={onPress}
      style={{
        height: 30,
        width: 30,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 0,
      }}
      icon={<ArrowLeft color={'#D0CCC3'} size={18} />}
    />
  )
}

export function Page({
  title,
  subtitle,
  showBack = true,
  onBack,
  children,
}: {
  title: string
  subtitle?: string
  showBack?: boolean
  onBack?: () => void
  children: React.ReactNode
}) {
  return (
    <View
      style={{
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 40,
        alignItems: 'center',
        marginTop: 20,
      }}
    >
      <View
        style={{
          width: '100%',
          maxWidth: 340,
          alignSelf: 'center',
          flexDirection: 'row',
          alignItems: 'center',
          marginTop: 10,
          marginBottom: 20,
        }}
      >
        {showBack ? <BackIconButton onPress={onBack} /> : null}
        <View style={{ flex: 1 }} />
      </View>

      <Text
        style={{
          color: COLORS.text,
          fontSize: 44,
          fontWeight: '900',
          letterSpacing: -0.5,
          marginBottom: 20,
        }}
      >
        {title}
      </Text>
      {subtitle && (
        <Text
          style={{
            color: COLORS.text,
            fontSize: 16,
            fontWeight: '700',
            opacity: 0.85,
            marginTop: -10,
            marginBottom: 16,
            textAlign: 'center',
          }}
        >
          {subtitle}
        </Text>
      )}
      {children}
    </View>
  )
}