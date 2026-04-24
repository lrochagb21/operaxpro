'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const stBadge = s => ({
  'Aberta':          {bg:'rgba(245,158,11,.15)',  color:'#FCD34D'},
  'Em Andamento':    {bg:'rgba(96,165,250,.15)',  color:'#93C5FD'},
  'Aguardando Peça': {bg:'rgba(139,92,246,.15)',  color:'#C4B5FD'},
  'Concluída':       {bg:'rgba(16,185,129,.15)',  color:'#34D399'},
  'Cancelada':       {bg:'rgba(239,68,68,.15)',   color:'#FCA5A5'},
}[s] || {bg:'rgba(96,165,250,.15)',color:'#93C5FD'})

export default function TecnicoView() {
  const [user, setUser]       = useState(null)
  const [os, setOs]           = useState([])
  const [agenda, setAgenda]   = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab]         = useState('hoje')
  const router = useRouter()

  useEffect(() => { checkAuth() }, [])

  async function checkAuth() {
    const { data:{ session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    const { data:perfil } = await supabase.from('usuarios').select('*').eq('auth_id',session.user.id).single()
    if (!perfil) { router.push('/login'); return }
    if (perfil.perfil === 'admin' || perfil.perfil === 'superadmin') { router.push('/dashboard'); return }
    setUser(perfil)
    loadData(perfil.id)
  }

  async function loadData(tecId) {
    const hoje = new Date().toISOString().split('T')[0]
    const [osRes, agRes] = await Promise.all([
      supabase.from('ordens_servico').select('*,clientes(nome,telefone,logradouro,numero,bairro,cidade,estado,referencia)').eq('tecnico_id',tecId).order('criado_em',{ascending:false}),
      supabase.from('agenda').select('*,clientes(nome,telefone,logradouro,numero,bairro,cidade)').eq('tecnico_id',tecId).gte('data',hoje).order('data').order('hora_inicio'),
    ])
    setOs(osRes.data||[])
    setAgenda(agRes.data||[])
    setLoading(false)
  }

  async function updateOsStatus(id, status) {
    await supabase.from('ordens_servico').update({status,...(status==='Concluída'?{data_conclusao:new Date().toISOString().split('T')[0]}:{})}).eq('id',id)
    const { data:perfil } = await supabase.from('usuarios').select('id').eq('auth_id',(await supabase.auth.getSession()).data.session.user.id).single()
    loadData(perfil.id)
  }

  async function logout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const hoje = new Date().toISOString().split('T')[0]
  const osHoje = os.filter(o => o.data_abertura === hoje || agenda.some(a => a.os_id === o.id && a.data === hoje))
  const agHoje = agenda.filter(a => a.data === hoje)

  if (loading) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#0B1120'}}>
      <div style={{fontSize:13,color:'#3D5070',fontWeight:600}}>Carregando...</div>
    </div>
  )

  return (
    <div style={{minHeight:'100vh',background:'#0B1120',fontFamily:'Plus Jakarta Sans,sans-serif'}}>
      {/* Header */}
      <div style={{background:'#0F1729',borderBottom:'1px solid rgba(96,165,250,0.07)',padding:'14px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:10}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:34,height:34,background:'#1A56DB',borderRadius:9,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <svg width="18" height="18" viewBox="0 0 28 28" fill="none">
              <rect x="3" y="3" width="10" height="10" rx="2.5" fill="white"/>
              <rect x="15" y="3" width="10" height="10" rx="2.5" fill="white" opacity="0.5"/>
              <rect x="3" y="15" width="10" height="10" rx="2.5" fill="white" opacity="0.5"/>
              <path d="M15 20.5L18.5 24.5L25 16" stroke="white" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <div style={{fontSize:14,fontWeight:800,color:'#EEF2FF'}}>OperaxPro</div>
            <div style={{fontSize:11,color:'#3D5070'}}>👷 {user?.nome}</div>
          </div>
        </div>
        <button onClick={logout} style={{padding:'7px 14px',borderRadius:8,background:'rgba(239,68,68,.12)',border:'1px solid rgba(239,68,68,.25)',color:'#FCA5A5',fontSize:12,fontWeight:600,cursor:'pointer'}}>Sair</button>
      </div>

      <div style={{padding:16,maxWidth:600,margin:'0 auto'}}>
        {/* Resumo */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:16,marginTop:8}}>
          {[
            {l:'Abertas',v:os.filter(o=>o.status==='Aberta').length,c:'#FCD34D',bg:'rgba(245,158,11,.1)'},
            {l:'Andamento',v:os.filter(o=>o.status==='Em Andamento').length,c:'#93C5FD',bg:'rgba(96,165,250,.1)'},
            {l:'Hoje',v:agHoje.length,c:'#67E8F9',bg:'rgba(6,182,212,.1)'},
          ].map(({l,v,c,bg})=>(
            <div key={l} style={{background:bg,border:`1px solid ${c}30`,borderRadius:12,padding:'12px',textAlign:'center'}}>
              <div style={{fontSize:22,fontWeight:800,color:c}}>{v}</div>
              <div style={{fontSize:11,color:c,opacity:0.8}}>{l}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{display:'flex',gap:6,marginBottom:14,background:'#162040',borderRadius:10,padding:4}}>
          {[{v:'hoje',l:'Hoje'},{ v:'os',l:`Minhas OS (${os.length})`},{v:'agenda',l:`Agenda (${agenda.length})`}].map(({v,l})=>(
            <button key={v} onClick={()=>setTab(v)} style={{flex:1,padding:'8px',borderRadius:7,border:'none',cursor:'pointer',fontSize:12,fontWeight:700,background:tab===v?'#1A56DB':'transparent',color:tab===v?'#fff':'#8899BB'}}>
              {l}
            </button>
          ))}
        </div>

        {/* HOJE */}
        {tab==='hoje'&&(
          <div>
            <div style={{fontSize:13,fontWeight:800,color:'#EEF2FF',marginBottom:12}}>
              📅 {new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'})}
            </div>
            {agHoje.length===0&&osHoje.length===0?(
              <div style={{textAlign:'center',color:'#3D5070',padding:40,fontSize:14}}>
                <div style={{fontSize:32,marginBottom:8}}>😊</div>
                Sem atendimentos hoje!
              </div>
            ):(
              <>
                {agHoje.map(a=>(
                  <div key={a.id} style={{background:'#0F1729',border:'1px solid rgba(6,182,212,0.2)',borderLeft:'4px solid #06B6D4',borderRadius:'0 12px 12px 0',padding:16,marginBottom:10}}>
                    <div style={{fontSize:13,color:'#06B6D4',fontWeight:700,fontFamily:'monospace',marginBottom:6}}>{a.hora_inicio?.slice(0,5)}{a.hora_fim?' — '+a.hora_fim.slice(0,5):''}</div>
                    <div style={{fontSize:16,fontWeight:800,color:'#EEF2FF',marginBottom:4}}>{a.clientes?.nome||'—'}</div>
                    {a.tipo_servico&&<div style={{fontSize:13,color:'#8899BB',marginBottom:6}}>🔧 {a.tipo_servico}</div>}
                    {(a.clientes?.telefone||a.telefone)&&(
                      <a href={'tel:'+(a.clientes?.telefone||a.telefone)} style={{display:'inline-flex',alignItems:'center',gap:6,fontSize:13,color:'#60A5FA',textDecoration:'none',marginBottom:6}}>
                        📞 {a.clientes?.telefone||a.telefone}
                      </a>
                    )}
                    {(a.clientes?.logradouro||a.endereco)&&(
                      <a href={'https://maps.google.com/?q='+encodeURIComponent([a.clientes?.logradouro,a.clientes?.numero,a.clientes?.bairro,a.clientes?.cidade].filter(Boolean).join(', ')||a.endereco||'')}
                        target="_blank" rel="noreferrer"
                        style={{display:'flex',alignItems:'center',gap:6,fontSize:12,color:'#67E8F9',textDecoration:'none',background:'rgba(6,182,212,0.08)',padding:'8px 12px',borderRadius:8,marginTop:8}}>
                        📍 {a.clientes?.logradouro||a.endereco} — Ver no Maps
                      </a>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* MINHAS OS */}
        {tab==='os'&&(
          <div>
            {os.length===0?(
              <div style={{textAlign:'center',color:'#3D5070',padding:40,fontSize:14}}>Nenhuma OS atribuida</div>
            ):os.map(o=>{
              const {bg,color}=stBadge(o.status)
              return(
                <div key={o.id} style={{background:'#0F1729',border:'1px solid rgba(96,165,250,0.07)',borderRadius:14,padding:16,marginBottom:10}}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
                    <span style={{fontSize:11,fontFamily:'monospace',color:'#3D5070'}}>#{o.id}</span>
                    <span style={{padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:700,background:bg,color}}>{o.status}</span>
                  </div>
                  <div style={{fontSize:15,fontWeight:800,color:'#EEF2FF',marginBottom:4}}>{o.clientes?.nome||'—'}</div>
                  {o.tipo_servico&&<div style={{fontSize:13,color:'#8899BB',marginBottom:4}}>🔧 {o.tipo_servico}</div>}
                  <div style={{fontSize:13,color:'#8899BB',marginBottom:10,lineHeight:1.5}}>{o.descricao}</div>
                  {(o.clientes?.telefone)&&(
                    <a href={'tel:'+o.clientes.telefone} style={{display:'inline-flex',alignItems:'center',gap:6,fontSize:13,color:'#60A5FA',textDecoration:'none',marginBottom:8}}>
                      📞 {o.clientes.telefone}
                    </a>
                  )}
                  {o.clientes?.logradouro&&(
                    <a href={'https://maps.google.com/?q='+encodeURIComponent([o.clientes.logradouro,o.clientes.numero,o.clientes.bairro,o.clientes.cidade].filter(Boolean).join(', '))}
                      target="_blank" rel="noreferrer"
                      style={{display:'flex',alignItems:'center',gap:6,fontSize:12,color:'#67E8F9',textDecoration:'none',background:'rgba(6,182,212,0.08)',padding:'8px 12px',borderRadius:8,marginBottom:10}}>
                      📍 {o.clientes.logradouro}{o.clientes.numero?', '+o.clientes.numero:''} — Maps
                    </a>
                  )}
                  {/* Botoes de status */}
                  {o.status!=='Concluída'&&o.status!=='Cancelada'&&(
                    <div style={{display:'flex',gap:6,flexWrap:'wrap',marginTop:8}}>
                      {o.status==='Aberta'&&(
                        <button onClick={()=>updateOsStatus(o.id,'Em Andamento')} style={{flex:1,padding:'10px',borderRadius:10,background:'rgba(96,165,250,.15)',border:'1px solid rgba(96,165,250,.3)',color:'#93C5FD',fontSize:13,fontWeight:700,cursor:'pointer'}}>
                          ▶ Iniciar Atendimento
                        </button>
                      )}
                      {o.status==='Em Andamento'&&(
                        <button onClick={()=>updateOsStatus(o.id,'Concluída')} style={{flex:1,padding:'10px',borderRadius:10,background:'rgba(16,185,129,.15)',border:'1px solid rgba(16,185,129,.3)',color:'#34D399',fontSize:13,fontWeight:700,cursor:'pointer'}}>
                          ✅ Concluir OS
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* AGENDA */}
        {tab==='agenda'&&(
          <div>
            {agenda.length===0?(
              <div style={{textAlign:'center',color:'#3D5070',padding:40,fontSize:14}}>Nenhum agendamento futuro</div>
            ):agenda.map(a=>(
              <div key={a.id} style={{background:'#0F1729',border:'1px solid rgba(96,165,250,0.07)',borderLeft:'4px solid #1A56DB',borderRadius:'0 14px 14px 0',padding:16,marginBottom:10}}>
                <div style={{fontSize:12,color:'#1A56DB',fontWeight:700,fontFamily:'monospace',marginBottom:4}}>
                  {a.data?.split('-').reverse().join('/')} • {a.hora_inicio?.slice(0,5)}{a.hora_fim?' - '+a.hora_fim.slice(0,5):''}
                </div>
                <div style={{fontSize:15,fontWeight:800,color:'#EEF2FF',marginBottom:4}}>{a.clientes?.nome||'—'}</div>
                {a.tipo_servico&&<div style={{fontSize:13,color:'#8899BB',marginBottom:6}}>🔧 {a.tipo_servico}</div>}
                {(a.clientes?.telefone||a.telefone)&&(
                  <a href={'tel:'+(a.clientes?.telefone||a.telefone)} style={{display:'inline-flex',alignItems:'center',gap:6,fontSize:13,color:'#60A5FA',textDecoration:'none',marginBottom:6}}>
                    📞 {a.clientes?.telefone||a.telefone}
                  </a>
                )}
                {(a.clientes?.logradouro||a.endereco)&&(
                  <a href={'https://maps.google.com/?q='+encodeURIComponent([a.clientes?.logradouro,a.clientes?.numero,a.clientes?.bairro,a.clientes?.cidade].filter(Boolean).join(', ')||a.endereco||'')}
                    target="_blank" rel="noreferrer"
                    style={{display:'flex',alignItems:'center',gap:6,fontSize:12,color:'#67E8F9',textDecoration:'none',background:'rgba(6,182,212,0.08)',padding:'8px 12px',borderRadius:8,marginTop:6}}>
                    📍 Ver no Maps
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
