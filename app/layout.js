import './globals.css'
export const metadata = { title: 'OperaxPro', description: 'Sua equipe, sob controle.' }
export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <head><link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet"/></head>
      <body style={{margin:0,background:'#0B1120'}}>{children}</body>
    </html>
  )
}
