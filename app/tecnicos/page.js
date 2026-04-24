'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import AppLayout from '@/components/layout/AppLayout'

const S = { background:'#162040', border:'1px solid rgba(96,165,250,0.13)', color:'#EEF2FF', borderRadius:10, padding:'10px 14px', fontSize:14, fontFamily:'inherit', outline:'none', width:'100%' }
const ESPEC = ['Elétrica','Hidráulica','Informática / TI','Refrigeração / Ar-condicionado','Instalações','Manutenção Geral','Outro']

export default function Tecnicos() {
  const [list, setList]       = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [msg, setMsg]         = useState({text:'',type:''})
  const [search, setSearch]   = useState('')
  const [editId, setEditId]   = useState(null)
  const [form, setForm]       = useState({nome:'',telefone:'',email:'',especialidade:'',endereco:'',cidade:'',status:'ativo'})

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data, error } = await supabase.from('usuarios').select('*').eq('perfil','tecnico').order('criado_em',{ascending:false})
    if (error) showMsg('Erro ao carregar: '+error.message,'err')
    setList(data || [])
    setLoading(false)
  }

  async function save(e) {
    e.preventDefault()
    if (!form.nome.trim()) { showMsg('Informe o nome do tecnico','err'); return }
    if (!form.telefone.trim()) { showMsg('Informe o telefone','err'); return }
    setSaving(true)
    const { data:{ session } } = await supabase.auth.getSession()
    const { data:me } = await supabase.from('usuarios').select('empresa_id').eq('auth_id',session.user.id).single()
    if (editId) {
      const { error } = await supabase.from('usuarios').update({...form}).eq('id',editId)
      if (error) { showMsg('Erro: '+error.message,'err') }
      else { showMsg('Tecnico atualizado!','ok'); resetForm() }
    } else {
      const { error } = await supabase.from('usuarios').insert({...form, perfil:'tecnico', empresa_id: me?.empresa_id || 1})
      if (error) { showMsg('Erro: '+error.message,'err') }
      else { showMsg('Tecnico cadastrado!','ok'); resetForm() }
    }
    setSaving(false)
    load()
  }

  function editTec(t) {
    setEditId(t.id)
    setForm({nome:t.nome||'',telefone:t.telefone||'',email:t.email||'',especialidade:t.especialidade||'',endereco:t.endereco||'',cidade:t.cidade||'',status:t.status||'ativo'})
    window.scrollTo({top:0,behavior:'smooth'})
  }

  async function del(id) {
    if (!confirm('Remover este tecnico?')) return
    const { error } = await supabase.from('usuarios').delete().eq('id',id)
    if (error) showMsg('Erro: '+error.message,'err')
    else { showMsg('Tecnico removido','ok'); load() }
  }

  function resetForm() { setForm({nome:'',telefone:'',email:'',especialidade:'',endereco:'',cidade:'',status:'ativo'}); setEditId(null) }
  function showMsg(text, type) { setMsg({text,type}); setTimeout(()=>setMsg({text:'',type:''}),4000) }
  function f(k,v) { setForm(p=>({...p,[k]:v})) }

  const filtered = list.filter(t =>
    t.nome?.toLowerCase().includes(search.toLowerCase()) ||
    t.email?.toLowerCase().includes(search.toLowerCase()) ||
    t.especialidade?.toLowerCase().includes(search.toLowerCase())
  )

  const stBadge = s => ({
    ativo:   { bg:'rgba(16,185,129,.15)',  color:'#34D399' },
    inativo: { bg:'rgba(239,68,68,.15)',   color:'#FCA5A5' },
    ferias:  { bg:'rgba(245,158,11,.15)',  color:'#FCD34D' },
  }[s] || { bg:'rgba(96,165,250,.15)', color:'#93C5FD' })

  return (
    <AppLayout>
      <div style={{padding:24,maxWidth:1200}}>
        <div style={{marginBottom:24,display:'flex',alignItems:'flex-start',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
          <div>
            <h1 style={{fontSize:22,fontWeight:800,color:'#EEF2FF'}}>Tecnicos</h1>
            <p style={{fontSize:12,color:'#3D5070',marginTop:3}}>Cadastro e gestao de tecnicos de campo</p>
          </div>
          <div style={{background:'rgba(26,86,219,0.15)',border:'1px solid rgba(26,86,219,0.3)',borderRadius:12,padding:'10px 18px',textAlign:'center'}}>
            <div style={{fontSize:22,fontWeight:800,color:'#60A5FA'}}>{list.length}</div>
            <div style={{fontSize:11,color:'#3D5070'}}>cadastrados</div>
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
            {editId ? 'Editar Tecnico' : 'Cadastrar Novo Tecnico'}
            {editId && <button onClick={resetForm} style={{marginLeft:'auto',padding:'4px 12px',borderRadius:8,background:'rgba(239,68,68,.12)',border:'1px solid rgba(239,68,68,.25)',color:'#FCA5A5',fontSize:12,cursor:'pointer'}}>Cancelar</button>}
          </div>
          <form onSubmit={save}>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:14,marginBottom:16}}>
              {[
                {k:'nome',l:'Nome Completo *',ph:'Joao Silva',req:true},
                {k:'telefone',l:'Telefone *',ph:'(11) 99999-9999',req:true},
                {k:'email',l:'E-mail',ph:'joao@email.com',type:'email'},
                {k:'endereco',l:'Endereco',ph:'Rua, numero - Bairro'},
                {k:'cidade',l:'Cidade / Estado',ph:'Sao Paulo / SP'},
              ].map(({k,l,ph,req,type}) => (
                <div key={k}>
                  <label style={{display:'block',fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:6}}>{l}</label>
                  <input type={type||'text'} required={req} placeholder={ph} value={form[k]} onChange={e=>f(k,e.target.value)} style={S}/>
                </div>
              ))}
              <div>
                <label style={{display:'block',fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:6}}>Especialidade</label>
                <select value={form.especialidade} onChange={e=>f('especialidade',e.target.value)} style={{...S,appearance:'none',cursor:'pointer'}}>
                  <option value="">Selecione...</option>
                  {ESPEC.map(o=><option key={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label style={{display:'block',fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:6}}>Status</label>
                <select value={form.status} onChange={e=>f('status',e.target.value)} style={{...S,appearance:'none',cursor:'pointer'}}>
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                  <option value="ferias">Ferias</option>
                </select>
              </div>
            </div>
            <div style={{display:'flex',justifyContent:'flex-end',gap:10}}>
              <button type="button" onClick={resetForm} style={{padding:'10px 20px',borderRadius:10,background:'#162040',border:'1px solid rgba(96,165,250,0.13)',color:'#8899BB',fontSize:13,fontWeight:600,cursor:'pointer'}}>Limpar</button>
              <button type="submit" disabled={saving} style={{padding:'10px 24px',borderRadius:10,background:'#1A56DB',border:'none',color:'#fff',fontSize:13,fontWeight:800,cursor:'pointer',opacity:saving?0.6:1}}>
                {saving?'Salvando...':editId?'Atualizar':'Salvar Tecnico'}
              </button>
            </div>
          </form>
        </div>

        <div style={{background:'#0F1729',border:'1px solid rgba(96,165,250,0.07)',borderRadius:16,overflow:'hidden'}}>
          <div style={{padding:'16px 20px',borderBottom:'1px solid rgba(96,165,250,0.07)',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:10}}>
            <span style={{fontSize:14,fontWeight:800,color:'#EEF2FF'}}>Lista ({filtered.length})</span>
            <input placeholder="Buscar..." value={search} onChange={e=>setSearch(e.target.value)} style={{...S,width:260,padding:'8px 14px',fontSize:13}}/>
          </div>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead>
                <tr style={{background:'rgba(15,23,41,0.6)'}}>
                  {['Nome','Telefone','E-mail','Especialidade','Cidade','Status','Acoes'].map(h=>(
                    <th key={h} style={{padding:'10px 16px',textAlign:'left',fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'1px',textTransform:'uppercase',borderBottom:'1px solid rgba(96,165,250,0.07)'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} style={{padding:32,textAlign:'center',color:'#3D5070'}}>Carregando...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7} style={{padding:32,textAlign:'center',color:'#3D5070'}}>Nenhum tecnico encontrado</td></tr>
                ) : filtered.map(t => {
                  const {bg,color} = stBadge(t.status)
                  return (
                    <tr key={t.id} onMouseEnter={e=>e.currentTarget.style.background='rgba(96,165,250,0.03)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                      <td style={{padding:'13px 16px',borderBottom:'1px solid rgba(96,165,250,0.05)',fontWeight:700,color:'#EEF2FF'}}>{t.nome}</td>
                      <td style={{padding:'13px 16px',borderBottom:'1px solid rgba(96,165,250,0.05)',fontSize:13,color:'#8899BB'}}>{t.telefone||'--'}</td>
                      <td style={{padding:'13px 16px',borderBottom:'1px solid rgba(96,165,250,0.05)',fontSize:13,color:'#60A5FA'}}>{t.email||'--'}</td>
                      <td style={{padding:'13px 16px',borderBottom:'1px solid rgba(96,165,250,0.05)',fontSize:13,color:'#8899BB'}}>{t.especialidade||'--'}</td>
                      <td style={{padding:'13px 16px',borderBottom:'1px solid rgba(96,165,250,0.05)',fontSize:13,color:'#8899BB'}}>{t.cidade||'--'}</td>
                      <td style={{padding:'13px 16px',borderBottom:'1px solid rgba(96,165,250,0.05)'}}>
                        <span style={{padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:700,background:bg,color}}>{t.status}</span>
                      </td>
                      <td style={{padding:'13px 16px',borderBottom:'1px solid rgba(96,165,250,0.05)'}}>
                        <div style={{display:'flex',gap:6}}>
                          <button onClick={()=>editTec(t)} style={{padding:'5px 12px',borderRadius:8,background:'rgba(26,86,219,.15)',border:'1px solid rgba(26,86,219,.3)',color:'#60A5FA',fontSize:12,cursor:'pointer'}}>Editar</button>
                          <button onClick={()=>del(t.id)} style={{padding:'5px 12px',borderRadius:8,background:'rgba(239,68,68,.12)',border:'1px solid rgba(239,68,68,.25)',color:'#FCA5A5',fontSize:12,cursor:'pointer'}}>Remover</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
