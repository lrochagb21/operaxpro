'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/layout/Sidebar'

export default function AppLayout({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  useEffect(() => {
    async function check() {
      const { data:{ session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const { data:perfil } = await supabase.from('usuarios').select('nome,perfil,empresa_id').eq('auth_id',session.user.id).single()
      setUser({ ...session.user, ...perfil })
      setLoading(false)
    }
    check()
  }, [router])
  if (loading) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#0B1120'}}>
      <div style={{fontSize:13,color:'#3D5070',fontWeight:600}}>Carregando OperaxPro...</div>
    </div>
  )
  return (
    <div style={{display:'flex',height:'100vh',overflow:'hidden',background:'#0B1120'}}>
      <Sidebar user={user}/>
      <main style={{flex:1,overflowY:'auto'}}>{children}</main>
    </div>
  )
}
