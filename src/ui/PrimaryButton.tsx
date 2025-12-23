import type { ReactNode } from 'react'
import { Button, Text } from 'tamagui'
import { COLORS } from './theme'

export function PrimaryButton({
  children,
  onPress,
  disabled,
  icon,
  invert,
  height = 56,
}: {
  children: ReactNode
  onPress: () => void
  disabled?: boolean
  icon?: any
  invert?: boolean
  height?: number
}) {
  const bg = invert ? COLORS.text : undefined
  const textColor = invert ? COLORS.dark : COLORS.text
  const opacity = disabled ? 0.45 : 1

  return (
    <Button
      bordered
      disabled={disabled}
      onPress={onPress}
      icon={icon}
      style={{
        height,
        borderRadius: 14,
        backgroundColor: bg,
        opacity,
      }}
    >
      <Text style={{ color: textColor, fontSize: 20, fontWeight: '800' }}>
        {children}
      </Text>
    </Button>
  )
}
