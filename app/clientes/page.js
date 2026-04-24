'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import AppLayout from '@/components/layout/AppLayout'

const S = { background:'#162040', border:'1px solid rgba(96,165,250,0.13)', color:'#EEF2FF', borderRadius:10, padding:'10px 14px', fontSize:14, fontFamily:'inherit', outline:'none', width:'100%' }
const ESTADOS = ['SP','RJ','MG','RS','PR','SC','BA','PE','CE','GO','DF','AM','PA','MT','MS','ES','RN','PB','AL','SE','PI','MA','TO','RO','AC','RR','AP']

export default function Clientes() {
  const [list, setList]       = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [msg, setMsg]         = useState({text:'',type:''})
  const [search, setSearch]   = useState('')
  const [editId, setEditId]   = useState(null)
  const [modal, setModal]     = useState(null)
  const empty = {nome:'',documento:'',telefone:'',telefone2:'',email:'',cep:'',logradouro:'',numero:'',complemento:'',bairro:'',cidade:'',estado:'',referencia:'',observacoes:''}
  const [form, setForm]       = useState(empty)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('clientes').select('*').order('criado_em',{ascending:false})
    setList(data || [])
    setLoading(false)
  }

  async function save(e) {
    e.preventDefault()
    if (!form.nome.trim()) { showMsg('Informe o nome do cliente','err'); return }
    if (!form.telefone.trim()) { showMsg('Informe o telefone','err'); return }
    setSaving(true)
    const { data:{ session } } = await supabase.auth.getSession()
    const { data:me } = await supabase.from('usuarios').select('empresa_id').eq('auth_id',session.user.id).single()
    if (editId) {
      const { error } = await supabase.from('clientes').update({...form}).eq('id',editId)
      if (error) showMsg('Erro: '+error.message,'err')
      else { showMsg('Cliente atualizado!','ok'); resetForm() }
    } else {
      const { error } = await supabase.from('clientes').insert({...form, empresa_id: me?.empresa_id || 1})
      if (error) showMsg('Erro: '+error.message,'err')
      else { showMsg('Cliente cadastrado!','ok'); resetForm() }
    }
    setSaving(false)
    load()
  }

  function editCli(c) {
    setEditId(c.id)
    setForm({nome:c.nome||'',documento:c.documento||'',telefone:c.telefone||'',telefone2:c.telefone2||'',email:c.email||'',cep:c.cep||'',logradouro:c.logradouro||'',numero:c.numero||'',complemento:c.complemento||'',bairro:c.bairro||'',cidade:c.cidade||'',estado:c.estado||'',referencia:c.referencia||'',observacoes:c.observacoes||''})
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

  const filtered = list.filter(c =>
    c.nome?.toLowerCase().includes(search.toLowerCase()) ||
    c.telefone?.includes(search) ||
    c.cidade?.toLowerCase().includes(search.toLowerCase()) ||
    c.documento?.includes(search)
  )

  return (
    <AppLayout>
      <div style={{padding:24,maxWidth:1200}}>
        <div style={{marginBottom:24,display:'flex',alignItems:'flex-start',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
          <div>
            <h1 style={{fontSize:22,fontWeight:800,color:'#EEF2FF'}}>Clientes</h1>
            <p style={{fontSize:12,color:'#3D5070',marginTop:3}}>Base de clientes cadastrados</p>
          </div>
          <div style={{background:'rgba(6,182,212,0.15)',border:'1px solid rgba(6,182,212,0.3)',borderRadius:12,padding:'10px 18px',textAlign:'center'}}>
            <div style={{fontSize:22,fontWeight:800,color:'#67E8F9'}}>{list.length}</div>
            <div style={{fontSize:11,color:'#3D5070'}}>clientes cadastrados</div>
          </div>
        </div>

        {msg.text && (
          <div style={{marginBottom:16,padding:'12px 16px',borderRadius:10,fontSize:13,fontWeight:600,
            background:msg.type==='ok'?'rgba(16,185,129,.1)':'rgba(239,68,68,.1)',
            border:msg.type==='ok'?'1px solid rgba(16,185,129,.25)':'1px solid rgba(239,68,68,.25)',
            color:msg.type==='ok'?'#34D399':'#FCA5A5'}}>{msg.text}</div>
        )}

        <div style={{background:'#0F1729',border:'1px solid rgba(96,165,250,0.07)',borderRadius:16,padding:24,marginBottom:24}}>
          <div style={{fontSize:14,fontWeight:800,color:'#EEF2FF',marginBottom:18,paddingBottom:14,borderBottom:'1px solid rgba(96,165,250,0.07)',display:'flex',alignItems:'center',gap:8}}>
            {editId ? 'Editar Cliente' : 'Cadastrar Novo Cliente'}
            {editId && <button onClick={resetForm} style={{marginLeft:'auto',padding:'4px 12px',borderRadius:8,background:'rgba(239,68,68,.12)',border:'1px solid rgba(239,68,68,.25)',color:'#FCA5A5',fontSize:12,cursor:'pointer'}}>Cancelar</button>}
          </div>
          <form onSubmit={save}>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:14,marginBottom:16}}>
              {[
                {k:'nome',l:'Nome / Empresa *',ph:'Maria Santos',req:true},
                {k:'documento',l:'CPF / CNPJ',ph:'000.000.000-00'},
                {k:'telefone',l:'Telefone Principal *',ph:'(11) 99999-9999',req:true},
                {k:'telefone2',l:'Telefone Secundario',ph:'(11) 99999-9999'},
                {k:'email',l:'E-mail',ph:'cliente@email.com',type:'email'},
                {k:'cep',l:'CEP',ph:'00000-000'},
                {k:'logradouro',l:'Logradouro',ph:'Rua, Avenida...'},
                {k:'numero',l:'Numero',ph:'123'},
                {k:'complemento',l:'Complemento',ph:'Apto, Sala...'},
                {k:'bairro',l:'Bairro',ph:'Nome do Bairro'},
                {k:'cidade',l:'Cidade',ph:'Sao Paulo'},
              ].map(({k,l,ph,req,type}) => (
                <div key={k}>
                  <label style={{display:'block',fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:6}}>{l}</label>
                  <input type={type||'text'} required={req} placeholder={ph} value={form[k]} onChange={e=>f(k,e.target.value)} style={S}/>
                </div>
              ))}
              <div>
                <label style={{display:'block',fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:6}}>Estado</label>
                <select value={form.estado} onChange={e=>f('estado',e.target.value)} style={{...S,appearance:'none',cursor:'pointer'}}>
                  <option value="">UF</option>
                  {ESTADOS.map(s=><option key={s}>{s}</option>)}
                </select>
              </div>
              <div style={{gridColumn:'1/-1'}}>
                <label style={{display:'block',fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:6}}>Ponto de Referencia</label>
                <input placeholder="Proximo ao mercado X, portao azul..." value={form.referencia} onChange={e=>f('referencia',e.target.value)} style={S}/>
              </div>
              <div style={{gridColumn:'1/-1'}}>
                <label style={{display:'block',fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:6}}>Observacoes</label>
                <textarea placeholder="Informacoes adicionais..." value={form.observacoes} onChange={e=>f('observacoes',e.target.value)} style={{...S,minHeight:70,resize:'vertical'}}/>
              </div>
            </div>
            <div style={{display:'flex',justifyContent:'flex-end',gap:10}}>
              <button type="button" onClick={resetForm} style={{padding:'10px 20px',borderRadius:10,background:'#162040',border:'1px solid rgba(96,165,250,0.13)',color:'#8899BB',fontSize:13,fontWeight:600,cursor:'pointer'}}>Limpar</button>
              <button type="submit" disabled={saving} style={{padding:'10px 24px',borderRadius:10,background:'#06B6D4',border:'none',color:'#000',fontSize:13,fontWeight:800,cursor:'pointer',opacity:saving?0.6:1}}>
                {saving?'Salvando...':editId?'Atualizar Cliente':'Salvar Cliente'}
              </button>
            </div>
          </form>
        </div>

        <div style={{background:'#0F1729',border:'1px solid rgba(96,165,250,0.07)',borderRadius:16,overflow:'hidden'}}>
          <div style={{padding:'16px 20px',borderBottom:'1px solid rgba(96,165,250,0.07)',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:10}}>
            <span style={{fontSize:14,fontWeight:800,color:'#EEF2FF'}}>Lista ({filtered.length})</span>
            <input placeholder="Buscar por nome, telefone, cidade..." value={search} onChange={e=>setSearch(e.target.value)} style={{...S,width:280,padding:'8px 14px',fontSize:13}}/>
          </div>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead>
                <tr style={{background:'rgba(15,23,41,0.6)'}}>
                  {['Nome / Empresa','Documento','Telefone','Cidade','Referencia','Acoes'].map(h=>(
                    <th key={h} style={{padding:'10px 16px',textAlign:'left',fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'1px',textTransform:'uppercase',borderBottom:'1px solid rgba(96,165,250,0.07)'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} style={{padding:32,textAlign:'center',color:'#3D5070'}}>Carregando...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} style={{padding:32,textAlign:'center',color:'#3D5070'}}>Nenhum cliente encontrado</td></tr>
                ) : filtered.map(c => (
                  <tr key={c.id} onMouseEnter={e=>e.currentTarget.style.background='rgba(96,165,250,0.03)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <td style={{padding:'13px 16px',borderBottom:'1px solid rgba(96,165,250,0.05)'}}>
                      <div style={{fontWeight:700,color:'#EEF2FF',fontSize:14}}>{c.nome}</div>
                      <div style={{fontSize:11,color:'#60A5FA',marginTop:2}}>{c.email||''}</div>
                    </td>
                    <td style={{padding:'13px 16px',borderBottom:'1px solid rgba(96,165,250,0.05)',fontSize:13,color:'#8899BB'}}>{c.documento||'--'}</td>
                    <td style={{padding:'13px 16px',borderBottom:'1px solid rgba(96,165,250,0.05)',fontSize:13,color:'#8899BB'}}>
                      <div>{c.telefone}</div>
                      {c.telefone2&&<div style={{fontSize:11,color:'#3D5070',marginTop:2}}>{c.telefone2}</div>}
                    </td>
                    <td style={{padding:'13px 16px',borderBottom:'1px solid rgba(96,165,250,0.05)',fontSize:13,color:'#8899BB'}}>{c.cidade&&c.estado?`${c.cidade} / ${c.estado}`:c.cidade||'--'}</td>
                    <td style={{padding:'13px 16px',borderBottom:'1px solid rgba(96,165,250,0.05)',fontSize:12,color:'#3D5070',maxWidth:180,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.referencia||'--'}</td>
                    <td style={{padding:'13px 16px',borderBottom:'1px solid rgba(96,165,250,0.05)'}}>
                      <div style={{display:'flex',gap:6}}>
                        <button onClick={()=>setModal(c)} style={{padding:'5px 10px',borderRadius:8,background:'rgba(6,182,212,.15)',border:'1px solid rgba(6,182,212,.3)',color:'#67E8F9',fontSize:11,cursor:'pointer'}}>Ver</button>
                        <button onClick={()=>editCli(c)} style={{padding:'5px 10px',borderRadius:8,background:'rgba(26,86,219,.15)',border:'1px solid rgba(26,86,219,.3)',color:'#60A5FA',fontSize:11,cursor:'pointer'}}>Editar</button>
                        <button onClick={()=>del(c.id)} style={{padding:'5px 10px',borderRadius:8,background:'rgba(239,68,68,.12)',border:'1px solid rgba(239,68,68,.25)',color:'#FCA5A5',fontSize:11,cursor:'pointer'}}>Remover</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {modal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.75)',zIndex:500,display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(3px)'}} onClick={()=>setModal(null)}>
          <div style={{background:'#0F1729',border:'1px solid rgba(96,165,250,0.2)',borderRadius:18,padding:28,width:500,maxHeight:'90vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
              <span style={{fontSize:16,fontWeight:800,color:'#EEF2FF'}}>{modal.nome}</span>
              <button onClick={()=>setModal(null)} style={{background:'none',border:'none',color:'#3D5070',fontSize:22,cursor:'pointer'}}>x</button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              {[
                ['Documento',modal.documento],['Telefone Principal',modal.telefone],
                ['Telefone Secundario',modal.telefone2],['E-mail',modal.email],
                ['CEP',modal.cep],['Logradouro',`${modal.logradouro||''} ${modal.numero||''}`],
                ['Bairro',modal.bairro],['Cidade / Estado',`${modal.cidade||''} ${modal.estado?'/ '+modal.estado:''}`],
              ].map(([l,v])=>(
                <div key={l}>
                  <div style={{fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:4}}>{l}</div>
                  <div style={{fontSize:13,color:'#EEF2FF'}}>{v||'--'}</div>
                </div>
              ))}
              <div style={{gridColumn:'1/-1'}}>
                <div style={{fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:4}}>Ponto de Referencia</div>
                <div style={{fontSize:13,color:'#EEF2FF'}}>{modal.referencia||'--'}</div>
              </div>
              {modal.observacoes&&<div style={{gridColumn:'1/-1'}}>
                <div style={{fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:4}}>Observacoes</div>
                <div style={{fontSize:13,color:'#EEF2FF'}}>{modal.observacoes}</div>
              </div>}
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
