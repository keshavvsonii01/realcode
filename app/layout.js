import './globals.css'

export const metadata = {
  title: 'CodeSync - Real-Time Collaborative Editor',
  description: 'Code together in real-time with your team',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}