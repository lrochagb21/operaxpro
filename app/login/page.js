'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true); setErro('')
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) { setErro('E-mail ou senha incorretos.'); setLoading(false); return }
    router.push('/dashboard')
  }

  const inputStyle = { width:'100%', background:'#162040', border:'1px solid rgba(96,165,250,0.13)', borderRadius:12, padding:'12px 16px', color:'#EEF2FF', fontSize:14, fontFamily:'inherit', outline:'none' }

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#0B1120',position:'relative',overflow:'hidden'}}>
      <div style={{position:'absolute',inset:0,backgroundImage:'linear-gradient(rgba(26,86,219,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(26,86,219,.05) 1px,transparent 1px)',backgroundSize:'48px 48px'}}/>
      <div style={{position:'absolute',width:600,height:600,left:-200,top:-200,background:'#1A56DB',borderRadius:'50%',filter:'blur(100px)',opacity:.18}}/>
      <div style={{position:'absolute',width:400,height:400,right:-100,bottom:-100,background:'#06B6D4',borderRadius:'50%',filter:'blur(100px)',opacity:.15}}/>
      <div style={{position:'relative',zIndex:1,width:'100%',maxWidth:420,padding:'0 16px'}}>
        <div style={{background:'#0F1729',border:'1px solid rgba(96,165,250,0.15)',borderRadius:22,padding:'40px 40px 36px',boxShadow:'0 25px 50px rgba(0,0,0,.5)'}}>
          <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:4}}>
            <div style={{width:46,height:46,borderRadius:13,background:'#1A56DB',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,boxShadow:'0 0 24px rgba(26,86,219,.5)'}}>
              <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
                <rect x="3" y="3" width="10" height="10" rx="2.5" fill="white"/>
                <rect x="15" y="3" width="10" height="10" rx="2.5" fill="white" opacity="0.5"/>
                <rect x="3" y="15" width="10" height="10" rx="2.5" fill="white" opacity="0.5"/>
                <path d="M15 20.5L18.5 24.5L25 16" stroke="white" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span style={{fontSize:24,fontWeight:800,color:'#EEF2FF',letterSpacing:'-1px'}}>Operax<span style={{color:'#67E8F9',fontWeight:400}}>Pro</span></span>
          </div>
          <p style={{fontSize:13,color:'#3D5070',marginBottom:32,paddingLeft:58}}>Sua equipe, sob controle.</p>
          {erro && <div style={{marginBottom:16,padding:'10px 14px',background:'rgba(239,68,68,.1)',border:'1px solid rgba(239,68,68,.25)',borderRadius:10,color:'#FCA5A5',fontSize:13,fontWeight:600}}>{erro}</div>}
          <form onSubmit={handleLogin}>
            <div style={{marginBottom:16}}>
              <label style={{display:'block',fontSize:11,fontWeight:700,color:'#3D5070',letterSpacing:'1px',textTransform:'uppercase',marginBottom:7}}>E-mail</label>
              <input type="email" required placeholder="seu@email.com" value={email} onChange={e=>setEmail(e.target.value)} style={inputStyle}/>
            </div>
            <div style={{marginBottom:24}}>
              <label style={{display:'block',fontSize:11,fontWeight:700,color:'#3D5070',letterSpacing:'1px',textTransform:'uppercase',marginBottom:7}}>Senha</label>
              <input type="password" required placeholder="••••••••" value={senha} onChange={e=>setSenha(e.target.value)} style={inputStyle}/>
            </div>
            <button type="submit" disabled={loading} style={{width:'100%',padding:'14px',background:'#1A56DB',border:'none',borderRadius:12,color:'#fff',fontSize:15,fontWeight:800,cursor:'pointer',fontFamily:'inherit',boxShadow:'0 4px 20px rgba(26,86,219,.4)',opacity:loading?0.6:1}}>
              {loading ? 'Entrando...' : 'Entrar no OperaxPro'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
