import { Input, Text, View } from 'tamagui'
import { COLORS } from './theme'

// A centered label above a borderless text input
export const LabeledField = ({
  label,
  value,
  onChangeText,
  placeholder,
  maxLength,
}: {
  label: string
  value: string
  onChangeText: (t: string) => void
  placeholder: string
  maxLength?: number
}) => {
  return (
    <View style={{ width: '100%', maxWidth: 340 }}>
      <Text
        style={{
          color: COLORS.light,
          fontSize: 18,
          fontWeight: '800',
          textAlign: 'center',
          marginBottom: 10,
        }}
      >
        {label}
      </Text>

      <Input
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        maxLength={maxLength}
        placeholderTextColor={COLORS.lightSecondary}
        autoCorrect={false}
        style={{
          width: '100%',
          backgroundColor: 'transparent',
          borderWidth: 0,
          paddingHorizontal: 0,
          paddingVertical: 0,
          color: COLORS.light,
          fontSize: 18,
          fontWeight: '800',
        }}
      />
    </View>
  )
}
