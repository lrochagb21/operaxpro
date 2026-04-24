'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import AppLayout from '@/components/layout/AppLayout'

const S = { background:'#162040', border:'1px solid rgba(96,165,250,0.13)', color:'#EEF2FF', borderRadius:10, padding:'10px 14px', fontSize:14, fontFamily:'inherit', outline:'none', width:'100%' }
const ESTADOS = ['SP','RJ','MG','RS','PR','SC','BA','PE','CE','GO','DF','AM','PA','MT','MS','ES','RN','PB','AL','SE','PI','MA','TO','RO','AC','RR','AP']
const empty = {nome:'',documento:'',telefone:'',telefone2:'',email:'',cep:'',logradouro:'',numero:'',complemento:'',bairro:'',cidade:'',estado:'',referencia:'',observacoes:''}

export default function Clientes() {
  const [list, setList]           = useState([])
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [cepLoading, setCepLoad]  = useState(false)
  const [msg, setMsg]             = useState({text:'',type:''})
  const [editId, setEditId]       = useState(null)
  const [modal, setModal]         = useState(null)
  const [form, setForm]           = useState(empty)
  const [tab, setTab]             = useState('form') // 'form' | 'lista'
  const [filtroTipo, setFiltroTipo] = useState('nome')
  const [filtroVal, setFiltroVal]   = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('clientes').select('*').order('nome',{ascending:true})
    setList(data || [])
    setLoading(false)
  }

  async function buscarCep(cep) {
    const c = cep.replace(/\D/g,'')
    if (c.length !== 8) return
    setCepLoad(true)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${c}/json/`)
      const d = await res.json()
      if (!d.erro) {
        setForm(p=>({...p,
          logradouro: d.logradouro||p.logradouro,
          bairro:     d.bairro||p.bairro,
          cidade:     d.localidade||p.cidade,
          estado:     d.uf||p.estado,
          cep:        c.replace(/(\d{5})(\d{3})/,'$1-$2')
        }))
        showMsg('Endereco preenchido automaticamente!','ok')
      } else showMsg('CEP nao encontrado','err')
    } catch { showMsg('Erro ao buscar CEP','err') }
    setCepLoad(false)
  }

  function handleCep(v) {
    let c = v.replace(/\D/g,'').slice(0,8)
    if (c.length > 5) c = c.slice(0,5)+'-'+c.slice(5)
    f('cep',c)
    if (c.replace(/\D/g,'').length===8) buscarCep(c)
  }

  async function save(e) {
    e.preventDefault()
    if (!form.nome.trim()) { showMsg('Informe o nome','err'); return }
    if (!form.telefone.trim()) { showMsg('Informe o telefone','err'); return }
    setSaving(true)
    const { data:{session} } = await supabase.auth.getSession()
    const { data:me } = await supabase.from('usuarios').select('empresa_id').eq('auth_id',session.user.id).single()
    if (editId) {
      const { error } = await supabase.from('clientes').update({...form}).eq('id',editId)
      if (error) showMsg('Erro: '+error.message,'err')
      else { showMsg('Cliente atualizado!','ok'); resetForm(); setTab('lista') }
    } else {
      const { error } = await supabase.from('clientes').insert({...form,empresa_id:me?.empresa_id||1})
      if (error) showMsg('Erro: '+error.message,'err')
      else { showMsg('Cliente cadastrado!','ok'); resetForm(); setTab('lista') }
    }
    setSaving(false)
    load()
  }

  function editCli(c) {
    setEditId(c.id)
    setForm({nome:c.nome||'',documento:c.documento||'',telefone:c.telefone||'',telefone2:c.telefone2||'',email:c.email||'',cep:c.cep||'',logradouro:c.logradouro||'',numero:c.numero||'',complemento:c.complemento||'',bairro:c.bairro||'',cidade:c.cidade||'',estado:c.estado||'',referencia:c.referencia||'',observacoes:c.observacoes||''})
    setTab('form')
    window.scrollTo({top:0,behavior:'smooth'})
  }

  async function del(id) {
    if (!confirm('Remover este cliente?')) return
    const { error } = await supabase.from('clientes').delete().eq('id',id)
    if (error) showMsg('Erro: '+error.message,'err')
    else { showMsg('Cliente removido','ok'); load() }
  }

  function resetForm() { setForm(empty); setEditId(null) }
  function showMsg(text,type) { setMsg({text,type}); setTimeout(()=>setMsg({text:'',type:''}),4000) }
  function f(k,v) { setForm(p=>({...p,[k]:v})) }

  const filtered = list.filter(c => {
    if (!filtroVal.trim()) return true
    const v = filtroVal.toLowerCase()
    switch(filtroTipo) {
      case 'nome':     return c.nome?.toLowerCase().includes(v)
      case 'cpf':      return c.documento?.replace(/\D/g,'').includes(filtroVal.replace(/\D/g,''))
      case 'telefone': return c.telefone?.replace(/\D/g,'').includes(filtroVal.replace(/\D/g,'')) || c.telefone2?.replace(/\D/g,'').includes(filtroVal.replace(/\D/g,''))
      case 'endereco': return c.logradouro?.toLowerCase().includes(v) || c.bairro?.toLowerCase().includes(v) || c.cidade?.toLowerCase().includes(v)
      case 'email':    return c.email?.toLowerCase().includes(v)
      default:         return true
    }
  })

  const btnTab = (t, label, count) => (
    <button onClick={()=>setTab(t)} style={{
      padding:'10px 20px', borderRadius:10, fontSize:13, fontWeight:700, cursor:'pointer', border:'none',
      background: tab===t ? '#1A56DB' : '#162040',
      color: tab===t ? '#fff' : '#8899BB',
      boxShadow: tab===t ? '0 4px 14px rgba(26,86,219,.35)' : 'none'
    }}>
      {label} {count!==undefined && <span style={{background: tab===t?'rgba(255,255,255,0.2)':'rgba(96,165,250,0.15)',color:tab===t?'#fff':'#60A5FA',borderRadius:20,padding:'1px 8px',fontSize:11,marginLeft:6}}>{count}</span>}
    </button>
  )

  return (
    <AppLayout>
      <div style={{padding:24,maxWidth:1200}}>
        {/* Header */}
        <div style={{marginBottom:24,display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
          <div>
            <h1 style={{fontSize:22,fontWeight:800,color:'#EEF2FF'}}>Clientes</h1>
            <p style={{fontSize:12,color:'#3D5070',marginTop:3}}>Gestao completa de clientes</p>
          </div>
          <div style={{display:'flex',gap:16,alignItems:'center'}}>
            <div style={{background:'rgba(6,182,212,0.15)',border:'1px solid rgba(6,182,212,0.3)',borderRadius:12,padding:'8px 18px',textAlign:'center'}}>
              <div style={{fontSize:20,fontWeight:800,color:'#67E8F9'}}>{list.length}</div>
              <div style={{fontSize:10,color:'#3D5070'}}>clientes</div>
            </div>
          </div>
        </div>

        {/* Mensagem */}
        {msg.text && (
          <div style={{marginBottom:16,padding:'12px 16px',borderRadius:10,fontSize:13,fontWeight:600,
            background:msg.type==='ok'?'rgba(16,185,129,.1)':'rgba(239,68,68,.1)',
            border:msg.type==='ok'?'1px solid rgba(16,185,129,.25)':'1px solid rgba(239,68,68,.25)',
            color:msg.type==='ok'?'#34D399':'#FCA5A5'}}>{msg.text}</div>
        )}

        {/* Tabs */}
        <div style={{display:'flex',gap:8,marginBottom:20}}>
          {btnTab('form', editId ? 'Editar Cliente' : 'Novo Cliente')}
          {btnTab('lista', 'Clientes Cadastrados', list.length)}
        </div>

        {/* FORMULARIO */}
        {tab==='form' && (
          <div style={{background:'#0F1729',border:'1px solid rgba(96,165,250,0.07)',borderRadius:16,padding:24}}>
            <div style={{fontSize:14,fontWeight:800,color:'#EEF2FF',marginBottom:18,paddingBottom:14,borderBottom:'1px solid rgba(96,165,250,0.07)',display:'flex',alignItems:'center',gap:8}}>
              {editId ? 'Editando Cliente' : 'Cadastrar Novo Cliente'}
              {editId && <button onClick={()=>{resetForm();setTab('lista')}} style={{marginLeft:'auto',padding:'4px 12px',borderRadius:8,background:'rgba(239,68,68,.12)',border:'1px solid rgba(239,68,68,.25)',color:'#FCA5A5',fontSize:12,cursor:'pointer'}}>Cancelar edicao</button>}
            </div>
            <form onSubmit={save}>
              {/* Dados pessoais */}
              <div style={{marginBottom:8,fontSize:11,fontWeight:700,color:'#3D5070',letterSpacing:'1px',textTransform:'uppercase'}}>Dados Pessoais</div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:14,marginBottom:20}}>
                {[
                  {k:'nome',l:'Nome / Empresa *',ph:'Maria Santos',req:true},
                  {k:'documento',l:'CPF / CNPJ',ph:'000.000.000-00'},
                  {k:'telefone',l:'Telefone Principal *',ph:'(11) 99999-9999',req:true},
                  {k:'telefone2',l:'Telefone Secundario',ph:'(11) 99999-9999'},
                  {k:'email',l:'E-mail',ph:'cliente@email.com',type:'email'},
                ].map(({k,l,ph,req,type})=>(
                  <div key={k}>
                    <label style={{display:'block',fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:6}}>{l}</label>
                    <input type={type||'text'} required={req} placeholder={ph} value={form[k]} onChange={e=>f(k,e.target.value)} style={S}/>
                  </div>
                ))}
              </div>

              {/* Endereco */}
              <div style={{background:'rgba(6,182,212,0.05)',border:'1px solid rgba(6,182,212,0.15)',borderRadius:12,padding:16,marginBottom:16}}>
                <div style={{fontSize:11,fontWeight:700,color:'#67E8F9',letterSpacing:'1px',textTransform:'uppercase',marginBottom:14,display:'flex',alignItems:'center',gap:8}}>
                  Endereco
                  {cepLoading && <span style={{background:'rgba(6,182,212,.15)',color:'#67E8F9',borderRadius:20,padding:'2px 10px',fontSize:10,fontWeight:600}}>Buscando CEP...</span>}
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:14}}>
                  <div>
                    <label style={{display:'block',fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:6}}>CEP</label>
                    <input placeholder="00000-000" value={form.cep} onChange={e=>handleCep(e.target.value)} maxLength={9}
                      style={{...S,borderColor:cepLoading?'#06B6D4':'rgba(96,165,250,0.13)'}}/>
                  </div>
                  {[
                    {k:'logradouro',l:'Logradouro',ph:'Rua, Avenida...'},
                    {k:'numero',l:'Numero',ph:'123'},
                    {k:'complemento',l:'Complemento',ph:'Apto, Sala...'},
                    {k:'bairro',l:'Bairro',ph:'Nome do Bairro'},
                    {k:'cidade',l:'Cidade',ph:'Sao Paulo'},
                  ].map(({k,l,ph})=>(
                    <div key={k}>
                      <label style={{display:'block',fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:6}}>{l}</label>
                      <input placeholder={ph} value={form[k]} onChange={e=>f(k,e.target.value)} style={S}/>
                    </div>
                  ))}
                  <div>
                    <label style={{display:'block',fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:6}}>Estado</label>
                    <select value={form.estado} onChange={e=>f('estado',e.target.value)} style={{...S,appearance:'none',cursor:'pointer'}}>
                      <option value="">UF</option>
                      {ESTADOS.map(s=><option key={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{marginTop:14}}>
                  <label style={{display:'block',fontSize:10,fontWeight:700,color:'#67E8F9',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:6}}>Ponto de Referencia</label>
                  <input placeholder="Proximo ao mercado X, portao azul, casa amarela..." value={form.referencia} onChange={e=>f('referencia',e.target.value)} style={{...S,borderColor:'rgba(6,182,212,0.2)'}}/>
                </div>
              </div>

              {/* Obs */}
              <div style={{marginBottom:16}}>
                <label style={{display:'block',fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:6}}>Observacoes</label>
                <textarea placeholder="Informacoes adicionais..." value={form.observacoes} onChange={e=>f('observacoes',e.target.value)} style={{...S,minHeight:70,resize:'vertical'}}/>
              </div>

              <div style={{display:'flex',justifyContent:'flex-end',gap:10}}>
                <button type="button" onClick={resetForm} style={{padding:'10px 20px',borderRadius:10,background:'#162040',border:'1px solid rgba(96,165,250,0.13)',color:'#8899BB',fontSize:13,fontWeight:600,cursor:'pointer'}}>Limpar</button>
                <button type="submit" disabled={saving} style={{padding:'10px 24px',borderRadius:10,background:'#06B6D4',border:'none',color:'#000',fontSize:13,fontWeight:800,cursor:'pointer',opacity:saving?0.6:1}}>
                  {saving?'Salvando...':editId?'Atualizar Cliente':'Salvar Cliente'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* LISTA */}
        {tab==='lista' && (
          <div>
            {/* Busca avancada */}
            <div style={{background:'#0F1729',border:'1px solid rgba(96,165,250,0.07)',borderRadius:16,padding:20,marginBottom:16}}>
              <div style={{fontSize:12,fontWeight:700,color:'#3D5070',letterSpacing:'1px',textTransform:'uppercase',marginBottom:12}}>Busca Avancada</div>
              <div style={{display:'flex',gap:10,flexWrap:'wrap',alignItems:'center'}}>
                <div style={{display:'flex',gap:0,background:'#162040',borderRadius:10,overflow:'hidden',border:'1px solid rgba(96,165,250,0.13)',flexShrink:0}}>
                  {[
                    {v:'nome',l:'Nome'},
                    {v:'cpf',l:'CPF/CNPJ'},
                    {v:'telefone',l:'Telefone'},
                    {v:'endereco',l:'Endereco'},
                    {v:'email',l:'E-mail'},
                  ].map(({v,l})=>(
                    <button key={v} onClick={()=>{setFiltroTipo(v);setFiltroVal('')}}
                      style={{padding:'9px 14px',border:'none',cursor:'pointer',fontSize:12,fontWeight:700,
                        background:filtroTipo===v?'#1A56DB':'transparent',
                        color:filtroTipo===v?'#fff':'#8899BB',
                        transition:'all .15s'}}>{l}</button>
                  ))}
                </div>
                <input
                  placeholder={`Buscar por ${filtroTipo === 'cpf' ? 'CPF/CNPJ' : filtroTipo === 'endereco' ? 'rua, bairro ou cidade' : filtroTipo}...`}
                  value={filtroVal} onChange={e=>setFiltroVal(e.target.value)}
                  style={{...S,flex:1,minWidth:200,padding:'9px 14px',fontSize:13}}/>
                {filtroVal && (
                  <button onClick={()=>setFiltroVal('')} style={{padding:'9px 14px',borderRadius:10,background:'rgba(239,68,68,.12)',border:'1px solid rgba(239,68,68,.25)',color:'#FCA5A5',fontSize:12,fontWeight:600,cursor:'pointer',flexShrink:0}}>Limpar</button>
                )}
              </div>
              <div style={{marginTop:10,fontSize:12,color:'#3D5070'}}>
                {filtroVal ? `${filtered.length} resultado(s) encontrado(s)` : `${list.length} clientes cadastrados`}
              </div>
            </div>

            {/* Tabela */}
            <div style={{background:'#0F1729',border:'1px solid rgba(96,165,250,0.07)',borderRadius:16,overflow:'hidden'}}>
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse'}}>
                  <thead>
                    <tr style={{background:'rgba(15,23,41,0.6)'}}>
                      {['Nome / Empresa','CPF / CNPJ','Telefone','Cidade / UF','Referencia','Acoes'].map(h=>(
                        <th key={h} style={{padding:'11px 16px',textAlign:'left',fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'1px',textTransform:'uppercase',borderBottom:'1px solid rgba(96,165,250,0.07)',whiteSpace:'nowrap'}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={6} style={{padding:40,textAlign:'center',color:'#3D5070',fontSize:13}}>Carregando...</td></tr>
                    ) : filtered.length===0 ? (
                      <tr><td colSpan={6} style={{padding:40,textAlign:'center',color:'#3D5070',fontSize:13}}>
                        {filtroVal ? `Nenhum cliente encontrado para "${filtroVal}"` : 'Nenhum cliente cadastrado ainda'}
                      </td></tr>
                    ) : filtered.map(c=>(
                      <tr key={c.id}
                        onMouseEnter={e=>e.currentTarget.style.background='rgba(96,165,250,0.03)'}
                        onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                        <td style={{padding:'13px 16px',borderBottom:'1px solid rgba(96,165,250,0.05)'}}>
                          <div style={{fontWeight:700,color:'#EEF2FF',fontSize:14}}>{c.nome}</div>
                          <div style={{fontSize:11,color:'#60A5FA',marginTop:2}}>{c.email||''}</div>
                        </td>
                        <td style={{padding:'13px 16px',borderBottom:'1px solid rgba(96,165,250,0.05)',fontSize:13,color:'#8899BB',fontFamily:'monospace'}}>{c.documento||'--'}</td>
                        <td style={{padding:'13px 16px',borderBottom:'1px solid rgba(96,165,250,0.05)',fontSize:13,color:'#8899BB'}}>
                          <div>{c.telefone}</div>
                          {c.telefone2&&<div style={{fontSize:11,color:'#3D5070',marginTop:2}}>{c.telefone2}</div>}
                        </td>
                        <td style={{padding:'13px 16px',borderBottom:'1px solid rgba(96,165,250,0.05)',fontSize:13,color:'#8899BB',whiteSpace:'nowrap'}}>{c.cidade&&c.estado?`${c.cidade} / ${c.estado}`:c.cidade||'--'}</td>
                        <td style={{padding:'13px 16px',borderBottom:'1px solid rgba(96,165,250,0.05)',fontSize:12,color:'#3D5070',maxWidth:160,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.referencia||'--'}</td>
                        <td style={{padding:'13px 16px',borderBottom:'1px solid rgba(96,165,250,0.05)',whiteSpace:'nowrap'}}>
                          <div style={{display:'flex',gap:5}}>
                            <button onClick={()=>setModal(c)} style={{padding:'5px 10px',borderRadius:8,background:'rgba(6,182,212,.15)',border:'1px solid rgba(6,182,212,.3)',color:'#67E8F9',fontSize:11,fontWeight:600,cursor:'pointer'}}>Ver</button>
                            <button onClick={()=>editCli(c)} style={{padding:'5px 10px',borderRadius:8,background:'rgba(26,86,219,.15)',border:'1px solid rgba(26,86,219,.3)',color:'#60A5FA',fontSize:11,fontWeight:600,cursor:'pointer'}}>Editar</button>
                            <button onClick={()=>del(c.id)} style={{padding:'5px 10px',borderRadius:8,background:'rgba(239,68,68,.12)',border:'1px solid rgba(239,68,68,.25)',color:'#FCA5A5',fontSize:11,fontWeight:600,cursor:'pointer'}}>Remover</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal detalhes */}
      {modal&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.75)',zIndex:500,display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(3px)'}} onClick={()=>setModal(null)}>
          <div style={{background:'#0F1729',border:'1px solid rgba(96,165,250,0.2)',borderRadius:18,padding:28,width:540,maxHeight:'90vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20,paddingBottom:16,borderBottom:'1px solid rgba(96,165,250,0.07)'}}>
              <div>
                <div style={{fontSize:17,fontWeight:800,color:'#EEF2FF'}}>{modal.nome}</div>
                <div style={{fontSize:12,color:'#60A5FA',marginTop:2}}>{modal.email||''}</div>
              </div>
              <button onClick={()=>setModal(null)} style={{background:'rgba(96,165,250,0.1)',border:'1px solid rgba(96,165,250,0.2)',color:'#8899BB',fontSize:18,cursor:'pointer',borderRadius:8,width:32,height:32,display:'flex',alignItems:'center',justifyContent:'center',lineHeight:1}}>x</button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14}}>
              {[
                ['CPF / CNPJ',modal.documento],
                ['Telefone Principal',modal.telefone],
                ['Telefone Secundario',modal.telefone2],
                ['CEP',modal.cep],
                ['Logradouro',modal.logradouro ? `${modal.logradouro} ${modal.numero||''}` : null],
                ['Bairro',modal.bairro],
                ['Cidade / Estado',`${modal.cidade||''} ${modal.estado?'/ '+modal.estado:''}`],
              ].map(([l,v])=>v?(
                <div key={l}>
                  <div style={{fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:4}}>{l}</div>
                  <div style={{fontSize:13,color:'#EEF2FF'}}>{v}</div>
                </div>
              ):null)}
            </div>
            {modal.logradouro&&(
              
                href={`https://maps.google.com/?q=${encodeURIComponent(`${modal.logradouro||''} ${modal.numero||''}, ${modal.bairro||''}, ${modal.cidade||''} - ${modal.estado||''}`)}`}
                target="_blank" rel="noreferrer"
                style={{display:'flex',alignItems:'center',gap:10,padding:'12px 16px',background:'rgba(6,182,212,0.08)',border:'1px solid rgba(6,182,212,0.25)',borderRadius:10,color:'#67E8F9',textDecoration:'none',fontSize:13,fontWeight:600,marginBottom:12,transition:'all .15s'}}>
                <span style={{fontSize:18}}>📍</span>
                <div>
                  <div style={{fontSize:13,fontWeight:700}}>{modal.logradouro}{modal.numero ? ', '+modal.numero : ''}</div>
                  <div style={{fontSize:11,opacity:0.7,marginTop:1}}>{modal.bairro}{modal.cidade ? ' - '+modal.cidade : ''}{modal.estado ? ' / '+modal.estado : ''}</div>
                </div>
                <span style={{marginLeft:'auto',fontSize:11,opacity:0.7,whiteSpace:'nowrap'}}>Abrir no Maps →</span>
              </a>
            )}
            {modal.referencia&&(
              <div style={{background:'rgba(6,182,212,0.08)',border:'1px solid rgba(6,182,212,0.2)',borderRadius:10,padding:12,marginBottom:12}}>
                <div style={{fontSize:10,fontWeight:700,color:'#67E8F9',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:5}}>Ponto de Referencia</div>
                <div style={{fontSize:13,color:'#EEF2FF'}}>{modal.referencia}</div>
              </div>
            )}
            {modal.observacoes&&(
              <div style={{background:'rgba(96,165,250,0.05)',border:'1px solid rgba(96,165,250,0.1)',borderRadius:10,padding:12}}>
                <div style={{fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:5}}>Observacoes</div>
                <div style={{fontSize:13,color:'#8899BB'}}>{modal.observacoes}</div>
              </div>
            )}
            <div style={{display:'flex',gap:8,marginTop:16}}>
              <button onClick={()=>{editCli(modal);setModal(null)}} style={{flex:1,padding:'10px',borderRadius:10,background:'rgba(26,86,219,.15)',border:'1px solid rgba(26,86,219,.3)',color:'#60A5FA',fontSize:13,fontWeight:700,cursor:'pointer'}}>Editar</button>
              <button onClick={()=>{del(modal.id);setModal(null)}} style={{padding:'10px 16px',borderRadius:10,background:'rgba(239,68,68,.12)',border:'1px solid rgba(239,68,68,.25)',color:'#FCA5A5',fontSize:13,fontWeight:700,cursor:'pointer'}}>Remover</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
