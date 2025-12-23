import { Button, Text, View } from 'tamagui'
import { Minus, Plus } from '@tamagui/lucide-icons'
import { COLORS } from './theme'
import { FormRow } from './FormRow'

export function StepperRow({
  label,
  valueText,
  onDecrement,
  onIncrement,
  decrementDisabled,
  incrementDisabled,
  showDivider = true,
}: {
  label: string
  valueText: string
  onDecrement: () => void
  onIncrement: () => void
  decrementDisabled?: boolean
  incrementDisabled?: boolean
  showDivider?: boolean
}) {
  return (
    <FormRow
      label={label}
      showDivider={showDivider}
      right={
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Button
            bordered
            disabled={decrementDisabled}
            onPress={onDecrement}
            style={{
              height: 34,
              width: 44,
              borderRadius: 12,
              justifyContent: 'center',
              alignItems: 'center',
              opacity: decrementDisabled ? 0.35 : 1,
            }}
            icon={<Minus color={'#D0CCC3'} />}
          />
          <Text
            style={{
              color: COLORS.text,
              fontSize: 16,
              fontWeight: '800',
              minWidth: 92,
              textAlign: 'center',
            }}
          >
            {valueText}
          </Text>
          <Button
            bordered
            disabled={incrementDisabled}
            onPress={onIncrement}
            style={{
              height: 34,
              width: 44,
              borderRadius: 12,
              justifyContent: 'center',
              alignItems: 'center',
              opacity: incrementDisabled ? 0.35 : 1,
            }}
            icon={<Plus color={'#D0CCC3'} />}
          />
        </View>
      }
    />
  )
}
