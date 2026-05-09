'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import AppLayout from '@/components/layout/AppLayout'

const S = {background:'#162040',border:'1px solid rgba(96,165,250,0.13)',color:'#EEF2FF',borderRadius:10,padding:'10px 14px',fontSize:14,fontFamily:'inherit',outline:'none',width:'100%'}
const CATEGORIAS_REC = ['Servico de OS','Orcamento Aprovado','Manutencao','Instalacao','Venda de Pecas','Outros']
const CATEGORIAS_DESP = ['Pecas e Materiais','Ferramentas','Combustivel','Alimentacao','Salarios','Impostos','Aluguel','Marketing','Outros']
const FORMAS_PAG = ['Dinheiro','PIX','Cartao de Credito','Cartao de Debito','Transferencia','Boleto','Cheque']
const empty = {tipo:'receita',descricao:'',valor:'',categoria:'',forma_pagamento:'',data:'',os_id:'',observacoes:''}

export default function Financeiro() {
  const [list, setList]       = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [msg, setMsg]         = useState({text:'',type:''})
  const [tab, setTab]         = useState('dashboard')
  const [editId, setEditId]   = useState(null)
  const [modal, setModal]     = useState(null)
  const [form, setForm]       = useState(empty)
  const [filtroMes, setFiltroMes] = useState(new Date().toISOString().slice(0,7))
  const [filtroTipo, setFiltroTipo] = useState('')

  useEffect(()=>{ load() },[])

  async function load() {
    setLoading(true)
    const {data} = await supabase.from('financeiro').select('*').order('data',{ascending:false})
    setList(data||[])
    setLoading(false)
  }

  async function save(e) {
    e.preventDefault()
    if (!form.descricao.trim()) { showMsg('Informe a descricao','err'); return }
    if (!form.valor) { showMsg('Informe o valor','err'); return }
    setSaving(true)
    const payload = {...form, empresa_id:1, valor:parseFloat(form.valor)||0, data:form.data||new Date().toISOString().split('T')[0]}
    if (editId) {
      const {error} = await supabase.from('financeiro').update(payload).eq('id',editId)
      if (error) showMsg('Erro: '+error.message,'err')
      else { showMsg('Lancamento atualizado!','ok'); resetForm(); setTab('lancamentos') }
    } else {
      const {error} = await supabase.from('financeiro').insert(payload)
      if (error) showMsg('Erro: '+error.message,'err')
      else { showMsg('Lancamento registrado!','ok'); resetForm(); setTab('lancamentos') }
    }
    setSaving(false)
    load()
  }

  async function del(id) {
    if (!confirm('Remover este lancamento?')) return
    await supabase.from('financeiro').delete().eq('id',id)
    showMsg('Removido','ok'); setModal(null); load()
  }

  function editItem(item) {
    setEditId(item.id)
    setForm({tipo:item.tipo||'receita',descricao:item.descricao||'',valor:item.valor||'',categoria:item.categoria||'',forma_pagamento:item.forma_pagamento||'',data:item.data||'',os_id:item.os_id||'',observacoes:item.observacoes||''})
    setTab('novo')
  }

  function resetForm() { setForm({...empty, data:new Date().toISOString().split('T')[0]}); setEditId(null) }
  function showMsg(text,type) { setMsg({text,type}); setTimeout(()=>setMsg({text:'',type:''}),4000) }
  function f(k,v) { setForm(p=>({...p,[k]:v})) }

  const fmtVal = v => v ? 'R$ '+parseFloat(v).toLocaleString('pt-BR',{minimumFractionDigits:2}) : 'R$ 0,00'
  const fmtDate = d => d ? new Date(d+'T00:00:00').toLocaleDateString('pt-BR') : '--'

  // Filtros
  const listMes = list.filter(i=> !filtroMes || i.data?.startsWith(filtroMes))
  const listFiltrada = listMes.filter(i=> !filtroTipo || i.tipo===filtroTipo)

  // Calculos
  const receitas  = listMes.filter(i=>i.tipo==='receita').reduce((a,i)=>a+parseFloat(i.valor||0),0)
  const despesas  = listMes.filter(i=>i.tipo==='despesa').reduce((a,i)=>a+parseFloat(i.valor||0),0)
  const saldo     = receitas - despesas
  const receitaTotal = list.filter(i=>i.tipo==='receita').reduce((a,i)=>a+parseFloat(i.valor||0),0)
  const despesaTotal = list.filter(i=>i.tipo==='despesa').reduce((a,i)=>a+parseFloat(i.valor||0),0)

  // Agrupamento por categoria
  const porCategoria = listMes.reduce((acc,i)=>{
    const key = (i.tipo==='receita'?'REC':'DESP')+':'+(i.categoria||'Sem categoria')
    if (!acc[key]) acc[key] = {tipo:i.tipo,categoria:i.categoria||'Sem categoria',total:0,count:0}
    acc[key].total += parseFloat(i.valor||0)
    acc[key].count++
    return acc
  },{})

  // Meses disponiveis
  const mesesDisp = [...new Set(list.map(i=>i.data?.slice(0,7)).filter(Boolean))].sort().reverse()

  const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

  return (
    <AppLayout>
      <div style={{padding:24,maxWidth:1200}}>
        {/* Header */}
        <div style={{marginBottom:20,display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
          <div>
            <h1 style={{fontSize:22,fontWeight:800,color:'#EEF2FF'}}>Financeiro</h1>
            <p style={{fontSize:12,color:'#3D5070',marginTop:3}}>Receitas, despesas e fluxo de caixa</p>
          </div>
          <button onClick={()=>{resetForm();setTab('novo')}}
            style={{padding:'11px 22px',borderRadius:11,background:'#1A56DB',border:'none',color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer',boxShadow:'0 4px 14px rgba(26,86,219,.35)'}}>
            + Novo Lancamento
          </button>
        </div>

        {msg.text&&<div style={{marginBottom:16,padding:'12px 16px',borderRadius:10,fontSize:13,fontWeight:600,background:msg.type==='ok'?'rgba(16,185,129,.1)':'rgba(239,68,68,.1)',border:msg.type==='ok'?'1px solid rgba(16,185,129,.25)':'1px solid rgba(239,68,68,.25)',color:msg.type==='ok'?'#34D399':'#FCA5A5'}}>{msg.text}</div>}

        {/* Tabs */}
        <div style={{display:'flex',gap:8,marginBottom:20,flexWrap:'wrap'}}>
          {[{v:'dashboard',l:'Dashboard'},{v:'lancamentos',l:'Lancamentos'},{v:'novo',l:editId?'Editar':'Novo Lancamento'}].map(({v,l})=>(
            <button key={v} onClick={()=>setTab(v)} style={{padding:'10px 18px',borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer',border:'none',background:tab===v?'#1A56DB':'#162040',color:tab===v?'#fff':'#8899BB'}}>{l}</button>
          ))}
        </div>

        {/* DASHBOARD */}
        {tab==='dashboard'&&(
          <div>
            {/* Filtro mes */}
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:20,flexWrap:'wrap'}}>
              <span style={{fontSize:12,color:'#3D5070',fontWeight:600}}>Periodo:</span>
              <select value={filtroMes} onChange={e=>setFiltroMes(e.target.value)} style={{...S,width:'auto',padding:'8px 14px',fontSize:13,appearance:'none',cursor:'pointer'}}>
                <option value="">Todos os meses</option>
                {mesesDisp.map(m=>{
                  const [y,mo] = m.split('-')
                  return <option key={m} value={m}>{MESES[parseInt(mo)-1]} {y}</option>
                })}
              </select>
            </div>

            {/* KPIs principais */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:12,marginBottom:20}}>
              <div style={{background:'rgba(16,185,129,0.1)',border:'1px solid rgba(16,185,129,0.25)',borderRadius:16,padding:20,position:'relative',overflow:'hidden'}}>
                <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:'#10B981',borderRadius:'16px 16px 0 0'}}/>
                <div style={{fontSize:11,fontWeight:700,color:'#34D399',letterSpacing:'1px',textTransform:'uppercase',marginBottom:8}}>Receitas</div>
                <div style={{fontSize:28,fontWeight:800,color:'#34D399',letterSpacing:'-1px'}}>{fmtVal(receitas)}</div>
                <div style={{fontSize:11,color:'#3D5070',marginTop:4}}>{listMes.filter(i=>i.tipo==='receita').length} lancamentos</div>
              </div>
              <div style={{background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.25)',borderRadius:16,padding:20,position:'relative',overflow:'hidden'}}>
                <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:'#EF4444',borderRadius:'16px 16px 0 0'}}/>
                <div style={{fontSize:11,fontWeight:700,color:'#FCA5A5',letterSpacing:'1px',textTransform:'uppercase',marginBottom:8}}>Despesas</div>
                <div style={{fontSize:28,fontWeight:800,color:'#FCA5A5',letterSpacing:'-1px'}}>{fmtVal(despesas)}</div>
                <div style={{fontSize:11,color:'#3D5070',marginTop:4}}>{listMes.filter(i=>i.tipo==='despesa').length} lancamentos</div>
              </div>
              <div style={{background:saldo>=0?'rgba(26,86,219,0.1)':'rgba(239,68,68,0.1)',border:`1px solid ${saldo>=0?'rgba(26,86,219,0.25)':'rgba(239,68,68,0.25)'}`,borderRadius:16,padding:20,position:'relative',overflow:'hidden'}}>
                <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:saldo>=0?'#1A56DB':'#EF4444',borderRadius:'16px 16px 0 0'}}/>
                <div style={{fontSize:11,fontWeight:700,color:saldo>=0?'#60A5FA':'#FCA5A5',letterSpacing:'1px',textTransform:'uppercase',marginBottom:8}}>Saldo do Periodo</div>
                <div style={{fontSize:28,fontWeight:800,color:saldo>=0?'#60A5FA':'#FCA5A5',letterSpacing:'-1px'}}>{fmtVal(Math.abs(saldo))}</div>
                <div style={{fontSize:11,color:'#3D5070',marginTop:4}}>{saldo>=0?'Positivo':'Negativo'}</div>
              </div>
              <div style={{background:'rgba(139,92,246,0.1)',border:'1px solid rgba(139,92,246,0.25)',borderRadius:16,padding:20,position:'relative',overflow:'hidden'}}>
                <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:'#8B5CF6',borderRadius:'16px 16px 0 0'}}/>
                <div style={{fontSize:11,fontWeight:700,color:'#C4B5FD',letterSpacing:'1px',textTransform:'uppercase',marginBottom:8}}>Saldo Geral</div>
                <div style={{fontSize:28,fontWeight:800,color:receitaTotal-despesaTotal>=0?'#C4B5FD':'#FCA5A5',letterSpacing:'-1px'}}>{fmtVal(Math.abs(receitaTotal-despesaTotal))}</div>
                <div style={{fontSize:11,color:'#3D5070',marginTop:4}}>Historico completo</div>
              </div>
            </div>

            {/* Barra de progresso receita x despesa */}
            {(receitas>0||despesas>0)&&(
              <div style={{background:'#0F1729',border:'1px solid rgba(96,165,250,0.07)',borderRadius:16,padding:20,marginBottom:16}}>
                <div style={{fontSize:12,fontWeight:700,color:'#EEF2FF',marginBottom:12}}>Receitas x Despesas</div>
                <div style={{height:24,borderRadius:12,overflow:'hidden',background:'#162040',display:'flex'}}>
                  {receitas>0&&<div style={{width:((receitas/(receitas+despesas))*100)+'%',background:'linear-gradient(90deg,#10B981,#34D399)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:'#fff',minWidth:40}}>
                    {((receitas/(receitas+despesas))*100).toFixed(0)}%
                  </div>}
                  {despesas>0&&<div style={{flex:1,background:'linear-gradient(90deg,#EF4444,#FCA5A5)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:'#fff',minWidth:40}}>
                    {((despesas/(receitas+despesas))*100).toFixed(0)}%
                  </div>}
                </div>
                <div style={{display:'flex',justifyContent:'space-between',marginTop:8,fontSize:12}}>
                  <span style={{color:'#34D399'}}>Receitas: {fmtVal(receitas)}</span>
                  <span style={{color:'#FCA5A5'}}>Despesas: {fmtVal(despesas)}</span>
                </div>
              </div>
            )}

            {/* Por categoria */}
            {Object.keys(porCategoria).length>0&&(
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                {/* Receitas por categoria */}
                <div style={{background:'#0F1729',border:'1px solid rgba(96,165,250,0.07)',borderRadius:16,padding:16}}>
                  <div style={{fontSize:12,fontWeight:800,color:'#34D399',marginBottom:12}}>Receitas por Categoria</div>
                  {Object.values(porCategoria).filter(i=>i.tipo==='receita').sort((a,b)=>b.total-a.total).map(item=>(
                    <div key={item.categoria} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid rgba(96,165,250,0.05)'}}>
                      <span style={{fontSize:13,color:'#8899BB'}}>{item.categoria}</span>
                      <div style={{textAlign:'right'}}>
                        <div style={{fontSize:13,fontWeight:700,color:'#34D399'}}>{fmtVal(item.total)}</div>
                        <div style={{fontSize:10,color:'#3D5070'}}>{item.count}x</div>
                      </div>
                    </div>
                  ))}
                  {Object.values(porCategoria).filter(i=>i.tipo==='receita').length===0&&<div style={{fontSize:13,color:'#3D5070',textAlign:'center',padding:16}}>Sem receitas no periodo</div>}
                </div>
                {/* Despesas por categoria */}
                <div style={{background:'#0F1729',border:'1px solid rgba(96,165,250,0.07)',borderRadius:16,padding:16}}>
                  <div style={{fontSize:12,fontWeight:800,color:'#FCA5A5',marginBottom:12}}>Despesas por Categoria</div>
                  {Object.values(porCategoria).filter(i=>i.tipo==='despesa').sort((a,b)=>b.total-a.total).map(item=>(
                    <div key={item.categoria} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid rgba(96,165,250,0.05)'}}>
                      <span style={{fontSize:13,color:'#8899BB'}}>{item.categoria}</span>
                      <div style={{textAlign:'right'}}>
                        <div style={{fontSize:13,fontWeight:700,color:'#FCA5A5'}}>{fmtVal(item.total)}</div>
                        <div style={{fontSize:10,color:'#3D5070'}}>{item.count}x</div>
                      </div>
                    </div>
                  ))}
                  {Object.values(porCategoria).filter(i=>i.tipo==='despesa').length===0&&<div style={{fontSize:13,color:'#3D5070',textAlign:'center',padding:16}}>Sem despesas no periodo</div>}
                </div>
              </div>
            )}
          </div>
        )}

        {/* LANCAMENTOS */}
        {tab==='lancamentos'&&(
          <div>
            <div style={{background:'#0F1729',border:'1px solid rgba(96,165,250,0.07)',borderRadius:14,padding:14,marginBottom:12,display:'flex',gap:10,flexWrap:'wrap',alignItems:'center'}}>
              <select value={filtroMes} onChange={e=>setFiltroMes(e.target.value)} style={{...S,width:'auto',padding:'8px 14px',fontSize:13,appearance:'none',cursor:'pointer'}}>
                <option value="">Todos os meses</option>
                {mesesDisp.map(m=>{
                  const [y,mo] = m.split('-')
                  return <option key={m} value={m}>{MESES[parseInt(mo)-1]} {y}</option>
                })}
              </select>
              <div style={{display:'flex',gap:6,background:'#162040',borderRadius:10,padding:4}}>
                {[{v:'',l:'Todos'},{v:'receita',l:'Receitas'},{v:'despesa',l:'Despesas'}].map(({v,l})=>(
                  <button key={v} onClick={()=>setFiltroTipo(v)} style={{padding:'7px 14px',borderRadius:8,border:'none',cursor:'pointer',fontSize:12,fontWeight:700,background:filtroTipo===v?'#1A56DB':'transparent',color:filtroTipo===v?'#fff':'#8899BB'}}>{l}</button>
                ))}
              </div>
              <div style={{marginLeft:'auto',fontSize:13,color:'#3D5070'}}>{listFiltrada.length} lancamentos</div>
            </div>

            <div style={{background:'#0F1729',border:'1px solid rgba(96,165,250,0.07)',borderRadius:16,overflow:'hidden'}}>
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse'}}>
                  <thead>
                    <tr style={{background:'rgba(15,23,41,0.6)'}}>
                      {['Data','Tipo','Descricao','Categoria','Forma Pag.','Valor','Acoes'].map(h=>(
                        <th key={h} style={{padding:'11px 14px',textAlign:'left',fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'1px',textTransform:'uppercase',borderBottom:'1px solid rgba(96,165,250,0.07)',whiteSpace:'nowrap'}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading?(<tr><td colSpan={7} style={{padding:40,textAlign:'center',color:'#3D5070'}}>Carregando...</td></tr>)
                    :listFiltrada.length===0?(<tr><td colSpan={7} style={{padding:40,textAlign:'center',color:'#3D5070'}}>Nenhum lancamento encontrado</td></tr>)
                    :listFiltrada.map(item=>(
                      <tr key={item.id} onClick={()=>setModal(item)}
                        onMouseEnter={e=>{e.currentTarget.style.background='rgba(96,165,250,0.03)';e.currentTarget.style.cursor='pointer'}}
                        onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                        <td style={{padding:'12px 14px',borderBottom:'1px solid rgba(96,165,250,0.05)',fontSize:13,color:'#3D5070',whiteSpace:'nowrap'}}>{fmtDate(item.data)}</td>
                        <td style={{padding:'12px 14px',borderBottom:'1px solid rgba(96,165,250,0.05)'}}>
                          <span style={{padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:700,
                            background:item.tipo==='receita'?'rgba(16,185,129,.15)':'rgba(239,68,68,.15)',
                            color:item.tipo==='receita'?'#34D399':'#FCA5A5'}}>
                            {item.tipo==='receita'?'Receita':'Despesa'}
                          </span>
                        </td>
                        <td style={{padding:'12px 14px',borderBottom:'1px solid rgba(96,165,250,0.05)',fontSize:13,fontWeight:600,color:'#EEF2FF'}}>{item.descricao}</td>
                        <td style={{padding:'12px 14px',borderBottom:'1px solid rgba(96,165,250,0.05)',fontSize:12,color:'#8899BB'}}>{item.categoria||'--'}</td>
                        <td style={{padding:'12px 14px',borderBottom:'1px solid rgba(96,165,250,0.05)',fontSize:12,color:'#8899BB'}}>{item.forma_pagamento||'--'}</td>
                        <td style={{padding:'12px 14px',borderBottom:'1px solid rgba(96,165,250,0.05)',fontSize:14,fontWeight:800,color:item.tipo==='receita'?'#34D399':'#FCA5A5',whiteSpace:'nowrap'}}>
                          {item.tipo==='receita'?'+ ':' - '}{fmtVal(item.valor)}
                        </td>
                        <td style={{padding:'12px 14px',borderBottom:'1px solid rgba(96,165,250,0.05)'}}>
                          <div style={{display:'flex',gap:5}} onClick={e=>e.stopPropagation()}>
                            <button onClick={()=>editItem(item)} style={{padding:'5px 10px',borderRadius:8,background:'rgba(26,86,219,.15)',border:'1px solid rgba(26,86,219,.3)',color:'#60A5FA',fontSize:11,fontWeight:600,cursor:'pointer'}}>Editar</button>
                            <button onClick={()=>del(item.id)} style={{padding:'5px 10px',borderRadius:8,background:'rgba(239,68,68,.12)',border:'1px solid rgba(239,68,68,.25)',color:'#FCA5A5',fontSize:11,fontWeight:600,cursor:'pointer'}}>Remover</button>
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

        {/* NOVO LANCAMENTO */}
        {tab==='novo'&&(
          <div style={{background:'#0F1729',border:'1px solid rgba(96,165,250,0.07)',borderRadius:16,padding:24}}>
            <div style={{fontSize:14,fontWeight:800,color:'#EEF2FF',marginBottom:18,paddingBottom:14,borderBottom:'1px solid rgba(96,165,250,0.07)',display:'flex',alignItems:'center',gap:8}}>
              {editId?'Editar Lancamento':'Novo Lancamento'}
              {editId&&<button onClick={()=>{resetForm();setTab('lancamentos')}} style={{marginLeft:'auto',padding:'4px 12px',borderRadius:8,background:'rgba(239,68,68,.12)',border:'1px solid rgba(239,68,68,.25)',color:'#FCA5A5',fontSize:12,cursor:'pointer'}}>Cancelar</button>}
            </div>
            <form onSubmit={save}>
              {/* Tipo */}
              <div style={{display:'flex',gap:8,marginBottom:20,background:'#162040',borderRadius:12,padding:6}}>
                {[{v:'receita',l:'Receita',c:'#34D399',bg:'rgba(16,185,129,.15)'},{v:'despesa',l:'Despesa',c:'#FCA5A5',bg:'rgba(239,68,68,.15)'}].map(({v,l,c,bg})=>(
                  <button key={v} type="button" onClick={()=>f('tipo',v)} style={{flex:1,padding:'12px',borderRadius:9,border:'none',cursor:'pointer',fontSize:14,fontWeight:800,
                    background:form.tipo===v?bg:'transparent',color:form.tipo===v?c:'#8899BB',
                    boxShadow:form.tipo===v?`0 0 0 1px ${c}50`:'none'}}>
                    {v==='receita'?'+ ':'- '}{l}
                  </button>
                ))}
              </div>

              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:14,marginBottom:14}}>
                <div style={{gridColumn:'1/-1'}}>
                  <label style={{display:'block',fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:6}}>Descricao *</label>
                  <input required placeholder="Ex: OS #5 - Manutencao ar condicionado Maria..." value={form.descricao} onChange={e=>f('descricao',e.target.value)} style={S}/>
                </div>
                <div>
                  <label style={{display:'block',fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:6}}>Valor (R$) *</label>
                  <input type="number" required step="0.01" min="0" placeholder="0,00" value={form.valor} onChange={e=>f('valor',e.target.value)} style={{...S,fontSize:18,fontWeight:700,color:form.tipo==='receita'?'#34D399':'#FCA5A5'}}/>
                </div>
                <div>
                  <label style={{display:'block',fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:6}}>Data</label>
                  <input type="date" value={form.data} onChange={e=>f('data',e.target.value)} style={S}/>
                </div>
                <div>
                  <label style={{display:'block',fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:6}}>Categoria</label>
                  <select value={form.categoria} onChange={e=>f('categoria',e.target.value)} style={{...S,appearance:'none',cursor:'pointer'}}>
                    <option value="">Selecione...</option>
                    {(form.tipo==='receita'?CATEGORIAS_REC:CATEGORIAS_DESP).map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{display:'block',fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:6}}>Forma de Pagamento</label>
                  <select value={form.forma_pagamento} onChange={e=>f('forma_pagamento',e.target.value)} style={{...S,appearance:'none',cursor:'pointer'}}>
                    <option value="">Selecione...</option>
                    {FORMAS_PAG.map(p=><option key={p}>{p}</option>)}
                  </select>
                </div>
                <div style={{gridColumn:'1/-1'}}>
                  <label style={{display:'block',fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:6}}>Observacoes</label>
                  <textarea placeholder="Informacoes adicionais..." value={form.observacoes} onChange={e=>f('observacoes',e.target.value)} style={{...S,minHeight:60,resize:'vertical'}}/>
                </div>
              </div>

              <div style={{display:'flex',justifyContent:'flex-end',gap:10}}>
                <button type="button" onClick={resetForm} style={{padding:'10px 20px',borderRadius:10,background:'#162040',border:'1px solid rgba(96,165,250,0.13)',color:'#8899BB',fontSize:13,fontWeight:600,cursor:'pointer'}}>Limpar</button>
                <button type="submit" disabled={saving} style={{padding:'10px 28px',borderRadius:10,background:form.tipo==='receita'?'#10B981':'#EF4444',border:'none',color:'#fff',fontSize:13,fontWeight:800,cursor:'pointer',opacity:saving?0.6:1}}>
                  {saving?'Salvando...':editId?'Atualizar':'Registrar '+( form.tipo==='receita'?'Receita':'Despesa')}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* MODAL DETALHES */}
      {modal&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.8)',zIndex:500,display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(4px)'}} onClick={()=>setModal(null)}>
          <div style={{background:'#0F1729',border:'1px solid rgba(96,165,250,0.2)',borderRadius:20,padding:26,width:420}} onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16,paddingBottom:14,borderBottom:'1px solid rgba(96,165,250,0.07)'}}>
              <div>
                <span style={{padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:700,background:modal.tipo==='receita'?'rgba(16,185,129,.15)':'rgba(239,68,68,.15)',color:modal.tipo==='receita'?'#34D399':'#FCA5A5',marginBottom:6,display:'inline-block'}}>
                  {modal.tipo==='receita'?'Receita':'Despesa'}
                </span>
                <div style={{fontSize:24,fontWeight:800,color:modal.tipo==='receita'?'#34D399':'#FCA5A5',marginTop:4}}>{fmtVal(modal.valor)}</div>
              </div>
              <button onClick={()=>setModal(null)} style={{background:'rgba(96,165,250,0.1)',border:'1px solid rgba(96,165,250,0.2)',color:'#8899BB',fontSize:18,cursor:'pointer',borderRadius:8,width:32,height:32,display:'flex',alignItems:'center',justifyContent:'center'}}>x</button>
            </div>
            <div style={{fontSize:15,fontWeight:700,color:'#EEF2FF',marginBottom:14}}>{modal.descricao}</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
              {[['Data',fmtDate(modal.data)],['Categoria',modal.categoria||'--'],['Forma Pagamento',modal.forma_pagamento||'--'],['OS Vinculada',modal.os_id?'#'+modal.os_id:'--']].map(([l,v])=>(
                <div key={l} style={{background:'rgba(96,165,250,0.04)',borderRadius:10,padding:'10px 12px'}}>
                  <div style={{fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:3}}>{l}</div>
                  <div style={{fontSize:13,color:'#EEF2FF',fontWeight:600}}>{v}</div>
                </div>
              ))}
            </div>
            {modal.observacoes&&<div style={{background:'rgba(96,165,250,0.04)',borderRadius:10,padding:'10px 12px',marginBottom:14}}>
              <div style={{fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:3}}>Observacoes</div>
              <div style={{fontSize:13,color:'#8899BB'}}>{modal.observacoes}</div>
            </div>}
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>{editItem(modal);setModal(null)}} style={{flex:1,padding:'10px',borderRadius:10,background:'rgba(26,86,219,.15)',border:'1px solid rgba(26,86,219,.3)',color:'#60A5FA',fontSize:13,fontWeight:700,cursor:'pointer'}}>Editar</button>
              <button onClick={()=>del(modal.id)} style={{padding:'10px 16px',borderRadius:10,background:'rgba(239,68,68,.12)',border:'1px solid rgba(239,68,68,.25)',color:'#FCA5A5',fontSize:13,fontWeight:700,cursor:'pointer'}}>Remover</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
