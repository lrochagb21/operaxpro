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

const S = {background:'#162040',border:'1px solid rgba(96,165,250,0.13)',color:'#EEF2FF',borderRadius:10,padding:'10px 14px',fontSize:14,fontFamily:'inherit',outline:'none',width:'100%'}
const SERVICOS = ['Instalação','Manutenção Preventiva','Manutenção Corretiva','Reparo','Vistoria','Suporte Técnico','Outro']

export default function TecnicoView() {
  const [user, setUser]         = useState(null)
  const [os, setOs]             = useState([])
  const [clientes, setClientes] = useState([])
  const [agenda, setAgenda]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [tab, setTab]           = useState('hoje')
  const [modalOS, setModalOS]   = useState(null)
  const [modalOrc, setModalOrc] = useState(false)
  const [saving, setSaving]     = useState(false)
  const [msg, setMsg]           = useState({text:'',type:''})
  const emptyOrc = {cliente_id:'',tipo_servico:'',descricao:'',valor:'',desconto:'',pecas:'',observacoes:'',data_abertura:'',hora_atendimento:''}
  const [formOrc, setFormOrc]   = useState(emptyOrc)
  const router = useRouter()

  useEffect(() => { checkAuth() }, [])

  async function checkAuth() {
    const { data:{session} } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    const { data:perfil } = await supabase.from('usuarios').select('*').eq('auth_id',session.user.id).single()
    if (!perfil) { router.push('/login'); return }
    if (perfil.perfil === 'admin' || perfil.perfil === 'superadmin') { router.push('/dashboard'); return }
    setUser(perfil)
    loadData(perfil.id)
  }

  async function loadData(tecId) {
    const hoje = new Date().toISOString().split('T')[0]
    const [osRes, agRes, cliRes] = await Promise.all([
      supabase.from('ordens_servico').select('*,clientes(nome,telefone,logradouro,numero,bairro,cidade,estado,referencia)').eq('tecnico_id',tecId).order('criado_em',{ascending:false}),
      supabase.from('agenda').select('*,clientes(nome,telefone,logradouro,numero,bairro,cidade)').eq('tecnico_id',tecId).gte('data',hoje).order('data').order('hora_inicio'),
      supabase.from('clientes').select('id,nome,telefone').order('nome'),
    ])
    setOs(osRes.data||[])
    setAgenda(agRes.data||[])
    setClientes(cliRes.data||[])
    setLoading(false)
  }

  async function updateOsStatus(id, status) {
    await supabase.from('ordens_servico').update({status,...(status==='Concluída'?{data_conclusao:new Date().toISOString().split('T')[0]}:{})}).eq('id',id)
    showMsg('Status atualizado!','ok')
    if(modalOS) setModalOS(p=>({...p,status}))
    const {data:perfil} = await supabase.from('usuarios').select('id').eq('auth_id',(await supabase.auth.getSession()).data.session.user.id).single()
    loadData(perfil.id)
  }

  async function criarOrcamento(e) {
    e.preventDefault()
    if (!formOrc.cliente_id) { showMsg('Selecione o cliente','err'); return }
    if (!formOrc.descricao.trim()) { showMsg('Descreva o servico','err'); return }
    setSaving(true)
    const { error } = await supabase.from('ordens_servico').insert({
      ...formOrc,
      tipo: 'ORC',
      status: 'Aberta',
      prioridade: 'Normal',
      empresa_id: 1,
      tecnico_id: user.id,
      valor: parseFloat(formOrc.valor)||0,
      desconto: parseFloat(formOrc.desconto)||0,
      data_abertura: formOrc.data_abertura || new Date().toISOString().split('T')[0],
      hora_atendimento: formOrc.hora_atendimento || null,
    })
    if (error) showMsg('Erro: '+error.message,'err')
    else {
      showMsg('Orcamento criado! O admin sera notificado.','ok')
      setFormOrc(emptyOrc)
      setModalOrc(false)
      const {data:perfil} = await supabase.from('usuarios').select('id').eq('auth_id',(await supabase.auth.getSession()).data.session.user.id).single()
      loadData(perfil.id)
    }
    setSaving(false)
  }

  async function logout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  function showMsg(text,type) { setMsg({text,type}); setTimeout(()=>setMsg({text:'',type:''}),4000) }
  function fo(k,v) { setFormOrc(p=>({...p,[k]:v})) }

  const hoje = new Date().toISOString().split('T')[0]
  const agHoje = agenda.filter(a=>a.data===hoje)
  const osAbertas = os.filter(o=>o.status==='Aberta'||o.status==='Em Andamento')

  if (loading) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#0B1120'}}>
      <div style={{fontSize:13,color:'#3D5070',fontWeight:600}}>Carregando...</div>
    </div>
  )

  return (
    <div style={{minHeight:'100vh',background:'#0B1120',fontFamily:'Plus Jakarta Sans,sans-serif',color:'#EEF2FF'}}>

      {/* Header */}
      <div style={{background:'#0F1729',borderBottom:'1px solid rgba(96,165,250,0.07)',padding:'14px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:10}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:34,height:34,background:'#1A56DB',borderRadius:9,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 0 12px rgba(26,86,219,.4)'}}>
            <svg width="18" height="18" viewBox="0 0 28 28" fill="none">
              <rect x="3" y="3" width="10" height="10" rx="2.5" fill="white"/>
              <rect x="15" y="3" width="10" height="10" rx="2.5" fill="white" opacity="0.5"/>
              <rect x="3" y="15" width="10" height="10" rx="2.5" fill="white" opacity="0.5"/>
              <path d="M15 20.5L18.5 24.5L25 16" stroke="white" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <div style={{fontSize:14,fontWeight:800,color:'#EEF2FF',letterSpacing:'-0.3px'}}>OperaxPro</div>
            <div style={{fontSize:11,color:'#3D5070'}}>👷 {user?.nome}</div>
          </div>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button onClick={()=>setModalOrc(true)} style={{padding:'7px 14px',borderRadius:8,background:'rgba(6,182,212,.15)',border:'1px solid rgba(6,182,212,.3)',color:'#67E8F9',fontSize:12,fontWeight:700,cursor:'pointer'}}>+ Orçamento</button>
          <button onClick={logout} style={{padding:'7px 14px',borderRadius:8,background:'rgba(239,68,68,.12)',border:'1px solid rgba(239,68,68,.25)',color:'#FCA5A5',fontSize:12,fontWeight:600,cursor:'pointer'}}>Sair</button>
        </div>
      </div>

      <div style={{padding:16,maxWidth:600,margin:'0 auto'}}>

        {msg.text&&<div style={{marginBottom:12,padding:'12px 16px',borderRadius:10,fontSize:13,fontWeight:600,background:msg.type==='ok'?'rgba(16,185,129,.1)':'rgba(239,68,68,.1)',border:msg.type==='ok'?'1px solid rgba(16,185,129,.25)':'1px solid rgba(239,68,68,.25)',color:msg.type==='ok'?'#34D399':'#FCA5A5'}}>{msg.text}</div>}

        {/* Resumo */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:16,marginTop:4}}>
          {[
            {l:'Abertas',v:os.filter(o=>o.status==='Aberta').length,c:'#FCD34D',bg:'rgba(245,158,11,.1)'},
            {l:'Andamento',v:os.filter(o=>o.status==='Em Andamento').length,c:'#93C5FD',bg:'rgba(96,165,250,.1)'},
            {l:'Concluidas',v:os.filter(o=>o.status==='Concluída').length,c:'#34D399',bg:'rgba(16,185,129,.1)'},
            {l:'Hoje',v:agHoje.length,c:'#67E8F9',bg:'rgba(6,182,212,.1)'},
          ].map(({l,v,c,bg})=>(
            <div key={l} style={{background:bg,border:`1px solid ${c}30`,borderRadius:12,padding:'10px 8px',textAlign:'center'}}>
              <div style={{fontSize:20,fontWeight:800,color:c}}>{v}</div>
              <div style={{fontSize:10,color:c,opacity:0.8}}>{l}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{display:'flex',gap:4,marginBottom:14,background:'#162040',borderRadius:10,padding:4}}>
          {[
            {v:'hoje',l:'Hoje'},
            {v:'os',l:`OS (${os.filter(o=>o.tipo==='OS').length})`},
            {v:'orc',l:`Orç (${os.filter(o=>o.tipo==='ORC').length})`},
            {v:'agenda',l:`Agenda (${agenda.length})`},
          ].map(({v,l})=>(
            <button key={v} onClick={()=>setTab(v)} style={{flex:1,padding:'8px 4px',borderRadius:7,border:'none',cursor:'pointer',fontSize:11,fontWeight:700,background:tab===v?'#1A56DB':'transparent',color:tab===v?'#fff':'#8899BB'}}>
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
            {agHoje.length===0?(
              <div style={{textAlign:'center',color:'#3D5070',padding:40,fontSize:14}}>
                <div style={{fontSize:32,marginBottom:8}}>😊</div>
                Sem atendimentos hoje!
              </div>
            ):agHoje.map(a=>(
              <div key={a.id} style={{background:'#0F1729',border:'1px solid rgba(6,182,212,0.2)',borderLeft:'4px solid #06B6D4',borderRadius:'0 12px 12px 0',padding:16,marginBottom:10}}>
                <div style={{fontSize:13,color:'#06B6D4',fontWeight:700,fontFamily:'monospace',marginBottom:6}}>{a.hora_inicio?.slice(0,5)}{a.hora_fim?' — '+a.hora_fim.slice(0,5):''}</div>
                <div style={{fontSize:16,fontWeight:800,color:'#EEF2FF',marginBottom:4}}>{a.clientes?.nome||'—'}</div>
                {a.tipo_servico&&<div style={{fontSize:13,color:'#8899BB',marginBottom:6}}>🔧 {a.tipo_servico}</div>}
                {(a.clientes?.telefone||a.telefone)&&(
                  <a href={'tel:'+(a.clientes?.telefone||a.telefone)} style={{display:'inline-flex',alignItems:'center',gap:6,fontSize:13,color:'#60A5FA',textDecoration:'none',marginBottom:8,padding:'6px 12px',background:'rgba(96,165,250,0.08)',borderRadius:8}}>
                    📞 {a.clientes?.telefone||a.telefone}
                  </a>
                )}
                {(a.clientes?.logradouro||a.endereco)&&(
                  <a href={'https://maps.google.com/?q='+encodeURIComponent([a.clientes?.logradouro,a.clientes?.numero,a.clientes?.bairro,a.clientes?.cidade].filter(Boolean).join(', ')||a.endereco||'')}
                    target="_blank" rel="noreferrer"
                    style={{display:'flex',alignItems:'center',gap:6,fontSize:12,color:'#67E8F9',textDecoration:'none',background:'rgba(6,182,212,0.08)',padding:'8px 12px',borderRadius:8}}>
                    📍 Ver no Maps
                  </a>
                )}
              </div>
            ))}
          </div>
        )}

        {/* MINHAS OS */}
        {tab==='os'&&(
          <div>
            {os.filter(o=>o.tipo==='OS').length===0?(
              <div style={{textAlign:'center',color:'#3D5070',padding:40,fontSize:14}}>Nenhuma OS atribuida</div>
            ):os.filter(o=>o.tipo==='OS').map(o=>{
              const {bg,color}=stBadge(o.status)
              return(
                <div key={o.id} onClick={()=>setModalOS(o)} style={{background:'#0F1729',border:'1px solid rgba(96,165,250,0.07)',borderRadius:14,padding:16,marginBottom:10,cursor:'pointer'}}
                  onMouseEnter={e=>e.currentTarget.style.borderColor='rgba(96,165,250,0.2)'}
                  onMouseLeave={e=>e.currentTarget.style.borderColor='rgba(96,165,250,0.07)'}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
                    <span style={{fontSize:11,fontFamily:'monospace',color:'#3D5070',fontWeight:700}}>OS #{o.id}</span>
                    <span style={{padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:700,background:bg,color}}>{o.status}</span>
                  </div>
                  <div style={{fontSize:15,fontWeight:800,color:'#EEF2FF',marginBottom:4}}>{o.clientes?.nome||'—'}</div>
                  {o.tipo_servico&&<div style={{fontSize:13,color:'#8899BB',marginBottom:4}}>🔧 {o.tipo_servico}</div>}
                  <div style={{fontSize:12,color:'#8899BB',marginBottom:10,lineHeight:1.5,display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden'}}>{o.descricao}</div>
                  {o.status!=='Concluída'&&o.status!=='Cancelada'&&(
                    <div style={{display:'flex',gap:6}} onClick={e=>e.stopPropagation()}>
                      {o.status==='Aberta'&&(
                        <button onClick={()=>updateOsStatus(o.id,'Em Andamento')} style={{flex:1,padding:'9px',borderRadius:10,background:'rgba(96,165,250,.15)',border:'1px solid rgba(96,165,250,.3)',color:'#93C5FD',fontSize:12,fontWeight:700,cursor:'pointer'}}>▶ Iniciar</button>
                      )}
                      {o.status==='Em Andamento'&&(
                        <button onClick={()=>updateOsStatus(o.id,'Concluída')} style={{flex:1,padding:'9px',borderRadius:10,background:'rgba(16,185,129,.15)',border:'1px solid rgba(16,185,129,.3)',color:'#34D399',fontSize:12,fontWeight:700,cursor:'pointer'}}>✅ Concluir</button>
                      )}
                      {o.status==='Em Andamento'&&(
                        <button onClick={()=>updateOsStatus(o.id,'Aguardando Peça')} style={{flex:1,padding:'9px',borderRadius:10,background:'rgba(139,92,246,.15)',border:'1px solid rgba(139,92,246,.3)',color:'#C4B5FD',fontSize:12,fontWeight:700,cursor:'pointer'}}>⏳ Aguardando Peça</button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* ORCAMENTOS */}
        {tab==='orc'&&(
          <div>
            <div style={{marginBottom:12,display:'flex',justifyContent:'flex-end'}}>
              <button onClick={()=>setModalOrc(true)} style={{padding:'9px 18px',borderRadius:10,background:'rgba(6,182,212,.15)',border:'1px solid rgba(6,182,212,.3)',color:'#67E8F9',fontSize:13,fontWeight:700,cursor:'pointer'}}>+ Novo Orçamento</button>
            </div>
            {os.filter(o=>o.tipo==='ORC').length===0?(
              <div style={{textAlign:'center',color:'#3D5070',padding:40,fontSize:14}}>
                <div style={{fontSize:32,marginBottom:8}}>📋</div>
                Nenhum orçamento criado
              </div>
            ):os.filter(o=>o.tipo==='ORC').map(o=>{
              const {bg,color}=stBadge(o.status)
              return(
                <div key={o.id} style={{background:'#0F1729',border:'1px solid rgba(139,92,246,0.15)',borderLeft:'4px solid #8B5CF6',borderRadius:'0 14px 14px 0',padding:16,marginBottom:10}}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
                    <span style={{fontSize:11,fontFamily:'monospace',color:'#8B5CF6',fontWeight:700}}>ORC #{o.id}</span>
                    <span style={{padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:700,background:bg,color}}>{o.status}</span>
                  </div>
                  <div style={{fontSize:15,fontWeight:800,color:'#EEF2FF',marginBottom:4}}>{o.clientes?.nome||'—'}</div>
                  {o.tipo_servico&&<div style={{fontSize:13,color:'#8899BB',marginBottom:4}}>🔧 {o.tipo_servico}</div>}
                  <div style={{fontSize:12,color:'#8899BB',marginBottom:8,lineHeight:1.5}}>{o.descricao}</div>
                  {o.valor>0&&<div style={{fontSize:14,fontWeight:800,color:'#34D399'}}>R$ {parseFloat(o.valor).toLocaleString('pt-BR',{minimumFractionDigits:2})}</div>}
                </div>
              )
            })}
          </div>
        )}

        {/* AGENDA */}
        {tab==='agenda'&&(
          <div>
            {agenda.length===0?(
              <div style={{textAlign:'center',color:'#3D5070',padding:40,fontSize:14}}>
                <div style={{fontSize:32,marginBottom:8}}>📅</div>
                Nenhum agendamento futuro
              </div>
            ):agenda.map(a=>(
              <div key={a.id} style={{background:'#0F1729',border:'1px solid rgba(96,165,250,0.07)',borderLeft:'4px solid #1A56DB',borderRadius:'0 14px 14px 0',padding:16,marginBottom:10}}>
                <div style={{fontSize:12,color:'#1A56DB',fontWeight:700,fontFamily:'monospace',marginBottom:4}}>
                  {a.data?.split('-').reverse().join('/')} • {a.hora_inicio?.slice(0,5)}{a.hora_fim?' - '+a.hora_fim.slice(0,5):''}
                </div>
                <div style={{fontSize:15,fontWeight:800,color:'#EEF2FF',marginBottom:4}}>{a.clientes?.nome||'—'}</div>
                {a.tipo_servico&&<div style={{fontSize:13,color:'#8899BB',marginBottom:6}}>🔧 {a.tipo_servico}</div>}
                {(a.clientes?.telefone||a.telefone)&&(
                  <a href={'tel:'+(a.clientes?.telefone||a.telefone)} style={{display:'inline-flex',alignItems:'center',gap:6,fontSize:13,color:'#60A5FA',textDecoration:'none',marginBottom:6,padding:'6px 12px',background:'rgba(96,165,250,0.08)',borderRadius:8}}>
                    📞 {a.clientes?.telefone||a.telefone}
                  </a>
                )}
                {(a.clientes?.logradouro||a.endereco)&&(
                  <a href={'https://maps.google.com/?q='+encodeURIComponent([a.clientes?.logradouro,a.clientes?.numero,a.clientes?.bairro,a.clientes?.cidade].filter(Boolean).join(', ')||a.endereco||'')}
                    target="_blank" rel="noreferrer"
                    style={{display:'flex',alignItems:'center',gap:6,fontSize:12,color:'#67E8F9',textDecoration:'none',background:'rgba(6,182,212,0.08)',padding:'8px 12px',borderRadius:8,marginTop:4}}>
                    📍 Ver no Maps
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL DETALHES OS */}
      {modalOS&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.8)',zIndex:500,display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(4px)'}} onClick={()=>setModalOS(null)}>
          <div style={{background:'#0F1729',border:'1px solid rgba(96,165,250,0.2)',borderRadius:20,padding:24,width:500,maxHeight:'90vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16,paddingBottom:14,borderBottom:'1px solid rgba(96,165,250,0.07)'}}>
              <div>
                <div style={{fontSize:11,fontFamily:'monospace',color:'#3D5070',marginBottom:4}}>OS #{modalOS.id}</div>
                <div style={{fontSize:17,fontWeight:800,color:'#EEF2FF'}}>{modalOS.clientes?.nome||'—'}</div>
              </div>
              <button onClick={()=>setModalOS(null)} style={{background:'rgba(96,165,250,0.1)',border:'1px solid rgba(96,165,250,0.2)',color:'#8899BB',fontSize:18,cursor:'pointer',borderRadius:8,width:32,height:32,display:'flex',alignItems:'center',justifyContent:'center'}}>x</button>
            </div>

            {modalOS.tipo_servico&&<div style={{fontSize:14,color:'#8899BB',marginBottom:12}}>🔧 {modalOS.tipo_servico}</div>}

            <div style={{background:'rgba(26,86,219,0.08)',border:'1px solid rgba(26,86,219,0.2)',borderRadius:12,padding:14,marginBottom:14}}>
              <div style={{fontSize:10,fontWeight:700,color:'#60A5FA',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:6}}>Descrição</div>
              <div style={{fontSize:13,color:'#EEF2FF',lineHeight:1.6}}>{modalOS.descricao}</div>
            </div>

            {modalOS.pecas&&(
              <div style={{background:'rgba(96,165,250,0.05)',borderRadius:12,padding:14,marginBottom:14}}>
                <div style={{fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:6}}>Peças / Materiais</div>
                <div style={{fontSize:13,color:'#8899BB'}}>{modalOS.pecas}</div>
              </div>
            )}

            {modalOS.clientes?.telefone&&(
              <a href={'tel:'+modalOS.clientes.telefone} style={{display:'flex',alignItems:'center',gap:8,padding:'11px 14px',background:'rgba(96,165,250,0.08)',borderRadius:10,color:'#60A5FA',textDecoration:'none',fontSize:13,fontWeight:600,marginBottom:10}}>
                📞 {modalOS.clientes.telefone}
              </a>
            )}

            {modalOS.clientes?.logradouro&&(
              <a href={'https://maps.google.com/?q='+encodeURIComponent([modalOS.clientes.logradouro,modalOS.clientes.numero,modalOS.clientes.bairro,modalOS.clientes.cidade].filter(Boolean).join(', '))}
                target="_blank" rel="noreferrer"
                style={{display:'flex',alignItems:'center',gap:8,padding:'11px 14px',background:'rgba(6,182,212,0.08)',borderRadius:10,color:'#67E8F9',textDecoration:'none',fontSize:13,fontWeight:600,marginBottom:14}}>
                📍 {modalOS.clientes.logradouro}{modalOS.clientes.numero?', '+modalOS.clientes.numero:''} — Ver no Maps
              </a>
            )}

            {modalOS.clientes?.referencia&&(
              <div style={{background:'rgba(245,158,11,0.08)',border:'1px solid rgba(245,158,11,0.2)',borderRadius:10,padding:12,marginBottom:14}}>
                <div style={{fontSize:10,fontWeight:700,color:'#FCD34D',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:4}}>Ponto de Referência</div>
                <div style={{fontSize:13,color:'#EEF2FF'}}>{modalOS.clientes.referencia}</div>
              </div>
            )}

            {modalOS.status!=='Concluída'&&modalOS.status!=='Cancelada'&&(
              <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                {modalOS.status==='Aberta'&&(
                  <button onClick={()=>updateOsStatus(modalOS.id,'Em Andamento')} style={{flex:1,padding:'11px',borderRadius:10,background:'rgba(96,165,250,.15)',border:'1px solid rgba(96,165,250,.3)',color:'#93C5FD',fontSize:13,fontWeight:700,cursor:'pointer'}}>▶ Iniciar Atendimento</button>
                )}
                {modalOS.status==='Em Andamento'&&(
                  <>
                    <button onClick={()=>updateOsStatus(modalOS.id,'Concluída')} style={{flex:1,padding:'11px',borderRadius:10,background:'rgba(16,185,129,.15)',border:'1px solid rgba(16,185,129,.3)',color:'#34D399',fontSize:13,fontWeight:700,cursor:'pointer'}}>✅ Concluir OS</button>
                    <button onClick={()=>updateOsStatus(modalOS.id,'Aguardando Peça')} style={{flex:1,padding:'11px',borderRadius:10,background:'rgba(139,92,246,.15)',border:'1px solid rgba(139,92,246,.3)',color:'#C4B5FD',fontSize:13,fontWeight:700,cursor:'pointer'}}>⏳ Aguardando Peça</button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL NOVO ORCAMENTO */}
      {modalOrc&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.8)',zIndex:500,display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(4px)'}} onClick={()=>setModalOrc(false)}>
          <div style={{background:'#0F1729',border:'1px solid rgba(96,165,250,0.2)',borderRadius:20,padding:24,width:520,maxHeight:'90vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18}}>
              <span style={{fontSize:16,fontWeight:800,color:'#EEF2FF'}}>Novo Orçamento</span>
              <button onClick={()=>setModalOrc(false)} style={{background:'rgba(96,165,250,0.1)',border:'1px solid rgba(96,165,250,0.2)',color:'#8899BB',fontSize:18,cursor:'pointer',borderRadius:8,width:32,height:32,display:'flex',alignItems:'center',justifyContent:'center'}}>x</button>
            </div>
            <form onSubmit={criarOrcamento}>
              <div style={{display:'flex',flexDirection:'column',gap:12}}>
                <div>
                  <label style={{display:'block',fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:6}}>Cliente *</label>
                  <select value={formOrc.cliente_id} onChange={e=>fo('cliente_id',e.target.value)} style={{...S,appearance:'none',cursor:'pointer'}}>
                    <option value="">Selecione o cliente...</option>
                    {clientes.map(c=><option key={c.id} value={c.id}>{c.nome}{c.telefone?' — '+c.telefone:''}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{display:'block',fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:6}}>Tipo de Serviço</label>
                  <select value={formOrc.tipo_servico} onChange={e=>fo('tipo_servico',e.target.value)} style={{...S,appearance:'none',cursor:'pointer'}}>
                    <option value="">Selecione...</option>
                    {SERVICOS.map(s=><option key={s}>{s}</option>)}
                  </select>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                  <div>
                    <label style={{display:'block',fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:6}}>Data</label>
                    <input type="date" value={formOrc.data_abertura} onChange={e=>fo('data_abertura',e.target.value)} style={S}/>
                  </div>
                  <div>
                    <label style={{display:'block',fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:6}}>Hora</label>
                    <select value={formOrc.hora_atendimento} onChange={e=>fo('hora_atendimento',e.target.value)} style={{...S,appearance:'none',cursor:'pointer'}}>
                      <option value="">Sem horário</option>
                      {['06:00','06:30','07:00','07:30','08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00','18:30','19:00','19:30','20:00'].map(h=><option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label style={{display:'block',fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:6}}>Descrição do Serviço *</label>
                  <textarea required placeholder="Descreva o serviço a ser realizado..." value={formOrc.descricao} onChange={e=>fo('descricao',e.target.value)} style={{...S,minHeight:80,resize:'vertical'}}/>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                  <div>
                    <label style={{display:'block',fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:6}}>Valor (R$)</label>
                    <input type="number" step="0.01" min="0" placeholder="0,00" value={formOrc.valor} onChange={e=>fo('valor',e.target.value)} style={S}/>
                  </div>
                  <div>
                    <label style={{display:'block',fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:6}}>Desconto (R$)</label>
                    <input type="number" step="0.01" min="0" placeholder="0,00" value={formOrc.desconto} onChange={e=>fo('desconto',e.target.value)} style={S}/>
                  </div>
                </div>
                <div>
                  <label style={{display:'block',fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:6}}>Peças / Materiais</label>
                  <textarea placeholder="Liste as peças necessárias..." value={formOrc.pecas} onChange={e=>fo('pecas',e.target.value)} style={{...S,minHeight:60,resize:'vertical'}}/>
                </div>
                <div>
                  <label style={{display:'block',fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:6}}>Observações</label>
                  <textarea placeholder="Informações adicionais..." value={formOrc.observacoes} onChange={e=>fo('observacoes',e.target.value)} style={{...S,minHeight:60,resize:'vertical'}}/>
                </div>
              </div>
              <div style={{display:'flex',gap:10,justifyContent:'flex-end',marginTop:16}}>
                <button type="button" onClick={()=>setModalOrc(false)} style={{padding:'10px 20px',borderRadius:10,background:'#162040',border:'1px solid rgba(96,165,250,0.13)',color:'#8899BB',fontSize:13,fontWeight:600,cursor:'pointer'}}>Cancelar</button>
                <button type="submit" disabled={saving} style={{padding:'10px 24px',borderRadius:10,background:'#06B6D4',border:'none',color:'#000',fontSize:13,fontWeight:800,cursor:'pointer',opacity:saving?0.6:1}}>
                  {saving?'Enviando...':'Enviar Orçamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
