'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import AppLayout from '@/components/layout/AppLayout'

const S = {background:'#162040',border:'1px solid rgba(96,165,250,0.13)',color:'#EEF2FF',borderRadius:10,padding:'10px 14px',fontSize:14,fontFamily:'inherit',outline:'none',width:'100%'}
const CATEGORIAS = ['Pecas','Ferramentas','Equipamentos','Material Eletrico','Material Hidraulico','EPI','Consumiveis','Outro']
const empty = {nome:'',codigo_produto:'',marca:'',modelo:'',categoria:'',descricao:'',quantidade:0,quantidade_minima:0,estoque_maximo:0,unidade:'un',unidade_compra:'un',preco_custo:'',margem_lucro:'',preco_venda:'',fornecedor:'',localizacao:''}

export default function Estoque() {
  const [list,setList]               = useState([])
  const [loading,setLoading]         = useState(true)
  const [saving,setSaving]           = useState(false)
  const [msg,setMsg]                 = useState({text:'',type:''})
  const [search,setSearch]           = useState('')
  const [filtroAlerta,setFiltroAlerta] = useState(false)
  const [tab,setTab]                 = useState('lista')
  const [editId,setEditId]           = useState(null)
  const [modal,setModal]             = useState(null)
  const [modalAjuste,setModalAjuste] = useState(null)
  const [ajuste,setAjuste]           = useState({tipo:'entrada',quantidade:1,observacao:''})
  const [form,setForm]               = useState(empty)

  useEffect(()=>{ load() },[])

  async function load() {
    setLoading(true)
    const {data} = await supabase.from('estoque').select('*').order('nome',{ascending:true})
    setList(data||[])
    setLoading(false)
  }

  async function save(e) {
    e.preventDefault()
    if (!form.nome.trim()) { showMsg('Informe o nome','err'); return }
    setSaving(true)
    const payload = {
      ...form,
      empresa_id:1,
      quantidade:parseInt(form.quantidade)||0,
      quantidade_minima:parseInt(form.quantidade_minima)||0,
      estoque_maximo:parseInt(form.estoque_maximo)||0,
      preco_custo:parseFloat(form.preco_custo)||0,
      margem_lucro:parseFloat(form.margem_lucro)||0,
      preco_venda:parseFloat(form.preco_venda)||0,
      valor_unitario:parseFloat(form.preco_venda)||parseFloat(form.preco_custo)||0,
    }
    if (editId) {
      const {error} = await supabase.from('estoque').update(payload).eq('id',editId)
      if (error) showMsg('Erro: '+error.message,'err')
      else { showMsg('Item atualizado!','ok'); resetForm(); setTab('lista') }
    } else {
      const {error} = await supabase.from('estoque').insert(payload)
      if (error) showMsg('Erro: '+error.message,'err')
      else { showMsg('Item cadastrado!','ok'); resetForm(); setTab('lista') }
    }
    setSaving(false)
    load()
  }

  async function ajustarEstoque(e) {
    e.preventDefault()
    const item = list.find(i=>i.id===modalAjuste.id)
    const qtd = parseInt(ajuste.quantidade)||0
    const novaQtd = ajuste.tipo==='entrada' ? item.quantidade+qtd : Math.max(0,item.quantidade-qtd)
    const {error} = await supabase.from('estoque').update({quantidade:novaQtd}).eq('id',item.id)
    if (error) { showMsg('Erro: '+error.message,'err'); return }
    showMsg((ajuste.tipo==='entrada'?'Entrada':'Saida')+' de '+qtd+' '+item.unidade+' registrada!','ok')
    setModalAjuste(null)
    setAjuste({tipo:'entrada',quantidade:1,observacao:''})
    load()
  }

  async function del(id) {
    if (!confirm('Remover este item?')) return
    await supabase.from('estoque').delete().eq('id',id)
    showMsg('Item removido','ok'); load()
  }

  function editItem(item) {
    setEditId(item.id)
    setForm({
      nome:item.nome||'',codigo_produto:item.codigo_produto||'',marca:item.marca||'',modelo:item.modelo||'',
      categoria:item.categoria||'',descricao:item.descricao||'',
      quantidade:item.quantidade||0,quantidade_minima:item.quantidade_minima||0,estoque_maximo:item.estoque_maximo||0,
      unidade:item.unidade||'un',unidade_compra:item.unidade_compra||'un',
      preco_custo:item.preco_custo||'',margem_lucro:item.margem_lucro||'',preco_venda:item.preco_venda||'',
      fornecedor:item.fornecedor||'',localizacao:item.localizacao||'',
    })
    setTab('form')
  }

  function calcPrecoVenda() {
    const custo = parseFloat(form.preco_custo)||0
    const margem = parseFloat(form.margem_lucro)||0
    if (custo > 0 && margem > 0) {
      const venda = custo * (1 + margem/100)
      setForm(p=>({...p,preco_venda:venda.toFixed(2)}))
    }
  }

  function calcMargem() {
    const custo = parseFloat(form.preco_custo)||0
    const venda = parseFloat(form.preco_venda)||0
    if (custo > 0 && venda > 0) {
      const margem = ((venda - custo) / custo) * 100
      setForm(p=>({...p,margem_lucro:margem.toFixed(2)}))
    }
  }

  function resetForm() { setForm(empty); setEditId(null) }
  function showMsg(text,type) { setMsg({text,type}); setTimeout(()=>setMsg({text:'',type:''}),4000) }
  function f(k,v) { setForm(p=>({...p,[k]:v})) }

  const alertas = list.filter(i=>i.quantidade<=i.quantidade_minima)
  const filtered = list.filter(i=>{
    const ms = !search || i.nome?.toLowerCase().includes(search.toLowerCase()) || i.categoria?.toLowerCase().includes(search.toLowerCase()) || i.codigo_produto?.toLowerCase().includes(search.toLowerCase()) || i.marca?.toLowerCase().includes(search.toLowerCase())
    const ma = !filtroAlerta || i.quantidade<=i.quantidade_minima
    return ms && ma
  })

  const fmtVal = v => v ? 'R$ '+parseFloat(v).toLocaleString('pt-BR',{minimumFractionDigits:2}) : '--'
  const totalCusto = list.reduce((a,i)=>a+(parseFloat(i.preco_custo)||0)*i.quantidade,0)
  const totalVenda = list.reduce((a,i)=>a+(parseFloat(i.preco_venda)||parseFloat(i.valor_unitario)||0)*i.quantidade,0)

  return (
    <AppLayout>
      <div style={{padding:24,maxWidth:1300}}>
        {/* Header */}
        <div style={{marginBottom:24,display:'flex',alignItems:'flex-start',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
          <div>
            <h1 style={{fontSize:22,fontWeight:800,color:'#EEF2FF'}}>Estoque</h1>
            <p style={{fontSize:12,color:'#3D5070',marginTop:3}}>Controle de pecas, materiais e precificacao</p>
          </div>
          <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
            <div style={{background:'rgba(6,182,212,0.12)',border:'1px solid rgba(6,182,212,0.25)',borderRadius:12,padding:'10px 16px',textAlign:'center'}}>
              <div style={{fontSize:18,fontWeight:800,color:'#67E8F9'}}>{list.length}</div>
              <div style={{fontSize:10,color:'#3D5070'}}>itens</div>
            </div>
            {alertas.length>0&&(
              <div onClick={()=>setFiltroAlerta(!filtroAlerta)} style={{background:'rgba(239,68,68,0.12)',border:'1px solid rgba(239,68,68,0.25)',borderRadius:12,padding:'10px 16px',textAlign:'center',cursor:'pointer'}}>
                <div style={{fontSize:18,fontWeight:800,color:'#FCA5A5'}}>{alertas.length}</div>
                <div style={{fontSize:10,color:'#FCA5A5'}}>estoque baixo</div>
              </div>
            )}
            <div style={{background:'rgba(245,158,11,0.12)',border:'1px solid rgba(245,158,11,0.25)',borderRadius:12,padding:'10px 16px',textAlign:'center'}}>
              <div style={{fontSize:14,fontWeight:800,color:'#FCD34D'}}>{fmtVal(totalCusto)}</div>
              <div style={{fontSize:10,color:'#3D5070'}}>custo total</div>
            </div>
            <div style={{background:'rgba(16,185,129,0.12)',border:'1px solid rgba(16,185,129,0.25)',borderRadius:12,padding:'10px 16px',textAlign:'center'}}>
              <div style={{fontSize:14,fontWeight:800,color:'#34D399'}}>{fmtVal(totalVenda)}</div>
              <div style={{fontSize:10,color:'#3D5070'}}>valor de venda</div>
            </div>
          </div>
        </div>

        {msg.text&&<div style={{marginBottom:16,padding:'12px 16px',borderRadius:10,fontSize:13,fontWeight:600,background:msg.type==='ok'?'rgba(16,185,129,.1)':'rgba(239,68,68,.1)',border:msg.type==='ok'?'1px solid rgba(16,185,129,.25)':'1px solid rgba(239,68,68,.25)',color:msg.type==='ok'?'#34D399':'#FCA5A5'}}>{msg.text}</div>}

        {alertas.length>0&&!filtroAlerta&&(
          <div style={{background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:12,padding:'12px 16px',marginBottom:16,display:'flex',alignItems:'center',justifyContent:'space-between',gap:8,flexWrap:'wrap'}}>
            <div style={{fontSize:13,color:'#FCA5A5',fontWeight:700}}>Atencao: {alertas.length} item(ns) com estoque abaixo do minimo!</div>
            <button onClick={()=>setFiltroAlerta(true)} style={{padding:'6px 14px',borderRadius:8,background:'rgba(239,68,68,.15)',border:'1px solid rgba(239,68,68,.3)',color:'#FCA5A5',fontSize:12,fontWeight:600,cursor:'pointer'}}>Ver alertas</button>
          </div>
        )}

        <div style={{display:'flex',gap:8,marginBottom:20}}>
          {[{v:'lista',l:'Lista de Itens'},{v:'form',l:editId?'Editar Item':'Novo Item'}].map(({v,l})=>(
            <button key={v} onClick={()=>setTab(v)} style={{padding:'10px 20px',borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer',border:'none',background:tab===v?'#1A56DB':'#162040',color:tab===v?'#fff':'#8899BB'}}>{l}</button>
          ))}
        </div>

        {/* FORMULARIO */}
        {tab==='form'&&(
          <div style={{background:'#0F1729',border:'1px solid rgba(96,165,250,0.07)',borderRadius:16,padding:24}}>
            <div style={{fontSize:14,fontWeight:800,color:'#EEF2FF',marginBottom:18,paddingBottom:14,borderBottom:'1px solid rgba(96,165,250,0.07)',display:'flex',alignItems:'center',gap:8}}>
              {editId?'Editar Item':'Cadastrar Novo Item'}
              {editId&&<button onClick={()=>{resetForm();setTab('lista')}} style={{marginLeft:'auto',padding:'4px 12px',borderRadius:8,background:'rgba(239,68,68,.12)',border:'1px solid rgba(239,68,68,.25)',color:'#FCA5A5',fontSize:12,cursor:'pointer'}}>Cancelar</button>}
            </div>
            <form onSubmit={save}>

              {/* Identificacao */}
              <div style={{fontSize:11,fontWeight:700,color:'#60A5FA',letterSpacing:'1px',textTransform:'uppercase',marginBottom:10}}>Identificacao do Produto</div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:12,marginBottom:20}}>
                <div style={{gridColumn:'1/-1'}}>
                  <label style={{display:'block',fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:6}}>Nome do Item *</label>
                  <input required placeholder="Ex: Filtro de ar condicionado, Resistencia..." value={form.nome} onChange={e=>f('nome',e.target.value)} style={S}/>
                </div>
                <div>
                  <label style={{display:'block',fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:6}}>Codigo / SKU</label>
                  <input placeholder="Ex: FLT-001, RES-220V..." value={form.codigo_produto} onChange={e=>f('codigo_produto',e.target.value)} style={S}/>
                </div>
                <div>
                  <label style={{display:'block',fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:6}}>Marca</label>
                  <input placeholder="Ex: Samsung, Philco..." value={form.marca} onChange={e=>f('marca',e.target.value)} style={S}/>
                </div>
                <div>
                  <label style={{display:'block',fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:6}}>Modelo</label>
                  <input placeholder="Ex: BTU-12000, XY-220..." value={form.modelo} onChange={e=>f('modelo',e.target.value)} style={S}/>
                </div>
                <div>
                  <label style={{display:'block',fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:6}}>Categoria</label>
                  <select value={form.categoria} onChange={e=>f('categoria',e.target.value)} style={{...S,appearance:'none',cursor:'pointer'}}>
                    <option value="">Selecione...</option>
                    {CATEGORIAS.map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
                <div style={{gridColumn:'1/-1'}}>
                  <label style={{display:'block',fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:6}}>Descricao / Especificacoes Tecnicas</label>
                  <textarea placeholder="Descricao detalhada, especificacoes, compatibilidade..." value={form.descricao} onChange={e=>f('descricao',e.target.value)} style={{...S,minHeight:60,resize:'vertical'}}/>
                </div>
              </div>

              {/* Estoque */}
              <div style={{fontSize:11,fontWeight:700,color:'#67E8F9',letterSpacing:'1px',textTransform:'uppercase',marginBottom:10}}>Controle de Estoque</div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:12,marginBottom:20,background:'rgba(6,182,212,0.04)',border:'1px solid rgba(6,182,212,0.1)',borderRadius:12,padding:16}}>
                <div>
                  <label style={{display:'block',fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:6}}>Unidade</label>
                  <select value={form.unidade} onChange={e=>f('unidade',e.target.value)} style={{...S,appearance:'none',cursor:'pointer'}}>
                    {['un','kg','g','l','ml','m','cm','cx','pc','par','rolo'].map(u=><option key={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{display:'block',fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:6}}>Qtd Atual</label>
                  <input type="number" min="0" value={form.quantidade} onChange={e=>f('quantidade',e.target.value)} style={S}/>
                </div>
                <div>
                  <label style={{display:'block',fontSize:10,fontWeight:700,color:'#FCA5A5',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:6}}>Qtd Minima</label>
                  <input type="number" min="0" value={form.quantidade_minima} onChange={e=>f('quantidade_minima',e.target.value)} style={{...S,borderColor:'rgba(239,68,68,0.3)'}}/>
                </div>
                <div>
                  <label style={{display:'block',fontSize:10,fontWeight:700,color:'#34D399',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:6}}>Estoque Maximo</label>
                  <input type="number" min="0" value={form.estoque_maximo} onChange={e=>f('estoque_maximo',e.target.value)} style={{...S,borderColor:'rgba(16,185,129,0.3)'}}/>
                </div>
                <div>
                  <label style={{display:'block',fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:6}}>Fornecedor</label>
                  <input placeholder="Nome do fornecedor..." value={form.fornecedor} onChange={e=>f('fornecedor',e.target.value)} style={S}/>
                </div>
                <div>
                  <label style={{display:'block',fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:6}}>Localizacao</label>
                  <input placeholder="Ex: Prateleira A3..." value={form.localizacao} onChange={e=>f('localizacao',e.target.value)} style={S}/>
                </div>
              </div>

              {/* Precificacao */}
              <div style={{fontSize:11,fontWeight:700,color:'#34D399',letterSpacing:'1px',textTransform:'uppercase',marginBottom:10}}>Precificacao</div>
              <div style={{background:'rgba(16,185,129,0.04)',border:'1px solid rgba(16,185,129,0.1)',borderRadius:12,padding:16,marginBottom:20}}>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:12,marginBottom:12}}>
                  <div>
                    <label style={{display:'block',fontSize:10,fontWeight:700,color:'#FCD34D',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:6}}>Preco de Custo (R$)</label>
                    <input type="number" step="0.01" min="0" placeholder="0,00" value={form.preco_custo}
                      onChange={e=>f('preco_custo',e.target.value)}
                      onBlur={calcPrecoVenda}
                      style={{...S,borderColor:'rgba(245,158,11,0.3)'}}/>
                  </div>
                  <div>
                    <label style={{display:'block',fontSize:10,fontWeight:700,color:'#C4B5FD',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:6}}>Margem de Lucro (%)</label>
                    <input type="number" step="0.1" min="0" placeholder="Ex: 30" value={form.margem_lucro}
                      onChange={e=>f('margem_lucro',e.target.value)}
                      onBlur={calcPrecoVenda}
                      style={{...S,borderColor:'rgba(139,92,246,0.3)'}}/>
                  </div>
                  <div>
                    <label style={{display:'block',fontSize:10,fontWeight:700,color:'#34D399',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:6}}>Preco de Venda (R$)</label>
                    <input type="number" step="0.01" min="0" placeholder="0,00" value={form.preco_venda}
                      onChange={e=>f('preco_venda',e.target.value)}
                      onBlur={calcMargem}
                      style={{...S,borderColor:'rgba(16,185,129,0.3)'}}/>
                  </div>
                </div>
                {form.preco_custo&&form.preco_venda&&(
                  <div style={{display:'flex',gap:16,flexWrap:'wrap',padding:'10px 14px',background:'rgba(16,185,129,0.08)',borderRadius:10,fontSize:13}}>
                    <span style={{color:'#3D5070'}}>Lucro por unidade: <strong style={{color:'#34D399'}}>{fmtVal(parseFloat(form.preco_venda)-parseFloat(form.preco_custo))}</strong></span>
                    <span style={{color:'#3D5070'}}>Margem: <strong style={{color:'#C4B5FD'}}>{form.margem_lucro}%</strong></span>
                    {form.quantidade>0&&<span style={{color:'#3D5070'}}>Lucro total estoque: <strong style={{color:'#34D399'}}>{fmtVal((parseFloat(form.preco_venda)-parseFloat(form.preco_custo))*(parseInt(form.quantidade)||0))}</strong></span>}
                  </div>
                )}
                <div style={{fontSize:11,color:'#3D5070',marginTop:10}}>
                  Dica: Preencha o Preco de Custo e a Margem de Lucro, o Preco de Venda sera calculado automaticamente. Ou vice-versa.
                </div>
              </div>

              <div style={{display:'flex',justifyContent:'flex-end',gap:10}}>
                <button type="button" onClick={resetForm} style={{padding:'10px 20px',borderRadius:10,background:'#162040',border:'1px solid rgba(96,165,250,0.13)',color:'#8899BB',fontSize:13,fontWeight:600,cursor:'pointer'}}>Limpar</button>
                <button type="submit" disabled={saving} style={{padding:'10px 24px',borderRadius:10,background:'#1A56DB',border:'none',color:'#fff',fontSize:13,fontWeight:800,cursor:'pointer',opacity:saving?0.6:1}}>
                  {saving?'Salvando...':editId?'Atualizar Item':'Salvar Item'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* LISTA */}
        {tab==='lista'&&(
          <div>
            <div style={{background:'#0F1729',border:'1px solid rgba(96,165,250,0.07)',borderRadius:14,padding:14,marginBottom:12,display:'flex',gap:10,flexWrap:'wrap',alignItems:'center'}}>
              <input placeholder="Buscar por nome, codigo, marca ou categoria..." value={search} onChange={e=>setSearch(e.target.value)} style={{...S,flex:1,minWidth:200,padding:'8px 14px',fontSize:13}}/>
              <button onClick={()=>setFiltroAlerta(!filtroAlerta)} style={{padding:'8px 16px',borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer',border:'none',background:filtroAlerta?'rgba(239,68,68,.2)':'#162040',color:filtroAlerta?'#FCA5A5':'#8899BB'}}>
                {filtroAlerta?'Alertas ativos':'Ver alertas'}
              </button>
              {(search||filtroAlerta)&&<button onClick={()=>{setSearch('');setFiltroAlerta(false)}} style={{padding:'8px 14px',borderRadius:10,background:'rgba(239,68,68,.12)',border:'1px solid rgba(239,68,68,.25)',color:'#FCA5A5',fontSize:12,fontWeight:600,cursor:'pointer'}}>Limpar</button>}
            </div>

            <div style={{background:'#0F1729',border:'1px solid rgba(96,165,250,0.07)',borderRadius:16,overflow:'hidden'}}>
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse'}}>
                  <thead>
                    <tr style={{background:'rgba(15,23,41,0.6)'}}>
                      {['Item / Codigo','Marca / Modelo','Categoria','Estoque','Custo Unit.','Venda Unit.','Margem','Total Custo','Acoes'].map(h=>(
                        <th key={h} style={{padding:'11px 14px',textAlign:'left',fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'1px',textTransform:'uppercase',borderBottom:'1px solid rgba(96,165,250,0.07)',whiteSpace:'nowrap'}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading?(<tr><td colSpan={9} style={{padding:40,textAlign:'center',color:'#3D5070'}}>Carregando...</td></tr>)
                    :filtered.length===0?(<tr><td colSpan={9} style={{padding:40,textAlign:'center',color:'#3D5070'}}>Nenhum item encontrado</td></tr>)
                    :filtered.map(item=>{
                      const baixo = item.quantidade<=item.quantidade_minima
                      const margem = item.preco_custo&&item.preco_venda ? ((item.preco_venda-item.preco_custo)/item.preco_custo*100).toFixed(1) : null
                      return(
                        <tr key={item.id} onClick={()=>setModal(item)}
                          onMouseEnter={e=>{e.currentTarget.style.background='rgba(96,165,250,0.03)';e.currentTarget.style.cursor='pointer'}}
                          onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                          <td style={{padding:'13px 14px',borderBottom:'1px solid rgba(96,165,250,0.05)'}}>
                            <div style={{fontWeight:700,color:'#EEF2FF',fontSize:14}}>{item.nome}</div>
                            {item.codigo_produto&&<div style={{fontSize:11,color:'#60A5FA',marginTop:2,fontFamily:'monospace'}}>{item.codigo_produto}</div>}
                            {item.fornecedor&&<div style={{fontSize:11,color:'#3D5070',marginTop:1}}>{item.fornecedor}</div>}
                          </td>
                          <td style={{padding:'13px 14px',borderBottom:'1px solid rgba(96,165,250,0.05)'}}>
                            {item.marca&&<div style={{fontSize:13,fontWeight:600,color:'#EEF2FF'}}>{item.marca}</div>}
                            {item.modelo&&<div style={{fontSize:11,color:'#3D5070',marginTop:1}}>{item.modelo}</div>}
                            {!item.marca&&!item.modelo&&<span style={{color:'#3D5070'}}>--</span>}
                          </td>
                          <td style={{padding:'13px 14px',borderBottom:'1px solid rgba(96,165,250,0.05)',fontSize:12,color:'#8899BB'}}>{item.categoria||'--'}</td>
                          <td style={{padding:'13px 14px',borderBottom:'1px solid rgba(96,165,250,0.05)'}}>
                            <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
                              <span style={{fontSize:16,fontWeight:800,color:baixo?'#FCA5A5':'#34D399'}}>{item.quantidade}</span>
                              <span style={{fontSize:11,color:'#3D5070'}}>{item.unidade}</span>
                              {baixo&&<span style={{fontSize:10,color:'#FCA5A5',fontWeight:700,background:'rgba(239,68,68,.1)',padding:'2px 6px',borderRadius:6}}>BAIXO</span>}
                            </div>
                            {item.quantidade_minima>0&&<div style={{fontSize:10,color:'#3D5070',marginTop:2}}>min: {item.quantidade_minima}</div>}
                          </td>
                          <td style={{padding:'13px 14px',borderBottom:'1px solid rgba(96,165,250,0.05)',fontSize:13,color:'#FCD34D',fontWeight:600}}>{fmtVal(item.preco_custo||item.valor_unitario)}</td>
                          <td style={{padding:'13px 14px',borderBottom:'1px solid rgba(96,165,250,0.05)',fontSize:13,color:'#34D399',fontWeight:700}}>{fmtVal(item.preco_venda||item.valor_unitario)}</td>
                          <td style={{padding:'13px 14px',borderBottom:'1px solid rgba(96,165,250,0.05)'}}>
                            {margem?<span style={{fontSize:12,fontWeight:700,color:'#C4B5FD',background:'rgba(139,92,246,.1)',padding:'3px 8px',borderRadius:6}}>{margem}%</span>:<span style={{color:'#3D5070'}}>--</span>}
                          </td>
                          <td style={{padding:'13px 14px',borderBottom:'1px solid rgba(96,165,250,0.05)',fontSize:13,fontWeight:700,color:'#67E8F9'}}>{fmtVal((parseFloat(item.preco_custo)||parseFloat(item.valor_unitario)||0)*item.quantidade)}</td>
                          <td style={{padding:'13px 14px',borderBottom:'1px solid rgba(96,165,250,0.05)'}}>
                            <div style={{display:'flex',gap:5}} onClick={e=>e.stopPropagation()}>
                              <button onClick={()=>setModalAjuste(item)} style={{padding:'5px 10px',borderRadius:8,background:'rgba(16,185,129,.15)',border:'1px solid rgba(16,185,129,.3)',color:'#34D399',fontSize:11,fontWeight:600,cursor:'pointer'}}>Ajustar</button>
                              <button onClick={()=>editItem(item)} style={{padding:'5px 10px',borderRadius:8,background:'rgba(26,86,219,.15)',border:'1px solid rgba(26,86,219,.3)',color:'#60A5FA',fontSize:11,fontWeight:600,cursor:'pointer'}}>Editar</button>
                              <button onClick={()=>del(item.id)} style={{padding:'5px 10px',borderRadius:8,background:'rgba(239,68,68,.12)',border:'1px solid rgba(239,68,68,.25)',color:'#FCA5A5',fontSize:11,fontWeight:600,cursor:'pointer'}}>Remover</button>
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
          <div style={{background:'#0F1729',border:'1px solid rgba(96,165,250,0.2)',borderRadius:20,padding:26,width:520,maxHeight:'90vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16,paddingBottom:14,borderBottom:'1px solid rgba(96,165,250,0.07)'}}>
              <div>
                <div style={{fontSize:17,fontWeight:800,color:'#EEF2FF'}}>{modal.nome}</div>
                <div style={{display:'flex',gap:8,marginTop:4,flexWrap:'wrap'}}>
                  {modal.codigo_produto&&<span style={{fontSize:11,color:'#60A5FA',fontFamily:'monospace',background:'rgba(96,165,250,0.1)',padding:'2px 8px',borderRadius:6}}>{modal.codigo_produto}</span>}
                  {modal.marca&&<span style={{fontSize:11,color:'#8899BB'}}>{modal.marca} {modal.modelo||''}</span>}
                  {modal.categoria&&<span style={{fontSize:11,color:'#3D5070'}}>{modal.categoria}</span>}
                </div>
              </div>
              <button onClick={()=>setModal(null)} style={{background:'rgba(96,165,250,0.1)',border:'1px solid rgba(96,165,250,0.2)',color:'#8899BB',fontSize:18,cursor:'pointer',borderRadius:8,width:32,height:32,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>x</button>
            </div>

            {/* Estoque */}
            <div style={{fontSize:10,fontWeight:700,color:'#67E8F9',letterSpacing:'1px',textTransform:'uppercase',marginBottom:8}}>Estoque</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:16}}>
              {[
                ['Atual',modal.quantidade+' '+modal.unidade, modal.quantidade<=modal.quantidade_minima?'#FCA5A5':'#34D399'],
                ['Minimo',modal.quantidade_minima+' '+modal.unidade,'#FCA5A5'],
                ['Maximo',(modal.estoque_maximo||0)+' '+modal.unidade,'#34D399'],
              ].map(([l,v,c])=>(
                <div key={l} style={{background:'rgba(96,165,250,0.04)',borderRadius:10,padding:'10px 12px',textAlign:'center'}}>
                  <div style={{fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:4}}>{l}</div>
                  <div style={{fontSize:16,fontWeight:800,color:c}}>{v}</div>
                </div>
              ))}
            </div>

            {/* Precificacao */}
            <div style={{fontSize:10,fontWeight:700,color:'#34D399',letterSpacing:'1px',textTransform:'uppercase',marginBottom:8}}>Precificacao</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:16}}>
              {[
                ['Custo Unit.',fmtVal(modal.preco_custo||modal.valor_unitario),'#FCD34D'],
                ['Venda Unit.',fmtVal(modal.preco_venda||modal.valor_unitario),'#34D399'],
                ['Margem',modal.margem_lucro?modal.margem_lucro+'%':'--','#C4B5FD'],
              ].map(([l,v,c])=>(
                <div key={l} style={{background:'rgba(16,185,129,0.05)',borderRadius:10,padding:'10px 12px',textAlign:'center',border:'1px solid rgba(16,185,129,0.1)'}}>
                  <div style={{fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:4}}>{l}</div>
                  <div style={{fontSize:15,fontWeight:800,color:c}}>{v}</div>
                </div>
              ))}
            </div>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:16}}>
              {[
                ['Lucro por Unidade',fmtVal((parseFloat(modal.preco_venda)||0)-(parseFloat(modal.preco_custo)||0))],
                ['Total em Estoque (custo)',fmtVal((parseFloat(modal.preco_custo)||0)*modal.quantidade)],
                ['Total em Estoque (venda)',fmtVal((parseFloat(modal.preco_venda)||0)*modal.quantidade)],
                ['Lucro Total Potencial',fmtVal(((parseFloat(modal.preco_venda)||0)-(parseFloat(modal.preco_custo)||0))*modal.quantidade)],
              ].map(([l,v])=>(
                <div key={l} style={{background:'rgba(96,165,250,0.04)',borderRadius:10,padding:'10px 12px'}}>
                  <div style={{fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:3}}>{l}</div>
                  <div style={{fontSize:13,color:'#EEF2FF',fontWeight:600}}>{v}</div>
                </div>
              ))}
            </div>

            {[['Fornecedor',modal.fornecedor],['Localizacao',modal.localizacao]].filter(([,v])=>v).map(([l,v])=>(
              <div key={l} style={{background:'rgba(96,165,250,0.04)',borderRadius:10,padding:'10px 12px',marginBottom:8}}>
                <div style={{fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:3}}>{l}</div>
                <div style={{fontSize:13,color:'#EEF2FF'}}>{v}</div>
              </div>
            ))}

            {modal.descricao&&(
              <div style={{background:'rgba(96,165,250,0.04)',borderRadius:10,padding:'10px 12px',marginBottom:14}}>
                <div style={{fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:3}}>Descricao</div>
                <div style={{fontSize:13,color:'#8899BB',lineHeight:1.5}}>{modal.descricao}</div>
              </div>
            )}

            {modal.quantidade<=modal.quantidade_minima&&(
              <div style={{background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:10,padding:12,marginBottom:14,fontSize:13,color:'#FCA5A5',fontWeight:700}}>
                Estoque abaixo do minimo! Providencie reposicao.
              </div>
            )}

            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>{setModalAjuste(modal);setModal(null)}} style={{flex:1,padding:'10px',borderRadius:10,background:'rgba(16,185,129,.15)',border:'1px solid rgba(16,185,129,.3)',color:'#34D399',fontSize:13,fontWeight:700,cursor:'pointer'}}>Ajustar Estoque</button>
              <button onClick={()=>{editItem(modal);setModal(null)}} style={{flex:1,padding:'10px',borderRadius:10,background:'rgba(26,86,219,.15)',border:'1px solid rgba(26,86,219,.3)',color:'#60A5FA',fontSize:13,fontWeight:700,cursor:'pointer'}}>Editar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL AJUSTE */}
      {modalAjuste&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.8)',zIndex:500,display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(4px)'}} onClick={()=>setModalAjuste(null)}>
          <div style={{background:'#0F1729',border:'1px solid rgba(96,165,250,0.2)',borderRadius:20,padding:26,width:400}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:16,fontWeight:800,color:'#EEF2FF',marginBottom:4}}>Ajustar Estoque</div>
            <div style={{fontSize:13,color:'#3D5070',marginBottom:18}}>{modalAjuste.nome} — Atual: <strong style={{color:'#EEF2FF'}}>{modalAjuste.quantidade} {modalAjuste.unidade}</strong></div>
            <form onSubmit={ajustarEstoque}>
              <div style={{display:'flex',gap:8,marginBottom:16,background:'#162040',borderRadius:10,padding:4}}>
                {[{v:'entrada',l:'Entrada',c:'#34D399'},{v:'saida',l:'Saida',c:'#FCA5A5'}].map(({v,l,c})=>(
                  <button key={v} type="button" onClick={()=>setAjuste(p=>({...p,tipo:v}))}
                    style={{flex:1,padding:'10px',borderRadius:8,border:'none',cursor:'pointer',fontSize:13,fontWeight:700,
                      background:ajuste.tipo===v?'rgba(96,165,250,0.15)':'transparent',color:ajuste.tipo===v?c:'#8899BB'}}>
                    {l}
                  </button>
                ))}
              </div>
              <div style={{marginBottom:12}}>
                <label style={{display:'block',fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:6}}>Quantidade *</label>
                <input type="number" required min="1" value={ajuste.quantidade} onChange={e=>setAjuste(p=>({...p,quantidade:e.target.value}))} style={S}/>
              </div>
              <div style={{marginBottom:12}}>
                <label style={{display:'block',fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:6}}>Observacao</label>
                <input placeholder="Ex: Compra NF 1234, Uso na OS #5..." value={ajuste.observacao} onChange={e=>setAjuste(p=>({...p,observacao:e.target.value}))} style={S}/>
              </div>
              <div style={{background:'rgba(96,165,250,0.05)',borderRadius:10,padding:12,marginBottom:16,fontSize:13,color:'#8899BB'}}>
                Novo estoque: <strong style={{color:ajuste.tipo==='entrada'?'#34D399':'#FCA5A5',fontSize:15}}>
                  {ajuste.tipo==='entrada'?modalAjuste.quantidade+(parseInt(ajuste.quantidade)||0):Math.max(0,modalAjuste.quantidade-(parseInt(ajuste.quantidade)||0))} {modalAjuste.unidade}
                </strong>
              </div>
              <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
                <button type="button" onClick={()=>setModalAjuste(null)} style={{padding:'10px 20px',borderRadius:10,background:'#162040',border:'1px solid rgba(96,165,250,0.13)',color:'#8899BB',fontSize:13,fontWeight:600,cursor:'pointer'}}>Cancelar</button>
                <button type="submit" style={{padding:'10px 24px',borderRadius:10,background:ajuste.tipo==='entrada'?'#10B981':'#EF4444',border:'none',color:'#fff',fontSize:13,fontWeight:800,cursor:'pointer'}}>
                  Confirmar {ajuste.tipo==='entrada'?'Entrada':'Saida'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
