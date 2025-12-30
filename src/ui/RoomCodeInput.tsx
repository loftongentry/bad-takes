import { useMemo, useRef } from 'react'
import { Pressable, TextInput, View } from 'react-native'
import { Text } from 'tamagui'
import { COLORS } from './theme'

export function RoomCodeInput({
  value,
  onChange,
}: {
  value: string
  onChange: (next: string) => void
}) {
  const inputRef = useRef<TextInput>(null)

  const sanitized = useMemo(() => {
    return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5)
  }, [value])

  // Keep parent state normalized
  if (sanitized !== value) {
    onChange(sanitized)
  }

  const boxes = Array.from({ length: 5 }).map((_, i) => sanitized[i] ?? '')
  const isComplete = sanitized.length === 5

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
          onChangeText={onChange}
          autoCapitalize="characters"
          autoCorrect={false}
          keyboardType="default"
          textContentType="oneTimeCode"
          maxLength={5}
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