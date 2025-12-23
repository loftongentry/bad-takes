import { Input, Text, View, Separator } from "tamagui"
import { COLORS } from "./theme"

export function TextFieldRow({
  label,
  value,
  onChangeText,
  placeholder,
  showDivider = true,
}: {
  label: string
  value: string
  onChangeText: (t: string) => void
  placeholder: string
  showDivider?: boolean
}) {
  return (
    <View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: 16,
          paddingHorizontal: 18,
        }}
      >
        <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: '700' }}>
          {label}
        </Text>

        <View style={{ flex: 1, alignItems: 'flex-end', marginLeft: 16 }}>
          <Input
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={COLORS.textSecondary}
            style={{
              width: 170,
              backgroundColor: 'transparent',
              borderWidth: 0,
              paddingHorizontal: 0,
              paddingVertical: 0,
              textAlign: 'right',
              color: COLORS.text,
              fontSize: 16,
              fontWeight: '700',
            }}
          />
        </View>
      </View>

      {showDivider ? <Separator style={{ opacity: 0.22 }} /> : null}
    </View>
  )
}
