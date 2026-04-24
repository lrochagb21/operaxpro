'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import AppLayout from '@/components/layout/AppLayout'

const S = { background:'#162040', border:'1px solid rgba(96,165,250,0.13)', color:'#EEF2FF', borderRadius:10, padding:'10px 14px', fontSize:14, fontFamily:'inherit', outline:'none', width:'100%' }
const STATUS = ['Aberta','Em Andamento','Aguardando Peça','Concluída','Cancelada']
const PRIORIDADES = ['Normal','Alta','Urgente']
const SERVICOS = ['Instalação','Manutenção Preventiva','Manutenção Corretiva','Reparo','Vistoria','Suporte Técnico','Outro']
const empty = {tipo:'OS',prioridade:'Normal',cliente_id:'',tecnico_id:'',tipo_servico:'',status:'Aberta',valor:'',desconto:'',descricao:'',pecas:'',observacoes:'',data_abertura:'',data_previsao:'',hora_atendimento:''}

const stBadge = s => ({
  'Aberta':          {bg:'rgba(245,158,11,.15)', color:'#FCD34D'},
  'Em Andamento':    {bg:'rgba(96,165,250,.15)',  color:'#93C5FD'},
  'Aguardando Peça': {bg:'rgba(139,92,246,.15)',  color:'#C4B5FD'},
  'Concluída':       {bg:'rgba(16,185,129,.15)',  color:'#34D399'},
  'Cancelada':       {bg:'rgba(239,68,68,.15)',   color:'#FCA5A5'},
}[s] || {bg:'rgba(96,165,250,.15)',color:'#93C5FD'})

const prBadge = p => ({
  'Normal':  {bg:'rgba(96,165,250,.1)',  color:'#93C5FD'},
  'Alta':    {bg:'rgba(245,158,11,.15)', color:'#FCD34D'},
  'Urgente': {bg:'rgba(239,68,68,.15)',  color:'#FCA5A5'},
}[p] || {bg:'rgba(96,165,250,.1)',color:'#93C5FD'})

export default function OS() {
  const [list, setList]         = useState([])
  const [clientes, setClientes] = useState([])
  const [tecnicos, setTecnicos] = useState([])
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [msg, setMsg]           = useState({text:'',type:''})
  const [tab, setTab]           = useState('form')
  const [editId, setEditId]     = useState(null)
  const [modal, setModal]       = useState(null)
  const [form, setForm]         = useState(empty)
  const [filtroStatus, setFiltroStatus] = useState('')
  const [tipoView, setTipoView] = useState('todos') // 'todos' | 'OS' | 'ORC'
  const [filtroPrio, setFiltroPrio]     = useState('')
  const [search, setSearch]             = useState('')

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [osRes, cliRes, tecRes] = await Promise.all([
      supabase.from('ordens_servico').select('*, clientes(nome,telefone), usuarios(nome)').order('criado_em',{ascending:false}),
      supabase.from('clientes').select('id,nome,telefone').order('nome',{ascending:true}),
      supabase.from('usuarios').select('id,nome').eq('perfil','tecnico').eq('status','ativo').order('nome',{ascending:true}),
    ])
    setList(osRes.data || [])
    setClientes(cliRes.data || [])
    setTecnicos(tecRes.data || [])
    setLoading(false)
  }

  async function save(e) {
    e.preventDefault()
    if (!form.cliente_id) { showMsg('Selecione o cliente','err'); return }
    if (!form.descricao.trim()) { showMsg('Descreva o problema ou servico','err'); return }
    setSaving(true)
    const { data:{session} } = await supabase.auth.getSession()
    const { data:me } = await supabase.from('usuarios').select('empresa_id').eq('auth_id',session.user.id).single()
    const payload = {
      ...form,
      empresa_id: me?.empresa_id||1,
      valor: parseFloat(form.valor)||0,
      desconto: parseFloat(form.desconto)||0,
      tecnico_id: form.tecnico_id||null,
      data_abertura: form.data_abertura||null,
      data_previsao: form.data_previsao||null,
      hora_atendimento: form.hora_atendimento||null,
    }
    if (editId) {
      const { error } = await supabase.from('ordens_servico').update(payload).eq('id',editId)
      if (error) showMsg('Erro: '+error.message,'err')
      else { showMsg('OS atualizada!','ok'); resetForm(); setTab('lista') }
    } else {
      const { error } = await supabase.from('ordens_servico').insert(payload)
      if (error) showMsg('Erro: '+error.message,'err')
      else {
        // Buscar a OS recem criada para pegar o ID
        const { data:novaOS } = await supabase.from('ordens_servico').select('id').eq('empresa_id',me?.empresa_id||1).order('criado_em',{ascending:false}).limit(1).single()
        // Criar agendamento automatico se tiver data e hora
        if (form.data_abertura && form.hora_atendimento && novaOS) {
          const cliSel = clientes.find(c=>String(c.id)===String(form.cliente_id))
          const tecSel = tecnicos.find(t=>String(t.id)===String(form.tecnico_id))
          await supabase.from('agenda').insert({
            empresa_id: me?.empresa_id||1,
            os_id: novaOS.id,
            cliente_id: parseInt(form.cliente_id)||null,
            tecnico_id: form.tecnico_id||null,
            titulo: (form.tipo_servico||'Atendimento')+' — '+(cliSel?.nome||''),
            data: form.data_abertura,
            hora_inicio: form.hora_atendimento,
            telefone: cliSel?.telefone||'',
            tipo_servico: form.tipo_servico||'',
            status: 'agendado',
          })
          showMsg('OS criada e adicionada a agenda automaticamente!','ok')
        } else {
          showMsg('OS criada com sucesso!','ok')
        }
        resetForm(); setTab('lista')
      }
    }
    setSaving(false)
    loadAll()
  }

  async function updateStatus(id, status) {
    await supabase.from('ordens_servico').update({status, ...(status==='Concluída'?{data_conclusao:new Date().toISOString().split('T')[0]}:{})}).eq('id',id)
    showMsg('Status atualizado!','ok')
    loadAll()
    if(modal) setModal(prev=>({...prev,status}))
  }

  async function del(id) {
    if (!confirm('Remover esta OS?')) return
    await supabase.from('ordens_servico').delete().eq('id',id)
    showMsg('OS removida','ok')
    setModal(null)
    loadAll()
  }

  function editOS(o) {
    setEditId(o.id)
    setForm({
      tipo:o.tipo||'OS', prioridade:o.prioridade||'Normal',
      cliente_id:o.cliente_id||'', tecnico_id:o.tecnico_id||'',
      tipo_servico:o.tipo_servico||'', status:o.status||'Aberta',
      valor:o.valor||'', desconto:o.desconto||'',
      descricao:o.descricao||'', pecas:o.pecas||'', observacoes:o.observacoes||'',
      data_abertura:o.data_abertura||'', data_previsao:o.data_previsao||'',
    })
    setTab('form')
    window.scrollTo({top:0,behavior:'smooth'})
  }

  function resetForm() { setForm({...empty, data_abertura: new Date().toISOString().split('T')[0]}); setEditId(null) }
  function showMsg(text,type) { setMsg({text,type}); setTimeout(()=>setMsg({text:'',type:''}),4000) }
  function f(k,v) { setForm(p=>({...p,[k]:v})) }

  const filtered = list.filter(o => {
    const matchTipo   = tipoView === 'todos' || o.tipo === tipoView
    const matchStatus = !filtroStatus || o.status === filtroStatus
    const matchPrio   = !filtroPrio   || o.prioridade === filtroPrio
    const matchSearch = !search || 
      o.clientes?.nome?.toLowerCase().includes(search.toLowerCase()) ||
      o.usuarios?.nome?.toLowerCase().includes(search.toLowerCase()) ||
      o.tipo_servico?.toLowerCase().includes(search.toLowerCase()) ||
      String(o.id).includes(search)
    return matchTipo && matchStatus && matchPrio && matchSearch
  })

  const totais = {
    aberta:    list.filter(o=>o.status==='Aberta').length,
    andamento: list.filter(o=>o.status==='Em Andamento').length,
    concluida: list.filter(o=>o.status==='Concluída').length,
    urgente:   list.filter(o=>o.prioridade==='Urgente').length,
    os:        list.filter(o=>o.tipo==='OS').length,
    orc:       list.filter(o=>o.tipo==='ORC').length,
  }

  async function aprovarOrc(o) {
    if (!confirm('Aprovar este orcamento e converter em Ordem de Servico?')) return
    const { error } = await supabase.from('ordens_servico').update({tipo:'OS', status:'Aberta'}).eq('id',o.id)
    if (error) showMsg('Erro: '+error.message,'err')
    else { showMsg('Orcamento aprovado e convertido em OS!','ok'); loadAll(); setModal(null) }
  }

  const fmtVal = v => v ? 'R$ '+parseFloat(v).toLocaleString('pt-BR',{minimumFractionDigits:2}) : '—'
  const fmtDate = d => d ? new Date(d+'T00:00:00').toLocaleDateString('pt-BR') : '—'

  const btnTab = (t,label,count) => (
    <button onClick={()=>setTab(t)} style={{
      padding:'10px 20px',borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer',border:'none',
      background:tab===t?'#1A56DB':'#162040',
      color:tab===t?'#fff':'#8899BB',
      boxShadow:tab===t?'0 4px 14px rgba(26,86,219,.35)':'none'
    }}>
      {label}{count!==undefined&&<span style={{background:tab===t?'rgba(255,255,255,0.2)':'rgba(96,165,250,0.15)',color:tab===t?'#fff':'#60A5FA',borderRadius:20,padding:'1px 8px',fontSize:11,marginLeft:6}}>{count}</span>}
    </button>
  )

  return (
    <AppLayout>
      <div style={{padding:24,maxWidth:1300}}>

        {/* Header */}
        <div style={{marginBottom:24,display:'flex',alignItems:'flex-start',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
          <div>
            <h1 style={{fontSize:22,fontWeight:800,color:'#EEF2FF'}}>Ordens de Serviço</h1>
            <p style={{fontSize:12,color:'#3D5070',marginTop:3}}>Gestao completa de OS e orcamentos</p>
          </div>
          <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
            {[
              {l:'Abertas',v:totais.aberta,bg:'rgba(245,158,11,.15)',c:'#FCD34D'},
              {l:'Andamento',v:totais.andamento,bg:'rgba(96,165,250,.15)',c:'#93C5FD'},
              {l:'Concluidas',v:totais.concluida,bg:'rgba(16,185,129,.15)',c:'#34D399'},
              {l:'Urgentes',v:totais.urgente,bg:'rgba(239,68,68,.15)',c:'#FCA5A5'},
            ].map(({l,v,bg,c})=>(
              <div key={l} style={{background:bg,border:`1px solid ${c}40`,borderRadius:12,padding:'8px 16px',textAlign:'center',minWidth:70}}>
                <div style={{fontSize:20,fontWeight:800,color:c}}>{v}</div>
                <div style={{fontSize:10,color:c,opacity:0.8}}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        {msg.text&&(
          <div style={{marginBottom:16,padding:'12px 16px',borderRadius:10,fontSize:13,fontWeight:600,
            background:msg.type==='ok'?'rgba(16,185,129,.1)':'rgba(239,68,68,.1)',
            border:msg.type==='ok'?'1px solid rgba(16,185,129,.25)':'1px solid rgba(239,68,68,.25)',
            color:msg.type==='ok'?'#34D399':'#FCA5A5'}}>{msg.text}</div>
        )}

        {/* Tabs */}
        <div style={{display:'flex',gap:8,marginBottom:20}}>
          {btnTab('form', editId?'Editar OS':'Nova OS')}
          {btnTab('lista','Lista de OS',list.length)}
        </div>

        {/* FORMULARIO */}
        {tab==='form'&&(
          <div style={{background:'#0F1729',border:'1px solid rgba(96,165,250,0.07)',borderRadius:16,padding:24}}>
            <div style={{fontSize:14,fontWeight:800,color:'#EEF2FF',marginBottom:18,paddingBottom:14,borderBottom:'1px solid rgba(96,165,250,0.07)',display:'flex',alignItems:'center',gap:8}}>
              {editId?'Editando OS #'+editId:'Criar Nova OS / Orcamento'}
              {editId&&<button onClick={()=>{resetForm();setTab('lista')}} style={{marginLeft:'auto',padding:'4px 12px',borderRadius:8,background:'rgba(239,68,68,.12)',border:'1px solid rgba(239,68,68,.25)',color:'#FCA5A5',fontSize:12,cursor:'pointer'}}>Cancelar</button>}
            </div>
            <form onSubmit={save}>
              {/* Linha 1 */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:14,marginBottom:14}}>
                <div>
                  <label style={{display:'block',fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:6}}>Tipo</label>
                  <select value={form.tipo} onChange={e=>f('tipo',e.target.value)} style={{...S,appearance:'none',cursor:'pointer'}}>
                    <option value="OS">Ordem de Servico</option>
                    <option value="ORC">Orcamento</option>
                  </select>
                </div>
                <div>
                  <label style={{display:'block',fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:6}}>Prioridade</label>
                  <select value={form.prioridade} onChange={e=>f('prioridade',e.target.value)} style={{...S,appearance:'none',cursor:'pointer'}}>
                    {PRIORIDADES.map(p=><option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{display:'block',fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:6}}>Status</label>
                  <select value={form.status} onChange={e=>f('status',e.target.value)} style={{...S,appearance:'none',cursor:'pointer'}}>
                    {STATUS.map(s=><option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{display:'block',fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:6}}>Tipo de Servico</label>
                  <select value={form.tipo_servico} onChange={e=>f('tipo_servico',e.target.value)} style={{...S,appearance:'none',cursor:'pointer'}}>
                    <option value="">Selecione...</option>
                    {SERVICOS.map(s=><option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {/* Cliente e Tecnico */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14}}>
                <div>
                  <label style={{display:'block',fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:6}}>Cliente *</label>
                  <select value={form.cliente_id} onChange={e=>f('cliente_id',e.target.value)} style={{...S,appearance:'none',cursor:'pointer'}}>
                    <option value="">Selecione o cliente...</option>
                    {clientes.map(c=><option key={c.id} value={c.id}>{c.nome} {c.telefone?'— '+c.telefone:''}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{display:'block',fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:6}}>Tecnico Responsavel</label>
                  <select value={form.tecnico_id} onChange={e=>f('tecnico_id',e.target.value)} style={{...S,appearance:'none',cursor:'pointer'}}>
                    <option value="">Selecione o tecnico...</option>
                    {tecnicos.map(t=><option key={t.id} value={t.id}>{t.nome}</option>)}
                  </select>
                </div>
              </div>

              {/* Datas e valores */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:14,marginBottom:14}}>
                <div>
                  <label style={{display:'block',fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:6}}>Data Abertura</label>
                  <input type="date" value={form.data_abertura} onChange={e=>f('data_abertura',e.target.value)} style={S}/>
                </div>
                <div>
                  <label style={{display:'block',fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:6}}>Previsao de Conclusao</label>
                  <input type="date" value={form.data_previsao} onChange={e=>f('data_previsao',e.target.value)} style={S}/>
                </div>
                <div>
                  <label style={{display:'block',fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:6}}>Hora do Atendimento</label>
                  <input type="time" value={form.hora_atendimento} onChange={e=>f('hora_atendimento',e.target.value)} style={S}/>
                </div>
                <div>
                  <label style={{display:'block',fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:6}}>Valor do Servico (R$)</label>
                  <input type="number" step="0.01" min="0" placeholder="0,00" value={form.valor} onChange={e=>f('valor',e.target.value)} style={S}/>
                </div>
                <div>
                  <label style={{display:'block',fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:6}}>Desconto (R$)</label>
                  <input type="number" step="0.01" min="0" placeholder="0,00" value={form.desconto} onChange={e=>f('desconto',e.target.value)} style={S}/>
                </div>
              </div>

              {/* Descricao */}
              <div style={{marginBottom:14}}>
                <label style={{display:'block',fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:6}}>Descricao do Problema / Servico *</label>
                <textarea required placeholder="Descreva detalhadamente o problema ou servico a ser realizado..." value={form.descricao} onChange={e=>f('descricao',e.target.value)} style={{...S,minHeight:90,resize:'vertical'}}/>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:16}}>
                <div>
                  <label style={{display:'block',fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:6}}>Pecas / Materiais Utilizados</label>
                  <textarea placeholder="Liste as pecas e materiais necessarios..." value={form.pecas} onChange={e=>f('pecas',e.target.value)} style={{...S,minHeight:70,resize:'vertical'}}/>
                </div>
                <div>
                  <label style={{display:'block',fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:6}}>Observacoes Internas</label>
                  <textarea placeholder="Notas internas, nao visiveis ao cliente..." value={form.observacoes} onChange={e=>f('observacoes',e.target.value)} style={{...S,minHeight:70,resize:'vertical'}}/>
                </div>
              </div>

              <div style={{display:'flex',justifyContent:'flex-end',gap:10}}>
                <button type="button" onClick={resetForm} style={{padding:'10px 20px',borderRadius:10,background:'#162040',border:'1px solid rgba(96,165,250,0.13)',color:'#8899BB',fontSize:13,fontWeight:600,cursor:'pointer'}}>Limpar</button>
                <button type="submit" disabled={saving} style={{padding:'10px 28px',borderRadius:10,background:'#1A56DB',border:'none',color:'#fff',fontSize:13,fontWeight:800,cursor:'pointer',opacity:saving?0.6:1}}>
                  {saving?'Salvando...':editId?'Atualizar OS':'Criar OS'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* LISTA */}
        {tab==='lista'&&(
          <div>
            {/* Tabs tipo */}
            <div style={{display:'flex',gap:8,marginBottom:14}}>
              {[
                {v:'todos',l:'Todos',c:list.length},
                {v:'OS',l:'Ordens de Servico',c:totais.os},
                {v:'ORC',l:'Orcamentos',c:totais.orc},
              ].map(({v,l,c})=>(
                <button key={v} onClick={()=>setTipoView(v)} style={{
                  padding:'8px 18px',borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer',border:'none',
                  background:tipoView===v?(v==='ORC'?'#8B5CF6':'#1A56DB'):'#162040',
                  color:tipoView===v?'#fff':'#8899BB',
                }}>
                  {l} <span style={{background:'rgba(255,255,255,0.15)',borderRadius:20,padding:'1px 8px',fontSize:11,marginLeft:4}}>{c}</span>
                </button>
              ))}
            </div>
            {/* Filtros */}
            <div style={{background:'#0F1729',border:'1px solid rgba(96,165,250,0.07)',borderRadius:16,padding:16,marginBottom:16,display:'flex',gap:10,flexWrap:'wrap',alignItems:'center'}}>
              <input placeholder="Buscar por cliente, tecnico, servico ou #OS..." value={search} onChange={e=>setSearch(e.target.value)}
                style={{...S,flex:1,minWidth:200,padding:'8px 14px',fontSize:13}}/>
              <select value={filtroStatus} onChange={e=>setFiltroStatus(e.target.value)} style={{...S,width:'auto',padding:'8px 14px',fontSize:13,appearance:'none',cursor:'pointer'}}>
                <option value="">Todos os status</option>
                {STATUS.map(s=><option key={s}>{s}</option>)}
              </select>
              <select value={filtroPrio} onChange={e=>setFiltroPrio(e.target.value)} style={{...S,width:'auto',padding:'8px 14px',fontSize:13,appearance:'none',cursor:'pointer'}}>
                <option value="">Toda prioridade</option>
                {PRIORIDADES.map(p=><option key={p}>{p}</option>)}
              </select>
              {(search||filtroStatus||filtroPrio)&&(
                <button onClick={()=>{setSearch('');setFiltroStatus('');setFiltroPrio('')}} style={{padding:'8px 14px',borderRadius:10,background:'rgba(239,68,68,.12)',border:'1px solid rgba(239,68,68,.25)',color:'#FCA5A5',fontSize:12,fontWeight:600,cursor:'pointer'}}>Limpar filtros</button>
              )}
              <span style={{fontSize:12,color:'#3D5070'}}>{filtered.length} resultado(s)</span>
            </div>

            {/* Tabela */}
            <div style={{background:'#0F1729',border:'1px solid rgba(96,165,250,0.07)',borderRadius:16,overflow:'hidden'}}>
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse'}}>
                  <thead>
                    <tr style={{background:'rgba(15,23,41,0.6)'}}>
                      {['#','Tipo','Cliente','Tecnico','Servico','Valor','Prioridade','Status','Acoes'].map(h=>(
                        <th key={h} style={{padding:'11px 14px',textAlign:'left',fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'1px',textTransform:'uppercase',borderBottom:'1px solid rgba(96,165,250,0.07)',whiteSpace:'nowrap'}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading?(
                      <tr><td colSpan={9} style={{padding:40,textAlign:'center',color:'#3D5070'}}>Carregando...</td></tr>
                    ):filtered.length===0?(
                      <tr><td colSpan={9} style={{padding:40,textAlign:'center',color:'#3D5070'}}>Nenhuma OS encontrada</td></tr>
                    ):filtered.map(o=>{
                      const {bg:sbg,color:sc} = stBadge(o.status)
                      const {bg:pbg,color:pc} = prBadge(o.prioridade)
                      return (
                        <tr key={o.id}
                          onClick={()=>setModal(o)}
                          onMouseEnter={e=>{e.currentTarget.style.background='rgba(96,165,250,0.04)';e.currentTarget.style.cursor='pointer'}}
                          onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                          <td style={{padding:'12px 14px',borderBottom:'1px solid rgba(96,165,250,0.05)',fontSize:11,fontFamily:'monospace',color:'#3D5070',fontWeight:700}}>#{o.id}</td>
                          <td style={{padding:'12px 14px',borderBottom:'1px solid rgba(96,165,250,0.05)'}}>
                            <span style={{padding:'2px 8px',borderRadius:6,fontSize:11,fontWeight:700,background:o.tipo==='OS'?'rgba(96,165,250,.15)':'rgba(139,92,246,.15)',color:o.tipo==='OS'?'#93C5FD':'#C4B5FD'}}>{o.tipo}</span>
                          </td>
                          <td style={{padding:'12px 14px',borderBottom:'1px solid rgba(96,165,250,0.05)'}}>
                            <div style={{fontWeight:700,color:'#EEF2FF',fontSize:13}}>{o.clientes?.nome||'—'}</div>
                            <div style={{fontSize:11,color:'#3D5070',marginTop:1}}>{o.clientes?.telefone||''}</div>
                          </td>
                          <td style={{padding:'12px 14px',borderBottom:'1px solid rgba(96,165,250,0.05)',fontSize:13,color:'#8899BB'}}>{o.usuarios?.nome||'—'}</td>
                          <td style={{padding:'12px 14px',borderBottom:'1px solid rgba(96,165,250,0.05)',fontSize:13,color:'#8899BB'}}>{o.tipo_servico||'—'}</td>
                          <td style={{padding:'12px 14px',borderBottom:'1px solid rgba(96,165,250,0.05)',fontSize:13,fontWeight:700,color:'#34D399',whiteSpace:'nowrap'}}>{fmtVal(o.valor)}</td>
                          <td style={{padding:'12px 14px',borderBottom:'1px solid rgba(96,165,250,0.05)'}}>
                            <span style={{padding:'2px 9px',borderRadius:20,fontSize:11,fontWeight:700,background:pbg,color:pc}}>{o.prioridade}</span>
                          </td>
                          <td style={{padding:'12px 14px',borderBottom:'1px solid rgba(96,165,250,0.05)'}}>
                            <span style={{padding:'2px 9px',borderRadius:20,fontSize:11,fontWeight:700,background:sbg,color:sc}}>{o.status}</span>
                          </td>
                          <td style={{padding:'12px 14px',borderBottom:'1px solid rgba(96,165,250,0.05)'}}>
                            <div style={{display:'flex',gap:5}} onClick={e=>e.stopPropagation()}>
                              <button onClick={()=>editOS(o)} style={{padding:'4px 10px',borderRadius:7,background:'rgba(26,86,219,.15)',border:'1px solid rgba(26,86,219,.3)',color:'#60A5FA',fontSize:11,fontWeight:600,cursor:'pointer'}}>Editar</button>
                              <button onClick={()=>del(o.id)} style={{padding:'4px 10px',borderRadius:7,background:'rgba(239,68,68,.12)',border:'1px solid rgba(239,68,68,.25)',color:'#FCA5A5',fontSize:11,fontWeight:600,cursor:'pointer'}}>Remover</button>
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
        )}
      </div>

      {/* MODAL DETALHES */}
      {modal&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.8)',zIndex:500,display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(4px)'}} onClick={()=>setModal(null)}>
          <div style={{background:'#0F1729',border:'1px solid rgba(96,165,250,0.2)',borderRadius:20,padding:28,width:600,maxHeight:'90vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
            {/* Header modal */}
            <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:20,paddingBottom:16,borderBottom:'1px solid rgba(96,165,250,0.07)'}}>
              <div>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                  <span style={{fontSize:11,fontFamily:'monospace',color:'#3D5070',fontWeight:700}}>OS #{modal.id}</span>
                  <span style={{padding:'2px 8px',borderRadius:6,fontSize:11,fontWeight:700,background:modal.tipo==='OS'?'rgba(96,165,250,.15)':'rgba(139,92,246,.15)',color:modal.tipo==='OS'?'#93C5FD':'#C4B5FD'}}>{modal.tipo}</span>
                  <span style={{padding:'2px 9px',borderRadius:20,fontSize:11,fontWeight:700,background:prBadge(modal.prioridade).bg,color:prBadge(modal.prioridade).color}}>{modal.prioridade}</span>
                </div>
                <div style={{fontSize:18,fontWeight:800,color:'#EEF2FF'}}>{modal.clientes?.nome||'—'}</div>
                <div style={{fontSize:12,color:'#3D5070',marginTop:2}}>{modal.clientes?.telefone||''}</div>
              </div>
              <button onClick={()=>setModal(null)} style={{background:'rgba(96,165,250,0.1)',border:'1px solid rgba(96,165,250,0.2)',color:'#8899BB',fontSize:18,cursor:'pointer',borderRadius:8,width:32,height:32,display:'flex',alignItems:'center',justifyContent:'center'}}>x</button>
            </div>

            {/* Info grid */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:16}}>
              {[
                ['Tecnico',modal.usuarios?.nome],
                ['Servico',modal.tipo_servico],
                ['Abertura',fmtDate(modal.data_abertura)],
                ['Previsao',fmtDate(modal.data_previsao)],
                ['Valor',fmtVal(modal.valor)],
                ['Desconto',fmtVal(modal.desconto)],
                ['Valor Final',fmtVal((parseFloat(modal.valor)||0)-(parseFloat(modal.desconto)||0))],
              ].map(([l,v])=>(
                <div key={l} style={{background:'rgba(96,165,250,0.04)',borderRadius:10,padding:'10px 14px'}}>
                  <div style={{fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:4}}>{l}</div>
                  <div style={{fontSize:13,color:'#EEF2FF',fontWeight:600}}>{v||'—'}</div>
                </div>
              ))}
            </div>

            {/* Descricao */}
            <div style={{background:'rgba(26,86,219,0.08)',border:'1px solid rgba(26,86,219,0.2)',borderRadius:12,padding:14,marginBottom:12}}>
              <div style={{fontSize:10,fontWeight:700,color:'#60A5FA',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:8}}>Descricao</div>
              <div style={{fontSize:13,color:'#EEF2FF',lineHeight:1.6}}>{modal.descricao}</div>
            </div>

            {modal.pecas&&(
              <div style={{background:'rgba(96,165,250,0.05)',borderRadius:12,padding:14,marginBottom:12}}>
                <div style={{fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:8}}>Pecas / Materiais</div>
                <div style={{fontSize:13,color:'#8899BB',lineHeight:1.6}}>{modal.pecas}</div>
              </div>
            )}

            {/* Atualizar status */}
            <div style={{marginBottom:16}}>
              <div style={{fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:8}}>Atualizar Status Rapido</div>
              <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                {STATUS.map(s=>{
                  const {bg,color} = stBadge(s)
                  const ativo = modal.status===s
                  return (
                    <button key={s} onClick={()=>updateStatus(modal.id,s)}
                      style={{padding:'6px 12px',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',
                        background:ativo?bg:'transparent',
                        border:`1px solid ${color}50`,
                        color:ativo?color:'#3D5070',
                        opacity:ativo?1:0.7}}>
                      {ativo?'✓ ':''}{s}
                    </button>
                  )
                })}
              </div>
            </div>

            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              {modal.tipo==='ORC' && (
                <button onClick={()=>aprovarOrc(modal)} style={{flex:1,padding:'11px',borderRadius:10,background:'rgba(16,185,129,.15)',border:'1px solid rgba(16,185,129,.3)',color:'#34D399',fontSize:13,fontWeight:700,cursor:'pointer'}}>✅ Aprovar Orcamento → OS</button>
              )}
              <button onClick={()=>{editOS(modal);setModal(null)}} style={{flex:1,padding:'11px',borderRadius:10,background:'rgba(26,86,219,.15)',border:'1px solid rgba(26,86,219,.3)',color:'#60A5FA',fontSize:13,fontWeight:700,cursor:'pointer'}}>Editar</button>
              <button onClick={()=>{
                const tecnico = modal.usuarios?.nome || 'A definir'
                const cliente = modal.clientes?.nome || ''
                const telefone = modal.clientes?.telefone || ''
                const valor = modal.valor ? 'R$ '+parseFloat(modal.valor).toLocaleString('pt-BR',{minimumFractionDigits:2}) : 'A definir'
                const desconto = modal.desconto && parseFloat(modal.desconto) > 0 ? 'R$ '+parseFloat(modal.desconto).toLocaleString('pt-BR',{minimumFractionDigits:2}) : null
                const valFinal = 'R$ '+(parseFloat(modal.valor||0)-parseFloat(modal.desconto||0)).toLocaleString('pt-BR',{minimumFractionDigits:2})
                const msg = [
                  '*OperaxPro — '+(modal.tipo==='ORC'?'Orcamento':'Ordem de Servico')+' #'+modal.id+'*',
                  '',
                  '*Cliente:* '+cliente,
                  '*Tipo:* '+modal.tipo_servico || 'Servico geral',
                  '*Tecnico:* '+tecnico,
                  '*Status:* '+modal.status,
                  '*Prioridade:* '+modal.prioridade,
                  '',
                  '*Descricao:*',
                  modal.descricao,
                  '',
                  modal.pecas ? '*Pecas/Materiais:* '+modal.pecas : '',
                  '*Valor do Servico:* '+valor,
                  desconto ? '*Desconto:* '+desconto : '',
                  '*Valor Final:* '+valFinal,
                  '',
                  modal.data_abertura ? '*Abertura:* '+new Date(modal.data_abertura+'T00:00:00').toLocaleDateString("pt-BR") : '',
                  modal.data_previsao ? '*Previsao:* '+new Date(modal.data_previsao+'T00:00:00').toLocaleDateString("pt-BR") : '',
                  '',
                  '_Enviado pelo OperaxPro_',
                ].filter(Boolean).join('\n')
                const url = 'https://wa.me/?text='+encodeURIComponent(msg)
                window.open(url,'_blank')
              }} style={{padding:'11px 16px',borderRadius:10,background:'rgba(37,211,102,0.15)',border:'1px solid rgba(37,211,102,0.3)',color:'#25D366',fontSize:13,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:6}}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                WhatsApp
              </button>
              <button onClick={()=>del(modal.id)} style={{padding:'11px 16px',borderRadius:10,background:'rgba(239,68,68,.12)',border:'1px solid rgba(239,68,68,.25)',color:'#FCA5A5',fontSize:13,fontWeight:700,cursor:'pointer'}}>Remover</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
