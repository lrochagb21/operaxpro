'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import AppLayout from '@/components/layout/AppLayout'

const STATUS = ['Aberta','Em Andamento','Aguardando Peça','Concluída','Cancelada']
const PRIORIDADES = ['Normal','Alta','Urgente']
const SERVICOS = ['Instalação','Manutenção Preventiva','Manutenção Corretiva','Reparo','Vistoria','Suporte Técnico','Outro']
const empty = {tipo:'OS',prioridade:'Normal',cliente_id:'',tecnico_id:'',tipo_servico:'',status:'Aberta',valor:'',desconto:'',descricao:'',pecas:'',observacoes:'',data_abertura:'',data_previsao:'',hora_atendimento:'',tipo_horario:''}

const stBadge = s=>({
  'Aberta':          {bg:'rgba(245,158,11,.15)',  color:'#FCD34D',border:'rgba(245,158,11,.3)'},
  'Em Andamento':    {bg:'rgba(96,165,250,.15)',  color:'#93C5FD',border:'rgba(96,165,250,.3)'},
  'Aguardando Peça': {bg:'rgba(139,92,246,.15)',  color:'#C4B5FD',border:'rgba(139,92,246,.3)'},
  'Concluída':       {bg:'rgba(16,185,129,.15)',  color:'#34D399',border:'rgba(16,185,129,.3)'},
  'Cancelada':       {bg:'rgba(239,68,68,.15)',   color:'#FCA5A5',border:'rgba(239,68,68,.3)'},
}[s]||{bg:'rgba(96,165,250,.15)',color:'#93C5FD',border:'rgba(96,165,250,.3)'})

const prBadge = p=>({
  'Normal':  {bg:'rgba(96,165,250,.1)',  color:'#93C5FD'},
  'Alta':    {bg:'rgba(245,158,11,.15)', color:'#FCD34D'},
  'Urgente': {bg:'rgba(239,68,68,.2)',   color:'#FCA5A5'},
}[p]||{bg:'rgba(96,165,250,.1)',color:'#93C5FD'})

const fmtVal = v => v ? 'R$ '+parseFloat(v).toLocaleString('pt-BR',{minimumFractionDigits:2}) : '—'
const fmtDate = d => d ? new Date(d+'T00:00:00').toLocaleDateString('pt-BR') : '—'

export default function OS() {
  const [list, setList]         = useState([])
  const [clientes, setClientes] = useState([])
  const [tecnicos, setTecnicos] = useState([])
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [msg, setMsg]           = useState({text:'',type:''})
  const [modal, setModal]       = useState(null)
  const [modalForm, setModalForm] = useState(false)
  const [editId, setEditId]     = useState(null)
  const [form, setForm]         = useState(empty)
  const [search, setSearch]     = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [viewTab, setViewTab]   = useState('abertas') // abertas | andamento | urgentes | concluidas | todas

  useEffect(()=>{ loadAll() },[])

  async function loadAll() {
    setLoading(true)
    const [osRes,cliRes,tecRes] = await Promise.all([
      supabase.from('ordens_servico').select('*,clientes(nome,telefone),usuarios(nome)').order('criado_em',{ascending:false}),
      supabase.from('clientes').select('id,nome,telefone').order('nome'),
      supabase.from('usuarios').select('id,nome').eq('perfil','tecnico').eq('status','ativo').order('nome'),
    ])
    setList(osRes.data||[])
    setClientes(cliRes.data||[])
    setTecnicos(tecRes.data||[])
    setLoading(false)
  }

  async function save(e) {
    e.preventDefault()
    if (!form.cliente_id) { showMsg('Selecione o cliente','err'); return }
    if (!form.descricao.trim()) { showMsg('Descreva o problema','err'); return }
    setSaving(true)
    const payload = {
      ...form,
      empresa_id:1,
      valor: parseFloat(form.valor)||0,
      desconto: parseFloat(form.desconto)||0,
      tecnico_id: form.tecnico_id||null,
      data_abertura: form.data_abertura||new Date().toISOString().split('T')[0],
      data_previsao: form.data_previsao||null,
      hora_atendimento: form.hora_atendimento||null,
    }
    if (editId) {
      const {error} = await supabase.from('ordens_servico').update(payload).eq('id',editId)
      if (error) showMsg('Erro: '+error.message,'err')
      else { showMsg('Atualizado!','ok'); resetForm() }
    } else {
      const {error} = await supabase.from('ordens_servico').insert(payload)
      if (error) showMsg('Erro: '+error.message,'err')
      else {
        if (form.data_abertura && form.hora_atendimento) {
          const cliSel = clientes.find(c=>String(c.id)===String(form.cliente_id))
          await supabase.from('agenda').insert({
            empresa_id:1, cliente_id:parseInt(form.cliente_id)||null,
            tecnico_id:form.tecnico_id||null,
            titulo:(form.tipo_servico||'Atendimento')+' — '+(cliSel?.nome||''),
            data:form.data_abertura, hora_inicio:form.hora_atendimento,
            telefone:cliSel?.telefone||'', tipo_servico:form.tipo_servico||'', status:'agendado',
          })
          showMsg(form.tipo==='OS'?'OS criada e adicionada à agenda!':'Orçamento criado e adicionado à agenda!','ok')
        } else {
          showMsg(form.tipo==='OS'?'OS criada com sucesso!':'Orçamento criado com sucesso!','ok')
        }
        resetForm()
      }
    }
    setSaving(false)
    loadAll()
  }

  async function updateStatus(id, status) {
    await supabase.from('ordens_servico').update({status,...(status==='Concluída'?{data_conclusao:new Date().toISOString().split('T')[0]}:{})}).eq('id',id)
    showMsg('Status atualizado!','ok')
    loadAll()
    if(modal) setModal(p=>({...p,status}))
  }

  async function aprovarOrc(o) {
    if (!confirm('Aprovar orçamento e converter em OS?')) return
    await supabase.from('ordens_servico').update({tipo:'OS',status:'Aberta'}).eq('id',o.id)
    if (o.data_abertura && o.hora_atendimento) {
      await supabase.from('agenda').insert({
        empresa_id:1, cliente_id:o.cliente_id, tecnico_id:o.tecnico_id||null,
        titulo:(o.tipo_servico||'Atendimento')+' — '+(o.clientes?.nome||''),
        data:o.data_abertura, hora_inicio:o.hora_atendimento,
        telefone:o.clientes?.telefone||'', tipo_servico:o.tipo_servico||'', status:'agendado',
      })
    }
    showMsg('Orçamento aprovado e convertido em OS!','ok')
    loadAll(); setModal(null)
  }

  async function del(id) {
    if (!confirm('Remover esta OS?')) return
    await supabase.from('ordens_servico').delete().eq('id',id)
    showMsg('Removida','ok'); setModal(null); loadAll()
  }

  function openForm(item=null) {
    if (item) {
      setEditId(item.id)
      setForm({tipo:item.tipo||'OS',prioridade:item.prioridade||'Normal',cliente_id:item.cliente_id||'',tecnico_id:item.tecnico_id||'',tipo_servico:item.tipo_servico||'',status:item.status||'Aberta',valor:item.valor||'',desconto:item.desconto||'',descricao:item.descricao||'',pecas:item.pecas||'',observacoes:item.observacoes||'',data_abertura:item.data_abertura||'',data_previsao:item.data_previsao||'',hora_atendimento:item.hora_atendimento||'',tipo_horario:item.hora_atendimento?item.hora_atendimento.includes('Manhã')||item.hora_atendimento.includes('Tarde')||item.hora_atendimento.includes('Noite')?'periodo':'hora':''})
    } else {
      setEditId(null)
      setForm({...empty, data_abertura:new Date().toISOString().split('T')[0]})
    }
    setModal(null)
    setModalForm(true)
  }

  function resetForm() { setForm({...empty,data_abertura:new Date().toISOString().split('T')[0]}); setEditId(null); setModalForm(false) }
  function showMsg(text,type) { setMsg({text,type}); setTimeout(()=>setMsg({text:'',type:''}),4000) }
  function f(k,v) { setForm(p=>({...p,[k]:v})) }

  const os  = list.filter(i=>i.tipo==='OS')
  const orc = list.filter(i=>i.tipo==='ORC')

  const getFiltered = (items) => items.filter(o=>{
    const matchSearch = !search || o.clientes?.nome?.toLowerCase().includes(search.toLowerCase()) || o.usuarios?.nome?.toLowerCase().includes(search.toLowerCase()) || o.tipo_servico?.toLowerCase().includes(search.toLowerCase()) || String(o.id).includes(search)
    return matchSearch
  })

  const grupos = {
    urgentes:  os.filter(o=>o.prioridade==='Urgente'&&o.status!=='Concluída'&&o.status!=='Cancelada'),
    abertas:   os.filter(o=>o.status==='Aberta'),
    andamento: os.filter(o=>o.status==='Em Andamento'||o.status==='Aguardando Peça'),
    concluidas:os.filter(o=>o.status==='Concluída'),
    orcamentos:orc,
  }

  const OSCard = ({o, destaque}) => {
    const {bg,color,border} = stBadge(o.status)
    const {bg:pbg,color:pc} = prBadge(o.prioridade)
    const urgente = o.prioridade==='Urgente'&&o.status!=='Concluída'
    return (
      <div onClick={()=>setModal(o)}
        style={{background: urgente?'rgba(239,68,68,0.06)':'#0F1729',
          border: urgente?'1px solid rgba(239,68,68,0.3)':'1px solid rgba(96,165,250,0.07)',
          borderLeft: urgente?'4px solid #EF4444': o.tipo==='ORC'?'4px solid #8B5CF6':'4px solid #1A56DB',
          borderRadius:'0 14px 14px 0', padding:16, cursor:'pointer', transition:'all .15s',marginBottom:8}}
        onMouseEnter={e=>e.currentTarget.style.transform='translateX(3px)'}
        onMouseLeave={e=>e.currentTarget.style.transform='translateX(0)'}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8,flexWrap:'wrap',gap:6}}>
          <div style={{display:'flex',alignItems:'center',gap:6}}>
            <span style={{fontSize:11,fontFamily:'monospace',color:'#3D5070',fontWeight:700}}>#{o.id}</span>
            <span style={{padding:'2px 8px',borderRadius:6,fontSize:11,fontWeight:700,background:o.tipo==='OS'?'rgba(96,165,250,.15)':'rgba(139,92,246,.15)',color:o.tipo==='OS'?'#93C5FD':'#C4B5FD'}}>{o.tipo}</span>
            {urgente&&<span style={{padding:'2px 8px',borderRadius:6,fontSize:11,fontWeight:800,background:'rgba(239,68,68,.2)',color:'#FCA5A5'}}>🚨 URGENTE</span>}
            <span style={{padding:'2px 8px',borderRadius:6,fontSize:11,fontWeight:700,background:pbg,color:pc}}>{o.prioridade}</span>
          </div>
          <span style={{padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:700,background:bg,color,border:`1px solid ${border}`}}>{o.status}</span>
        </div>
        <div style={{fontSize:15,fontWeight:800,color:'#EEF2FF',marginBottom:3}}>{o.clientes?.nome||'—'}</div>
        <div style={{display:'flex',gap:12,flexWrap:'wrap',marginBottom:6}}>
          {o.usuarios?.nome&&<span style={{fontSize:12,color:'#3D5070'}}>👷 {o.usuarios.nome}</span>}
          {o.tipo_servico&&<span style={{fontSize:12,color:'#8899BB'}}>🔧 {o.tipo_servico}</span>}
          {o.data_abertura&&<span style={{fontSize:12,color:'#3D5070'}}>📅 {fmtDate(o.data_abertura)}{o.hora_atendimento?' • '+o.hora_atendimento.slice(0,5):''}</span>}
        </div>
        {o.descricao&&<div style={{fontSize:12,color:'#8899BB',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden',lineHeight:1.5}}>{o.descricao}</div>}
        {o.valor>0&&<div style={{fontSize:13,fontWeight:800,color:'#34D399',marginTop:6}}>{fmtVal(o.valor)}{o.desconto>0?' (desc: '+fmtVal(o.desconto)+')':''}</div>}
      </div>
    )
  }

  const Section = ({title, items, color, icon, empty}) => (
    <div style={{marginBottom:24}}>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12,paddingBottom:10,borderBottom:'1px solid rgba(96,165,250,0.07)'}}>
        <span style={{fontSize:16}}>{icon}</span>
        <span style={{fontSize:14,fontWeight:800,color}}>{title}</span>
        <span style={{background:'rgba(96,165,250,0.1)',color:'#60A5FA',borderRadius:20,padding:'1px 10px',fontSize:12,fontWeight:700}}>{items.length}</span>
      </div>
      {items.length===0?(
        <div style={{textAlign:'center',color:'#3D5070',fontSize:13,padding:'20px 0'}}>{empty}</div>
      ):getFiltered(items).map(o=><OSCard key={o.id} o={o}/>)}
    </div>
  )

  return (
    <AppLayout>
      <div style={{padding:24,maxWidth:1200}}>

        {/* Header */}
        <div style={{marginBottom:20,display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
          <div>
            <h1 style={{fontSize:22,fontWeight:800,color:'#EEF2FF'}}>Ordens de Serviço</h1>
            <p style={{fontSize:12,color:'#3D5070',marginTop:3}}>Gestão completa de OS e orçamentos</p>
          </div>
          <button onClick={()=>openForm()}
            style={{padding:'12px 24px',borderRadius:12,background:'#1A56DB',border:'none',color:'#fff',fontSize:14,fontWeight:800,cursor:'pointer',boxShadow:'0 4px 20px rgba(26,86,219,.4)',display:'flex',alignItems:'center',gap:8}}>
            <span style={{fontSize:18}}>+</span> Nova OS / Orçamento
          </button>
        </div>

        {msg.text&&<div style={{marginBottom:16,padding:'12px 16px',borderRadius:10,fontSize:13,fontWeight:600,background:msg.type==='ok'?'rgba(16,185,129,.1)':'rgba(239,68,68,.1)',border:msg.type==='ok'?'1px solid rgba(16,185,129,.25)':'1px solid rgba(239,68,68,.25)',color:msg.type==='ok'?'#34D399':'#FCA5A5'}}>{msg.text}</div>}

        {/* KPIs */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',gap:10,marginBottom:20}}>
          {[
            {l:'Urgentes',v:grupos.urgentes.length,c:'#FCA5A5',bg:'rgba(239,68,68,.15)',icon:'🚨'},
            {l:'Abertas',v:grupos.abertas.length,c:'#FCD34D',bg:'rgba(245,158,11,.15)',icon:'📋'},
            {l:'Em Andamento',v:grupos.andamento.length,c:'#93C5FD',bg:'rgba(96,165,250,.15)',icon:'⚙️'},
            {l:'Concluídas',v:grupos.concluidas.length,c:'#34D399',bg:'rgba(16,185,129,.15)',icon:'✅'},
            {l:'Orçamentos',v:grupos.orcamentos.length,c:'#C4B5FD',bg:'rgba(139,92,246,.15)',icon:'📄'},
          ].map(({l,v,c,bg,icon})=>(
            <div key={l} style={{background:bg,border:`1px solid ${c}40`,borderRadius:14,padding:'14px 16px',textAlign:'center',cursor:'pointer'}}
              onClick={()=>setViewTab(l==='Urgentes'?'urgentes':l==='Abertas'?'abertas':l==='Em Andamento'?'andamento':l==='Concluídas'?'concluidas':'orcamentos')}>
              <div style={{fontSize:22,marginBottom:4}}>{icon}</div>
              <div style={{fontSize:24,fontWeight:800,color:c}}>{v}</div>
              <div style={{fontSize:11,color:c,opacity:0.8,fontWeight:600}}>{l}</div>
            </div>
          ))}
        </div>

        {/* Busca + Tabs */}
        <div style={{background:'#0F1729',border:'1px solid rgba(96,165,250,0.07)',borderRadius:14,padding:14,marginBottom:16,display:'flex',gap:10,flexWrap:'wrap',alignItems:'center'}}>
          <input placeholder="Buscar por cliente, técnico, serviço ou #..." value={search} onChange={e=>setSearch(e.target.value)}
            style={{background:'#162040',border:'1px solid rgba(96,165,250,0.13)',color:'#EEF2FF',borderRadius:10,padding:'9px 14px',fontSize:13,fontFamily:'inherit',outline:'none',flex:1,minWidth:200}}/>
          {search&&<button onClick={()=>setSearch('')} style={{padding:'8px 14px',borderRadius:10,background:'rgba(239,68,68,.12)',border:'1px solid rgba(239,68,68,.25)',color:'#FCA5A5',fontSize:12,fontWeight:600,cursor:'pointer'}}>Limpar</button>}
        </div>

        {/* View Tabs */}
        <div style={{display:'flex',gap:6,marginBottom:20,flexWrap:'wrap'}}>
          {[
            {v:'urgentes',l:'🚨 Urgentes',c:grupos.urgentes.length},
            {v:'abertas',l:'📋 Abertas',c:grupos.abertas.length},
            {v:'andamento',l:'⚙️ Andamento',c:grupos.andamento.length},
            {v:'concluidas',l:'✅ Concluídas',c:grupos.concluidas.length},
            {v:'orcamentos',l:'📄 Orçamentos',c:grupos.orcamentos.length},
            {v:'todas',l:'Todas',c:list.length},
          ].map(({v,l,c})=>(
            <button key={v} onClick={()=>setViewTab(v)} style={{
              padding:'8px 16px',borderRadius:10,fontSize:12,fontWeight:700,cursor:'pointer',border:'none',
              background:viewTab===v?'#1A56DB':'#162040',
              color:viewTab===v?'#fff':'#8899BB',
            }}>
              {l} <span style={{background:'rgba(255,255,255,0.15)',borderRadius:20,padding:'1px 7px',fontSize:11,marginLeft:4}}>{c}</span>
            </button>
          ))}
        </div>

        {/* Conteudo */}
        {loading?(
          <div style={{textAlign:'center',color:'#3D5070',padding:60,fontSize:14}}>Carregando...</div>
        ):(
          <div>
            {viewTab==='urgentes'&&<Section title="Urgentes — Atenção imediata!" items={grupos.urgentes} color="#FCA5A5" icon="🚨" empty="Nenhuma OS urgente"/>}
            {viewTab==='abertas'&&<Section title="Ordens Abertas" items={grupos.abertas} color="#FCD34D" icon="📋" empty="Nenhuma OS aberta"/>}
            {viewTab==='andamento'&&<Section title="Em Andamento / Aguardando Peça" items={grupos.andamento} color="#93C5FD" icon="⚙️" empty="Nenhuma OS em andamento"/>}
            {viewTab==='concluidas'&&<Section title="Ordens Concluídas" items={grupos.concluidas} color="#34D399" icon="✅" empty="Nenhuma OS concluída ainda"/>}
            {viewTab==='orcamentos'&&<Section title="Orçamentos" items={grupos.orcamentos} color="#C4B5FD" icon="📄" empty="Nenhum orçamento criado"/>}
            {viewTab==='todas'&&(
              <>
                {grupos.urgentes.length>0&&<Section title="🚨 Urgentes" items={grupos.urgentes} color="#FCA5A5" icon="" empty=""/>}
                <Section title="Abertas" items={grupos.abertas} color="#FCD34D" icon="📋" empty="Nenhuma OS aberta"/>
                <Section title="Em Andamento" items={grupos.andamento} color="#93C5FD" icon="⚙️" empty="Nenhuma em andamento"/>
                <Section title="Orçamentos" items={grupos.orcamentos} color="#C4B5FD" icon="📄" empty="Nenhum orçamento"/>
                <Section title="Concluídas" items={grupos.concluidas} color="#34D399" icon="✅" empty="Nenhuma concluída"/>
              </>
            )}
          </div>
        )}
      </div>

      {/* MODAL DETALHES */}
      {modal&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.8)',zIndex:500,display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(4px)'}} onClick={()=>setModal(null)}>
          <div style={{background:'#0F1729',border:'1px solid rgba(96,165,250,0.2)',borderRadius:20,padding:28,width:600,maxHeight:'90vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:20,paddingBottom:16,borderBottom:'1px solid rgba(96,165,250,0.07)'}}>
              <div>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6,flexWrap:'wrap'}}>
                  <span style={{fontSize:11,fontFamily:'monospace',color:'#3D5070',fontWeight:700}}>#{modal.id}</span>
                  <span style={{padding:'2px 8px',borderRadius:6,fontSize:11,fontWeight:700,background:modal.tipo==='OS'?'rgba(96,165,250,.15)':'rgba(139,92,246,.15)',color:modal.tipo==='OS'?'#93C5FD':'#C4B5FD'}}>{modal.tipo}</span>
                  <span style={{padding:'2px 9px',borderRadius:20,fontSize:11,fontWeight:700,background:prBadge(modal.prioridade).bg,color:prBadge(modal.prioridade).color}}>{modal.prioridade}</span>
                  {modal.prioridade==='Urgente'&&<span style={{fontSize:12,fontWeight:800,color:'#FCA5A5'}}>🚨 URGENTE</span>}
                </div>
                <div style={{fontSize:18,fontWeight:800,color:'#EEF2FF'}}>{modal.clientes?.nome||'—'}</div>
                <div style={{fontSize:12,color:'#3D5070',marginTop:3}}>{modal.clientes?.telefone||''}</div>
              </div>
              <button onClick={()=>setModal(null)} style={{background:'rgba(96,165,250,0.1)',border:'1px solid rgba(96,165,250,0.2)',color:'#8899BB',fontSize:18,cursor:'pointer',borderRadius:8,width:32,height:32,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>x</button>
            </div>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
              {[
                ['Técnico',modal.usuarios?.nome],
                ['Serviço',modal.tipo_servico],
                ['Abertura',fmtDate(modal.data_abertura)],
                ['Previsão',fmtDate(modal.data_previsao)],
                ['Horário',modal.hora_atendimento?.slice(0,5)],
                ['Status',null],
                ['Valor',fmtVal(modal.valor)],
                ['Desconto',modal.desconto>0?fmtVal(modal.desconto):null],
                ['Valor Final',fmtVal((parseFloat(modal.valor)||0)-(parseFloat(modal.desconto)||0))],
              ].filter(([,v])=>v).map(([l,v])=>(
                <div key={l} style={{background:'rgba(96,165,250,0.04)',borderRadius:10,padding:'10px 14px'}}>
                  <div style={{fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:3}}>{l}</div>
                  {l==='Status'?(
                    <span style={{padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:700,background:stBadge(modal.status).bg,color:stBadge(modal.status).color}}>{modal.status}</span>
                  ):(
                    <div style={{fontSize:13,color:'#EEF2FF',fontWeight:600}}>{v}</div>
                  )}
                </div>
              ))}
            </div>

            <div style={{background:'rgba(26,86,219,0.08)',border:'1px solid rgba(26,86,219,0.2)',borderRadius:12,padding:14,marginBottom:12}}>
              <div style={{fontSize:10,fontWeight:700,color:'#60A5FA',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:6}}>Descrição</div>
              <div style={{fontSize:13,color:'#EEF2FF',lineHeight:1.7}}>{modal.descricao}</div>
            </div>

            {modal.pecas&&(
              <div style={{background:'rgba(96,165,250,0.05)',borderRadius:12,padding:14,marginBottom:12}}>
                <div style={{fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:6}}>Peças / Materiais</div>
                <div style={{fontSize:13,color:'#8899BB',lineHeight:1.6}}>{modal.pecas}</div>
              </div>
            )}

            {/* Atualizar Status */}
            <div style={{marginBottom:14}}>
              <div style={{fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:8}}>Atualizar Status</div>
              <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                {STATUS.map(s=>{
                  const {bg,color}=stBadge(s); const ativo=modal.status===s
                  return<button key={s} onClick={()=>updateStatus(modal.id,s)} style={{padding:'6px 12px',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',background:ativo?bg:'transparent',border:`1px solid ${color}50`,color:ativo?color:'#3D5070'}}>{ativo?'✓ ':''}{s}</button>
                })}
              </div>
            </div>

            {/* Botoes */}
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              {modal.tipo==='ORC'&&(
                <button onClick={()=>aprovarOrc(modal)} style={{flex:1,padding:'11px',borderRadius:10,background:'rgba(16,185,129,.15)',border:'1px solid rgba(16,185,129,.3)',color:'#34D399',fontSize:13,fontWeight:700,cursor:'pointer'}}>✅ Aprovar → OS</button>
              )}
              <button onClick={()=>openForm(modal)} style={{flex:1,padding:'11px',borderRadius:10,background:'rgba(26,86,219,.15)',border:'1px solid rgba(26,86,219,.3)',color:'#60A5FA',fontSize:13,fontWeight:700,cursor:'pointer'}}>✏️ Editar</button>
              <button onClick={()=>{
                const tel=(modal.clientes?.telefone||'').replace(/\D/g,'')
                const m=[
                  '*OperaxPro — '+(modal.tipo==='ORC'?'Orçamento':'Ordem de Serviço')+' #'+modal.id+'*','',
                  '*Cliente:* '+(modal.clientes?.nome||''),
                  '*Serviço:* '+(modal.tipo_servico||'—'),
                  '*Técnico:* '+(modal.usuarios?.nome||'A definir'),
                  '*Status:* '+modal.status,
                  '*Prioridade:* '+modal.prioridade,'',
                  '*Descrição:*',modal.descricao,'',
                  modal.pecas?'*Peças:* '+modal.pecas:'',
                  '*Valor:* '+fmtVal(modal.valor),
                  modal.desconto>0?'*Desconto:* '+fmtVal(modal.desconto):'',
                  '*Valor Final:* '+fmtVal((parseFloat(modal.valor)||0)-(parseFloat(modal.desconto)||0)),'',
                  modal.data_abertura?'*Data:* '+fmtDate(modal.data_abertura):'',
                  modal.hora_atendimento?'*Horário:* '+modal.hora_atendimento.slice(0,5):'','',
                  '_Enviado pelo OperaxPro_'
                ].filter(Boolean).join('\n')
                window.open((tel?'https://wa.me/55'+tel:'https://wa.me')+'?text='+encodeURIComponent(m),'_blank')
              }} style={{padding:'11px 14px',borderRadius:10,background:'rgba(37,211,102,0.15)',border:'1px solid rgba(37,211,102,0.3)',color:'#25D366',fontSize:13,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:6}}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                WhatsApp
              </button>
              <button onClick={()=>del(modal.id)} style={{padding:'11px 14px',borderRadius:10,background:'rgba(239,68,68,.12)',border:'1px solid rgba(239,68,68,.25)',color:'#FCA5A5',fontSize:13,fontWeight:700,cursor:'pointer'}}>🗑️</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FORMULARIO */}
      {modalForm&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.85)',zIndex:500,display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(4px)'}} onClick={resetForm}>
          <div style={{background:'#0F1729',border:'1px solid rgba(96,165,250,0.2)',borderRadius:20,padding:28,width:640,maxHeight:'90vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
              <span style={{fontSize:16,fontWeight:800,color:'#EEF2FF'}}>{editId?'Editar':'Nova'} OS / Orçamento</span>
              <button onClick={resetForm} style={{background:'rgba(96,165,250,0.1)',border:'1px solid rgba(96,165,250,0.2)',color:'#8899BB',fontSize:18,cursor:'pointer',borderRadius:8,width:32,height:32,display:'flex',alignItems:'center',justifyContent:'center'}}>x</button>
            </div>

            {/* Tipo selector */}
            <div style={{display:'flex',gap:8,marginBottom:20,background:'#162040',borderRadius:12,padding:6}}>
              {[{v:'OS',l:'📋 Ordem de Serviço'},{v:'ORC',l:'📄 Orçamento'}].map(({v,l})=>(
                <button key={v} onClick={()=>f('tipo',v)} style={{flex:1,padding:'12px',borderRadius:9,border:'none',cursor:'pointer',fontSize:13,fontWeight:800,
                  background:form.tipo===v?'#1A56DB':'transparent',
                  color:form.tipo===v?'#fff':'#8899BB',
                  boxShadow:form.tipo===v?'0 4px 14px rgba(26,86,219,.4)':'none'}}>
                  {l}
                </button>
              ))}
            </div>

            <form onSubmit={save}>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:12,marginBottom:12}}>
                <div>
                  <label style={{display:'block',fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:6}}>Prioridade</label>
                  <select value={form.prioridade} onChange={e=>f('prioridade',e.target.value)} style={{background:'#162040',border:'1px solid rgba(96,165,250,0.13)',color:'#EEF2FF',borderRadius:10,padding:'10px 14px',fontSize:14,fontFamily:'inherit',outline:'none',width:'100%',appearance:'none',cursor:'pointer'}}>
                    {PRIORIDADES.map(p=><option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{display:'block',fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:6}}>Status</label>
                  <select value={form.status} onChange={e=>f('status',e.target.value)} style={{background:'#162040',border:'1px solid rgba(96,165,250,0.13)',color:'#EEF2FF',borderRadius:10,padding:'10px 14px',fontSize:14,fontFamily:'inherit',outline:'none',width:'100%',appearance:'none',cursor:'pointer'}}>
                    {STATUS.map(s=><option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{display:'block',fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:6}}>Tipo de Serviço</label>
                  <select value={form.tipo_servico} onChange={e=>f('tipo_servico',e.target.value)} style={{background:'#162040',border:'1px solid rgba(96,165,250,0.13)',color:'#EEF2FF',borderRadius:10,padding:'10px 14px',fontSize:14,fontFamily:'inherit',outline:'none',width:'100%',appearance:'none',cursor:'pointer'}}>
                    <option value="">Selecione...</option>
                    {SERVICOS.map(s=><option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
                <div style={{gridColumn:'1/-1'}}>
                  <label style={{display:'block',fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:6}}>Cliente *</label>
                  <select value={form.cliente_id} onChange={e=>f('cliente_id',e.target.value)} style={{background:'#162040',border:'1px solid rgba(96,165,250,0.13)',color:'#EEF2FF',borderRadius:10,padding:'10px 14px',fontSize:14,fontFamily:'inherit',outline:'none',width:'100%',appearance:'none',cursor:'pointer'}}>
                    <option value="">Selecione o cliente...</option>
                    {clientes.map(c=><option key={c.id} value={c.id}>{c.nome}{c.telefone?' — '+c.telefone:''}</option>)}
                  </select>
                </div>
                <div style={{gridColumn:'1/-1'}}>
                  <label style={{display:'block',fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:6}}>Técnico</label>
                  <select value={form.tecnico_id} onChange={e=>f('tecnico_id',e.target.value)} style={{background:'#162040',border:'1px solid rgba(96,165,250,0.13)',color:'#EEF2FF',borderRadius:10,padding:'10px 14px',fontSize:14,fontFamily:'inherit',outline:'none',width:'100%',appearance:'none',cursor:'pointer'}}>
                    <option value="">Selecione o técnico...</option>
                    {tecnicos.map(t=><option key={t.id} value={t.id}>{t.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{display:'block',fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:6}}>Data</label>
                  <input type="date" value={form.data_abertura} onChange={e=>f('data_abertura',e.target.value)} style={{background:'#162040',border:'1px solid rgba(96,165,250,0.13)',color:'#EEF2FF',borderRadius:10,padding:'10px 14px',fontSize:14,fontFamily:'inherit',outline:'none',width:'100%'}}/>
                </div>
                <div style={{gridColumn:'1/-1'}}>
                  <label style={{display:'block',fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:6}}>Horário do Atendimento</label>
                  <div style={{display:'flex',gap:6,marginBottom:8,background:'#0F1729',borderRadius:10,padding:4}}>
                    {[{v:'',l:'Sem horário'},{v:'hora',l:'Hora Marcada'},{v:'periodo',l:'Período'}].map(({v,l})=>(
                      <button key={v} type="button" onClick={()=>{f('hora_atendimento','');f('tipo_horario',v)}}
                        style={{flex:1,padding:'8px',borderRadius:7,border:'none',cursor:'pointer',fontSize:12,fontWeight:700,
                          background:(form.tipo_horario||'')=== v?'#1A56DB':'transparent',
                          color:(form.tipo_horario||'')=== v?'#fff':'#8899BB'}}>
                        {l}
                      </button>
                    ))}
                  </div>
                  {form.tipo_horario==='hora'&&(
                    <select value={form.hora_atendimento} onChange={e=>f('hora_atendimento',e.target.value)} style={{background:'#162040',border:'1px solid rgba(26,86,219,0.3)',color:'#EEF2FF',borderRadius:10,padding:'10px 14px',fontSize:14,fontFamily:'inherit',outline:'none',width:'100%',appearance:'none',cursor:'pointer'}}>
                      <option value="">Selecione o horário...</option>
                      {['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00'].map(h=><option key={h} value={h}>{h}</option>)}
                    </select>
                  )}
                  {form.tipo_horario==='periodo'&&(
                    <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
                      {[
                        {v:'Manhã (08h-12h)',l:'🌅 Manhã',s:'08h às 12h'},
                        {v:'Tarde (13h-18h)',l:'☀️ Tarde',s:'13h às 18h'},
                        {v:'Noite (19h-20h)',l:'🌙 Noite',s:'19h às 20h'},
                      ].map(({v,l,s})=>(
                        <button key={v} type="button" onClick={()=>f('hora_atendimento',v)}
                          style={{padding:'12px 8px',borderRadius:10,border:'none',cursor:'pointer',textAlign:'center',
                            background:form.hora_atendimento===v?'rgba(26,86,219,0.25)':'#162040',
                            border:form.hora_atendimento===v?'1px solid rgba(26,86,219,0.5)':'1px solid rgba(96,165,250,0.13)'}}>
                          <div style={{fontSize:18,marginBottom:4}}>{l.split(' ')[0]}</div>
                          <div style={{fontSize:12,fontWeight:700,color:form.hora_atendimento===v?'#60A5FA':'#EEF2FF'}}>{l.split(' ')[1]}</div>
                          <div style={{fontSize:10,color:'#3D5070',marginTop:2}}>{s}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label style={{display:'block',fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:6}}>Valor (R$)</label>
                  <input type="number" step="0.01" min="0" placeholder="0,00" value={form.valor} onChange={e=>f('valor',e.target.value)} style={{background:'#162040',border:'1px solid rgba(96,165,250,0.13)',color:'#EEF2FF',borderRadius:10,padding:'10px 14px',fontSize:14,fontFamily:'inherit',outline:'none',width:'100%'}}/>
                </div>
                <div>
                  <label style={{display:'block',fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:6}}>Desconto (R$)</label>
                  <input type="number" step="0.01" min="0" placeholder="0,00" value={form.desconto} onChange={e=>f('desconto',e.target.value)} style={{background:'#162040',border:'1px solid rgba(96,165,250,0.13)',color:'#EEF2FF',borderRadius:10,padding:'10px 14px',fontSize:14,fontFamily:'inherit',outline:'none',width:'100%'}}/>
                </div>
              </div>

              <div style={{marginBottom:12}}>
                <label style={{display:'block',fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:6}}>Descrição do Problema / Serviço *</label>
                <textarea required placeholder="Descreva detalhadamente..." value={form.descricao} onChange={e=>f('descricao',e.target.value)} style={{background:'#162040',border:'1px solid rgba(96,165,250,0.13)',color:'#EEF2FF',borderRadius:10,padding:'10px 14px',fontSize:14,fontFamily:'inherit',outline:'none',width:'100%',minHeight:90,resize:'vertical'}}/>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:16}}>
                <div>
                  <label style={{display:'block',fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:6}}>Peças / Materiais</label>
                  <textarea placeholder="Liste as peças..." value={form.pecas} onChange={e=>f('pecas',e.target.value)} style={{background:'#162040',border:'1px solid rgba(96,165,250,0.13)',color:'#EEF2FF',borderRadius:10,padding:'10px 14px',fontSize:14,fontFamily:'inherit',outline:'none',width:'100%',minHeight:70,resize:'vertical'}}/>
                </div>
                <div>
                  <label style={{display:'block',fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:6}}>Observações</label>
                  <textarea placeholder="Notas internas..." value={form.observacoes} onChange={e=>f('observacoes',e.target.value)} style={{background:'#162040',border:'1px solid rgba(96,165,250,0.13)',color:'#EEF2FF',borderRadius:10,padding:'10px 14px',fontSize:14,fontFamily:'inherit',outline:'none',width:'100%',minHeight:70,resize:'vertical'}}/>
                </div>
              </div>

              <div style={{display:'flex',justifyContent:'flex-end',gap:10}}>
                <button type="button" onClick={resetForm} style={{padding:'11px 20px',borderRadius:10,background:'#162040',border:'1px solid rgba(96,165,250,0.13)',color:'#8899BB',fontSize:13,fontWeight:600,cursor:'pointer'}}>Cancelar</button>
                <button type="submit" disabled={saving} style={{padding:'11px 28px',borderRadius:10,background:'#1A56DB',border:'none',color:'#fff',fontSize:13,fontWeight:800,cursor:'pointer',opacity:saving?0.6:1,boxShadow:'0 4px 14px rgba(26,86,219,.35)'}}>
                  {saving?'Salvando...':editId?'Atualizar':'Criar '+form.tipo}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
