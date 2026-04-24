'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import AppLayout from '@/components/layout/AppLayout'

const MESES = ['Janeiro','Fevereiro','Marco','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const DSEM  = ['Dom','Seg','Ter','Qua','Qui','Sex','Sab']
const stBadge = s=>({agendado:{bg:'rgba(245,158,11,.15)',color:'#FCD34D'},confirmado:{bg:'rgba(96,165,250,.15)',color:'#93C5FD'},concluido:{bg:'rgba(16,185,129,.15)',color:'#34D399'},cancelado:{bg:'rgba(239,68,68,.15)',color:'#FCA5A5'}}[s]||{bg:'rgba(96,165,250,.15)',color:'#93C5FD'})
const S = {background:'#162040',border:'1px solid rgba(96,165,250,0.13)',color:'#EEF2FF',borderRadius:10,padding:'10px 14px',fontSize:14,fontFamily:'inherit',outline:'none',width:'100%'}

export default function Agenda() {
  const now = new Date()
  const [ano,setAno]     = useState(now.getFullYear())
  const [mes,setMes]     = useState(now.getMonth())
  const [dia,setDia]     = useState(now.getDate())
  const [ags,setAgs]     = useState([])
  const [clis,setClis]   = useState([])
  const [tecs,setTecs]   = useState([])
  const [loading,setLoading] = useState(true)
  const [modal,setModal] = useState(null)
  const [mForm,setMForm] = useState(false)
  const [saving,setSaving] = useState(false)
  const [msg,setMsg]     = useState({text:'',type:''})
  const ef = {cliente_id:'',tecnico_id:'',data:'',hora_inicio:'',hora_fim:'',tipo_servico:'',endereco:'',telefone:'',observacoes:'',status:'agendado'}
  const [form,setForm]   = useState(ef)

  useEffect(()=>{ load() },[])

  async function load(){
    setLoading(true)
    const [a,c,t] = await Promise.all([
      supabase.from('agenda').select('*,clientes(nome,telefone,logradouro,numero,bairro,cidade,estado),usuarios(nome)').order('data').order('hora_inicio'),
      supabase.from('clientes').select('id,nome,telefone,logradouro,numero,bairro,cidade,estado').order('nome'),
      supabase.from('usuarios').select('id,nome').eq('perfil','tecnico').eq('status','ativo').order('nome'),
    ])
    setAgs(a.data||[]); setClis(c.data||[]); setTecs(t.data||[])
    setLoading(false)
  }

  async function save(e){
    e.preventDefault()
    if(!form.data){showMsg('Informe a data','err');return}
    if(!form.hora_inicio){showMsg('Informe o horario','err');return}
    setSaving(true)
    const {error} = await supabase.from('agenda').insert({
      ...form,
      empresa_id: 1,
      cliente_id: form.cliente_id ? parseInt(form.cliente_id) : null,
      tecnico_id: form.tecnico_id || null,
      hora_fim: form.hora_fim || null,
    })
    if(error) showMsg('Erro: '+error.message,'err')
    else{showMsg('Agendamento criado!','ok');setForm(ef);setMForm(false);load()}
    setSaving(false)
  }

  async function updSt(id,status){
    await supabase.from('agenda').update({status}).eq('id',id)
    showMsg('Status atualizado!','ok'); load()
    if(modal) setModal(p=>({...p,status}))
  }

  async function del(id){
    if(!confirm('Cancelar agendamento?')) return
    await supabase.from('agenda').delete().eq('id',id)
    showMsg('Removido','ok'); setModal(null); load()
  }

  function selCli(id){
    const c = clis.find(x=>String(x.id)===String(id))
    if(c){
      const end=[c.logradouro,c.numero,c.bairro,c.cidade,c.estado].filter(Boolean).join(', ')
      setForm(p=>({...p,cliente_id:id,endereco:end,telefone:c.telefone||''}))
    } else setForm(p=>({...p,cliente_id:id}))
  }

  function showMsg(text,type){setMsg({text,type});setTimeout(()=>setMsg({text:'',type:''}),4000)}
  function f(k,v){setForm(p=>({...p,[k]:v}))}
  function chMes(d){let nm=mes+d,na=ano;if(nm<0){nm=11;na--}if(nm>11){nm=0;na++}setMes(nm);setAno(na)}

  const prim  = new Date(ano,mes,1).getDay()
  const total = new Date(ano,mes+1,0).getDate()
  const prev  = new Date(ano,mes,0).getDate()
  const dataSel = `${ano}-${String(mes+1).padStart(2,'0')}-${String(dia).padStart(2,'0')}`
  const agsDia  = ags.filter(a=>a.data===dataSel).sort((a,b)=>a.hora_inicio?.localeCompare(b.hora_inicio))
  const diasAg  = new Set(ags.map(a=>a.data))
  const hoje    = now.toISOString().split('T')[0]
  const proximos= ags.filter(a=>a.data>=hoje&&a.status!=='cancelado').slice(0,6)

  return (
    <AppLayout>
      <div style={{padding:24,maxWidth:1300}}>
        <div style={{marginBottom:20,display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
          <div>
            <h1 style={{fontSize:22,fontWeight:800,color:'#EEF2FF'}}>Agenda</h1>
            <p style={{fontSize:12,color:'#3D5070',marginTop:3}}>Agendamentos e atendimentos tecnicos</p>
          </div>
          <button onClick={()=>{setForm({...ef,data:dataSel});setMForm(true)}}
            style={{padding:'10px 20px',borderRadius:10,background:'#1A56DB',border:'none',color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>
            + Novo Agendamento
          </button>
        </div>

        {msg.text&&<div style={{marginBottom:16,padding:'12px 16px',borderRadius:10,fontSize:13,fontWeight:600,background:msg.type==='ok'?'rgba(16,185,129,.1)':'rgba(239,68,68,.1)',border:msg.type==='ok'?'1px solid rgba(16,185,129,.25)':'1px solid rgba(239,68,68,.25)',color:msg.type==='ok'?'#34D399':'#FCA5A5'}}>{msg.text}</div>}

        <div style={{display:'grid',gridTemplateColumns:'1fr 310px',gap:16}}>
          {/* CALENDARIO */}
          <div style={{background:'#0F1729',border:'1px solid rgba(96,165,250,0.07)',borderRadius:16,padding:20}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18}}>
              <button onClick={()=>chMes(-1)} style={{width:32,height:32,borderRadius:8,background:'#162040',border:'1px solid rgba(96,165,250,0.13)',color:'#8899BB',cursor:'pointer',fontSize:16}}>‹</button>
              <span style={{fontSize:16,fontWeight:800,color:'#EEF2FF'}}>{MESES[mes]} {ano}</span>
              <button onClick={()=>chMes(1)} style={{width:32,height:32,borderRadius:8,background:'#162040',border:'1px solid rgba(96,165,250,0.13)',color:'#8899BB',cursor:'pointer',fontSize:16}}>›</button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2,marginBottom:8}}>
              {DSEM.map(d=><div key={d} style={{textAlign:'center',fontSize:11,fontWeight:700,color:'#3D5070',padding:'4px 0'}}>{d}</div>)}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:3}}>
              {Array.from({length:prim}).map((_,i)=>(
                <div key={'p'+i} style={{aspectRatio:'1',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,color:'#1c2a40'}}>{prev-prim+i+1}</div>
              ))}
              {Array.from({length:total}).map((_,i)=>{
                const d=i+1
                const ds=`${ano}-${String(mes+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
                const isH=d===now.getDate()&&mes===now.getMonth()&&ano===now.getFullYear()
                const isS=d===dia
                const hasA=diasAg.has(ds)
                const cnt=ags.filter(a=>a.data===ds).length
                return(
                  <div key={d} onClick={()=>setDia(d)}
                    style={{aspectRatio:'1',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',borderRadius:8,cursor:'pointer',transition:'all .15s',
                      background:isS?'#1A56DB':isH?'rgba(26,86,219,0.2)':hasA?'rgba(6,182,212,0.08)':'transparent',
                      border:isS?'1px solid #1A56DB':isH?'1px solid rgba(26,86,219,0.4)':hasA?'1px solid rgba(6,182,212,0.2)':'1px solid transparent'}}
                    onMouseEnter={e=>{if(!isS)e.currentTarget.style.background='rgba(96,165,250,0.08)'}}
                    onMouseLeave={e=>{if(!isS)e.currentTarget.style.background=hasA?'rgba(6,182,212,0.08)':isH?'rgba(26,86,219,0.2)':'transparent'}}>
                    <span style={{fontSize:13,fontWeight:isS||isH?800:500,color:isS?'#fff':isH?'#60A5FA':'#8899BB'}}>{d}</span>
                    {hasA&&<span style={{fontSize:9,color:isS?'rgba(255,255,255,0.8)':'#67E8F9',fontWeight:700}}>{cnt}</span>}
                  </div>
                )
              })}
            </div>
            <div style={{display:'flex',gap:14,marginTop:14,flexWrap:'wrap'}}>
              {[{c:'#1A56DB',l:'Selecionado'},{c:'#60A5FA',l:'Hoje'},{c:'#67E8F9',l:'Com agendamentos'}].map(({c,l})=>(
                <div key={l} style={{display:'flex',alignItems:'center',gap:5,fontSize:11,color:'#3D5070'}}>
                  <div style={{width:7,height:7,borderRadius:2,background:c}}/>{l}
                </div>
              ))}
            </div>
          </div>

          {/* PAINEL DIREITO */}
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {/* Dia selecionado */}
            <div style={{background:'#0F1729',border:'1px solid rgba(96,165,250,0.07)',borderRadius:16,padding:16,flex:1}}>
              <div style={{fontSize:13,fontWeight:800,color:'#EEF2FF',marginBottom:12}}>
                {String(dia).padStart(2,'0')}/{String(mes+1).padStart(2,'0')}/{ano}
                <span style={{fontSize:11,color:'#3D5070',fontWeight:500,marginLeft:8}}>({agsDia.length})</span>
              </div>
              {loading?<div style={{textAlign:'center',color:'#3D5070',padding:20}}>Carregando...</div>
              :agsDia.length===0?<div style={{textAlign:'center',color:'#3D5070',fontSize:13,padding:20}}>
                <div style={{fontSize:22,marginBottom:6}}>📭</div>Nenhum agendamento
              </div>
              :agsDia.map(a=>{
                const {bg,color}=stBadge(a.status)
                return(
                  <div key={a.id} onClick={()=>setModal(a)}
                    style={{background:'#162040',borderLeft:'3px solid #06B6D4',borderRadius:'0 10px 10px 0',padding:'11px 13px',marginBottom:8,cursor:'pointer'}}
                    onMouseEnter={e=>e.currentTarget.style.background='#1c2a4a'}
                    onMouseLeave={e=>e.currentTarget.style.background='#162040'}>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4}}>
                      <span style={{fontSize:11,color:'#06B6D4',fontWeight:700,fontFamily:'monospace'}}>{a.hora_inicio?.slice(0,5)}{a.hora_fim?' - '+a.hora_fim.slice(0,5):''}</span>
                      <span style={{padding:'2px 8px',borderRadius:20,fontSize:10,fontWeight:700,background:bg,color}}>{a.status}</span>
                    </div>
                    <div style={{fontSize:13,fontWeight:800,color:'#EEF2FF'}}>{a.clientes?.nome||a.titulo||'—'}</div>
                    <div style={{fontSize:11,color:'#3D5070',marginTop:2}}>👷 {a.usuarios?.nome||'Sem tecnico'}</div>
                    {a.tipo_servico&&<div style={{fontSize:11,color:'#8899BB',marginTop:2}}>🔧 {a.tipo_servico}</div>}
                    {(a.clientes?.telefone||a.telefone)&&<div style={{fontSize:11,color:'#60A5FA',marginTop:2}}>📞 {a.clientes?.telefone||a.telefone}</div>}
                  </div>
                )
              })}
              <button onClick={()=>{setForm({...ef,data:dataSel});setMForm(true)}}
                style={{width:'100%',padding:'9px',borderRadius:10,background:'rgba(26,86,219,0.08)',border:'1px dashed rgba(26,86,219,0.3)',color:'#60A5FA',fontSize:12,fontWeight:600,cursor:'pointer',marginTop:4}}>
                + Adicionar neste dia
              </button>
            </div>

            {/* Proximos */}
            <div style={{background:'#0F1729',border:'1px solid rgba(96,165,250,0.07)',borderRadius:16,padding:16}}>
              <div style={{fontSize:12,fontWeight:800,color:'#EEF2FF',marginBottom:10}}>Proximos Atendimentos</div>
              {proximos.length===0?<div style={{fontSize:12,color:'#3D5070',textAlign:'center',padding:8}}>Nenhum agendamento futuro</div>
              :proximos.map(a=>(
                <div key={a.id} onClick={()=>{const[y,m,d]=a.data.split('-');setAno(parseInt(y));setMes(parseInt(m)-1);setDia(parseInt(d));setModal(a)}}
                  style={{display:'flex',alignItems:'center',gap:10,padding:'7px 0',borderBottom:'1px solid rgba(96,165,250,0.05)',cursor:'pointer'}}
                  onMouseEnter={e=>e.currentTarget.style.opacity='0.7'}
                  onMouseLeave={e=>e.currentTarget.style.opacity='1'}>
                  <div style={{background:'rgba(6,182,212,0.12)',border:'1px solid rgba(6,182,212,0.2)',borderRadius:8,padding:'4px 8px',textAlign:'center',minWidth:36,flexShrink:0}}>
                    <div style={{fontSize:14,fontWeight:800,color:'#67E8F9'}}>{a.data?.split('-')[2]}</div>
                    <div style={{fontSize:9,color:'#3D5070'}}>{MESES[parseInt(a.data?.split('-')[1])-1]?.slice(0,3)}</div>
                  </div>
                  <div style={{flex:1,overflow:'hidden'}}>
                    <div style={{fontSize:12,fontWeight:700,color:'#EEF2FF',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{a.clientes?.nome||a.titulo||'—'}</div>
                    <div style={{fontSize:11,color:'#3D5070'}}>{a.hora_inicio?.slice(0,5)} • {a.usuarios?.nome||'—'}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL DETALHES */}
      {modal&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.8)',zIndex:500,display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(4px)'}} onClick={()=>setModal(null)}>
          <div style={{background:'#0F1729',border:'1px solid rgba(96,165,250,0.2)',borderRadius:20,padding:26,width:500,maxHeight:'90vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16,paddingBottom:14,borderBottom:'1px solid rgba(96,165,250,0.07)'}}>
              <div>
                <div style={{fontSize:17,fontWeight:800,color:'#EEF2FF'}}>{modal.clientes?.nome||modal.titulo||'Agendamento'}</div>
                <div style={{fontSize:12,color:'#06B6D4',fontWeight:700,marginTop:3,fontFamily:'monospace'}}>
                  {modal.data?.split('-').reverse().join('/')} • {modal.hora_inicio?.slice(0,5)}{modal.hora_fim?' - '+modal.hora_fim.slice(0,5):''}
                </div>
              </div>
              <button onClick={()=>setModal(null)} style={{background:'rgba(96,165,250,0.1)',border:'1px solid rgba(96,165,250,0.2)',color:'#8899BB',fontSize:18,cursor:'pointer',borderRadius:8,width:32,height:32,display:'flex',alignItems:'center',justifyContent:'center'}}>x</button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
              {[['Tecnico',modal.usuarios?.nome],['Servico',modal.tipo_servico],['Telefone',modal.clientes?.telefone||modal.telefone]].map(([l,v])=>v?(
                <div key={l} style={{background:'rgba(96,165,250,0.04)',borderRadius:10,padding:'10px 14px'}}>
                  <div style={{fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:3}}>{l}</div>
                  <div style={{fontSize:13,color:'#EEF2FF',fontWeight:600}}>{v}</div>
                </div>
              ):null)}
              <div style={{background:'rgba(96,165,250,0.04)',borderRadius:10,padding:'10px 14px'}}>
                <div style={{fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:3}}>Status</div>
                <span style={{padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:700,background:stBadge(modal.status).bg,color:stBadge(modal.status).color}}>{modal.status}</span>
              </div>
            </div>
            {(modal.clientes?.logradouro||modal.endereco)&&(
              <a href={'https://maps.google.com/?q='+encodeURIComponent(modal.clientes?.logradouro?[modal.clientes.logradouro,modal.clientes.numero,modal.clientes.bairro,modal.clientes.cidade].filter(Boolean).join(', '):modal.endereco||'')}
                target="_blank" rel="noreferrer"
                style={{display:'flex',alignItems:'center',gap:10,padding:'11px 14px',background:'rgba(6,182,212,0.08)',border:'1px solid rgba(6,182,212,0.2)',borderRadius:10,color:'#67E8F9',textDecoration:'none',fontSize:13,fontWeight:600,marginBottom:14}}>
                <span>📍</span>
                <span style={{flex:1,fontSize:12}}>{modal.clientes?.logradouro||modal.endereco}</span>
                <span style={{fontSize:11,opacity:0.7}}>Maps →</span>
              </a>
            )}
            <div style={{marginBottom:14}}>
              <div style={{fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:8}}>Atualizar Status</div>
              <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                {['agendado','confirmado','concluido','cancelado'].map(s=>{
                  const {bg,color}=stBadge(s);const ativo=modal.status===s
                  return<button key={s} onClick={()=>updSt(modal.id,s)} style={{padding:'6px 12px',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',background:ativo?bg:'transparent',border:`1px solid ${color}50`,color:ativo?color:'#3D5070',textTransform:'capitalize'}}>{ativo?'✓ ':''}{s}</button>
                })}
              </div>
            </div>
            {(modal.clientes?.telefone||modal.telefone)&&(
              <button onClick={()=>{
                const tel=(modal.clientes?.telefone||modal.telefone||'').replace(/\D/g,'')
                const end=modal.clientes?.logradouro?[modal.clientes.logradouro,modal.clientes.numero,modal.clientes.bairro,modal.clientes.cidade].filter(Boolean).join(', '):modal.endereco||''
                const m=['*OperaxPro — Lembrete de Atendimento*','','*Cliente:* '+(modal.clientes?.nome||''),'*Data:* '+modal.data?.split('-').reverse().join('/'),'*Horario:* '+modal.hora_inicio?.slice(0,5)+(modal.hora_fim?' - '+modal.hora_fim.slice(0,5):''),'*Tecnico:* '+(modal.usuarios?.nome||'A definir'),modal.tipo_servico?'*Servico:* '+modal.tipo_servico:'',end?'*Endereco:* '+end:'','','_Enviado pelo OperaxPro_'].filter(Boolean).join('\n')
                window.open('https://wa.me/55'+tel+'?text='+encodeURIComponent(m),'_blank')
              }} style={{width:'100%',padding:'10px',borderRadius:10,background:'rgba(37,211,102,0.15)',border:'1px solid rgba(37,211,102,0.3)',color:'#25D366',fontSize:13,fontWeight:700,cursor:'pointer',marginBottom:8,display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                Enviar Lembrete WhatsApp
              </button>
            )}
            <button onClick={()=>del(modal.id)} style={{width:'100%',padding:'10px',borderRadius:10,background:'rgba(239,68,68,.12)',border:'1px solid rgba(239,68,68,.25)',color:'#FCA5A5',fontSize:13,fontWeight:700,cursor:'pointer'}}>Cancelar Agendamento</button>
          </div>
        </div>
      )}

      {/* MODAL NOVO */}
      {mForm&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.8)',zIndex:500,display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(4px)'}} onClick={()=>setMForm(false)}>
          <div style={{background:'#0F1729',border:'1px solid rgba(96,165,250,0.2)',borderRadius:20,padding:26,width:540,maxHeight:'90vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18}}>
              <span style={{fontSize:16,fontWeight:800,color:'#EEF2FF'}}>Novo Agendamento</span>
              <button onClick={()=>setMForm(false)} style={{background:'rgba(96,165,250,0.1)',border:'1px solid rgba(96,165,250,0.2)',color:'#8899BB',fontSize:18,cursor:'pointer',borderRadius:8,width:32,height:32,display:'flex',alignItems:'center',justifyContent:'center'}}>x</button>
            </div>
            <form onSubmit={save}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
                <div style={{gridColumn:'1/-1'}}>
                  <label style={{display:'block',fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:6}}>Cliente *</label>
                  <select value={form.cliente_id} onChange={e=>selCli(e.target.value)} style={{...S,appearance:'none',cursor:'pointer'}}>
                    <option value="">Selecione...</option>
                    {clis.map(c=><option key={c.id} value={c.id}>{c.nome}{c.telefone?' — '+c.telefone:''}</option>)}
                  </select>
                </div>
                <div style={{gridColumn:'1/-1'}}>
                  <label style={{display:'block',fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:6}}>Tecnico</label>
                  <select value={form.tecnico_id} onChange={e=>f('tecnico_id',e.target.value)} style={{...S,appearance:'none',cursor:'pointer'}}>
                    <option value="">Selecione...</option>
                    {tecs.map(t=><option key={t.id} value={t.id}>{t.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{display:'block',fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:6}}>Data *</label>
                  <input type="date" required value={form.data} onChange={e=>f('data',e.target.value)} style={S}/>
                </div>
                <div>
                  <label style={{display:'block',fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:6}}>Horario Inicio *</label>
                  <input type="time" required value={form.hora_inicio} onChange={e=>f('hora_inicio',e.target.value)} style={S}/>
                </div>
                <div>
                  <label style={{display:'block',fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:6}}>Horario Fim</label>
                  <input type="time" value={form.hora_fim} onChange={e=>f('hora_fim',e.target.value)} style={S}/>
                </div>
                <div>
                  <label style={{display:'block',fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:6}}>Tipo de Servico</label>
                  <input placeholder="Ex: Instalacao, Manutencao..." value={form.tipo_servico} onChange={e=>f('tipo_servico',e.target.value)} style={S}/>
                </div>
                <div style={{gridColumn:'1/-1'}}>
                  <label style={{display:'block',fontSize:10,fontWeight:700,color:'#67E8F9',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:6}}>Endereco</label>
                  <input placeholder="Preenchido ao selecionar cliente..." value={form.endereco} onChange={e=>f('endereco',e.target.value)} style={{...S,borderColor:'rgba(6,182,212,0.2)'}}/>
                </div>
                <div>
                  <label style={{display:'block',fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:6}}>Telefone</label>
                  <input placeholder="(11) 99999-9999" value={form.telefone} onChange={e=>f('telefone',e.target.value)} style={S}/>
                </div>
                <div>
                  <label style={{display:'block',fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:6}}>Status</label>
                  <select value={form.status} onChange={e=>f('status',e.target.value)} style={{...S,appearance:'none',cursor:'pointer'}}>
                    <option value="agendado">Agendado</option>
                    <option value="confirmado">Confirmado</option>
                  </select>
                </div>
                <div style={{gridColumn:'1/-1'}}>
                  <label style={{display:'block',fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:6}}>Observacoes</label>
                  <textarea placeholder="Detalhes do atendimento..." value={form.observacoes} onChange={e=>f('observacoes',e.target.value)} style={{...S,minHeight:60,resize:'vertical'}}/>
                </div>
              </div>
              <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
                <button type="button" onClick={()=>setMForm(false)} style={{padding:'10px 20px',borderRadius:10,background:'#162040',border:'1px solid rgba(96,165,250,0.13)',color:'#8899BB',fontSize:13,fontWeight:600,cursor:'pointer'}}>Cancelar</button>
                <button type="submit" disabled={saving} style={{padding:'10px 24px',borderRadius:10,background:'#1A56DB',border:'none',color:'#fff',fontSize:13,fontWeight:800,cursor:'pointer',opacity:saving?0.6:1}}>
                  {saving?'Salvando...':'Agendar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
