import type { Metadata } from 'next'
import { Be_Vietnam_Pro } from 'next/font/google'

import AppShell from '@/components/AppShell'
import { Provider } from '@/components/ui/provider'

const sans = Be_Vietnam_Pro({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin', 'vietnamese'],
  display: 'swap',
  variable: '--font-sans'
})

export const metadata: Metadata = {
  title: 'Phiếu công việc',
  description: 'Quản trị danh sách công việc (MantisBT)'
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="vi" className={sans.variable} suppressHydrationWarning>
      <body>
        <Provider>
          <AppShell>{children}</AppShell>
        </Provider>
      </body>
    </html>
  )
}
