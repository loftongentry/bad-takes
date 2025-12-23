import type { ReactNode } from 'react'
import { Separator, Text, View } from 'tamagui'
import { COLORS } from './theme'

export function FormRow({
  label,
  right,
  showDivider = true,
}: {
  label: string
  right: ReactNode
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

        {right}
      </View>

      {showDivider ? <Separator style={{ opacity: 0.22 }} /> : null}
    </View>
  )
}
