'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const nav = [
  { group:'Principal', items:[
    { href:'/dashboard', icon:'📊', label:'Dashboard' },
    { href:'/agenda',    icon:'📅', label:'Agenda' },
    { href:'/os',        icon:'📋', label:'Ordens de Serviço' },
  ]},
  { group:'Cadastros', items:[
    { href:'/tecnicos',  icon:'👷', label:'Técnicos' },
    { href:'/clientes',  icon:'👥', label:'Clientes' },
  ]},
  { group:'Operacional', items:[
    { href:'/estoque',   icon:'📦', label:'Estoque' },
    { href:'/financeiro',icon:'💰', label:'Financeiro' },
    { href:'/relatorios',icon:'📈', label:'Relatórios' },
  ]},
]

export default function Sidebar({ user }) {
  const path = usePathname()
  const router = useRouter()
  async function logout() {
    await supabase.auth.signOut()
    router.push('/login')
  }
  return (
    <aside style={{width:230,minWidth:230,background:'#0F1729',borderRight:'1px solid rgba(96,165,250,0.07)',display:'flex',flexDirection:'column',height:'100vh'}}>
      <div style={{padding:'20px 16px',borderBottom:'1px solid rgba(96,165,250,0.07)'}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:34,height:34,borderRadius:9,background:'#1A56DB',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 0 14px rgba(26,86,219,.4)'}}>
            <svg width="18" height="18" viewBox="0 0 28 28" fill="none">
              <rect x="3" y="3" width="10" height="10" rx="2.5" fill="white"/>
              <rect x="15" y="3" width="10" height="10" rx="2.5" fill="white" opacity="0.5"/>
              <rect x="3" y="15" width="10" height="10" rx="2.5" fill="white" opacity="0.5"/>
              <path d="M15 20.5L18.5 24.5L25 16" stroke="white" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span style={{fontSize:16,fontWeight:800,color:'#EEF2FF',letterSpacing:'-0.5px'}}>Operax<span style={{color:'#67E8F9',fontWeight:400}}>Pro</span></span>
        </div>
      </div>
      <div style={{flex:1,overflowY:'auto',padding:'14px 10px',display:'flex',flexDirection:'column',gap:20}}>
        {nav.map(g => (
          <div key={g.group}>
            <div style={{fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'1.5px',textTransform:'uppercase',padding:'0 8px',marginBottom:6}}>{g.group}</div>
            {g.items.map(item => {
              const active = path === item.href || path.startsWith(item.href+'/')
              return (
                <Link key={item.href} href={item.href} style={{display:'flex',alignItems:'center',gap:9,padding:'9px 10px',borderRadius:9,marginBottom:2,fontSize:13.5,fontWeight:active?700:500,color:active?'#60A5FA':'#8899BB',background:active?'rgba(26,86,219,0.18)':'transparent',textDecoration:'none',position:'relative',transition:'all .15s'}}>
                  {active && <span style={{position:'absolute',left:0,top:'50%',transform:'translateY(-50%)',width:3,height:18,background:'#1A56DB',borderRadius:'0 2px 2px 0'}}/>}
                  <span style={{fontSize:15,width:18,textAlign:'center'}}>{item.icon}</span>
                  {item.label}
                </Link>
              )
            })}
          </div>
        ))}
      </div>
      <div style={{padding:'14px 10px',borderTop:'1px solid rgba(96,165,250,0.07)'}}>
        <div style={{display:'flex',alignItems:'center',gap:10,padding:'8px 10px',borderRadius:9,marginBottom:4}}>
          <div style={{width:32,height:32,borderRadius:'50%',background:'linear-gradient(135deg,#1A56DB,#06B6D4)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:800,color:'#fff',flexShrink:0}}>
            {user?.email?.[0]?.toUpperCase()||'U'}
          </div>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:'#EEF2FF'}}>{user?.nome||'Usuário'}</div>
            <div style={{fontSize:11,color:'#3D5070'}}>{user?.perfil||'admin'}</div>
          </div>
        </div>
        <button onClick={logout} style={{display:'flex',alignItems:'center',gap:8,width:'100%',padding:'8px 10px',borderRadius:9,fontSize:13,fontWeight:600,color:'#3D5070',background:'transparent',border:'none',cursor:'pointer'}}>
          🚪 Sair do sistema
        </button>
      </div>
    </aside>
  )
}
