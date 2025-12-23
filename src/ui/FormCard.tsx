import type { ReactNode } from 'react'
import { Card } from 'tamagui'

export function FormCard({ children }: { children: ReactNode }) {
  return (
    <Card
      bordered
      style={{
        width: '100%',
        maxWidth: 340,
        borderRadius: 18,
        overflow: 'hidden',
      }}
    >
      {children}
    </Card>
  )
}