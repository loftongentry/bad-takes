import { useRef } from 'react'
import { Pressable, TextInput, View } from 'react-native'
import { Text } from 'tamagui'
import { COLORS } from './theme'

const CODE_LENGTH = 5

// Uppercase letters and digits only, at most CODE_LENGTH of them (so a pasted "ab-12-c" works)
const sanitize = (text: string) => text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CODE_LENGTH)

export const RoomCodeInput = ({
  value,
  onChange,
}: {
  value: string
  onChange: (next: string) => void
}) => {
  const inputRef = useRef<TextInput>(null)

  // The parent only ever receives sanitized text (see onChangeText), so this is just a safeguard
  const sanitized = sanitize(value)

  const boxes = Array.from({ length: CODE_LENGTH }).map((_, i) => sanitized[i] ?? '')
  const isComplete = sanitized.length === CODE_LENGTH

  return (
    <Pressable onPress={() => inputRef.current?.focus()} style={{ width: '100%' }}>
      <View style={{ width: '100%', alignItems: 'center' }}>
        {/* Boxes */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 12,
          }}
        >
          {boxes.map((ch, idx) => {
            const isActive = !isComplete && idx === sanitized.length
            return (
              <View
                key={idx}
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: isActive ? COLORS.light : 'rgba(208,204,195,0.35)',
                  backgroundColor: 'rgba(0,0,0,0.15)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text
                  style={{
                    color: COLORS.light,
                    fontSize: 22,
                    fontWeight: '900',
                    letterSpacing: 1,
                  }}
                >
                  {ch}
                </Text>
              </View>
            )
          })}
        </View>

        {/* Hidden input that actually captures typing/paste/backspace */}
        <TextInput
          ref={inputRef}
          value={sanitized}
          onChangeText={(text) => onChange(sanitize(text))}
          autoCapitalize="characters"
          autoCorrect={false}
          keyboardType="default"
          textContentType="oneTimeCode"
          style={{
            position: 'absolute',
            opacity: 0,
            width: 1,
            height: 1,
          }}
        />
      </View>
    </Pressable>
  )
}