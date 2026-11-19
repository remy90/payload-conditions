import type { ReactNode } from 'react'
export const metadata = { title: 'Plan a trip · Payload conditions' }
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  )
}
