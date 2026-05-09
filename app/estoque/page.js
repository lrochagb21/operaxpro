'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import AppLayout from '@/components/layout/AppLayout'

const S = {background:'#162040',border:'1px solid rgba(96,165,250,0.13)',color:'#EEF2FF',borderRadius:10,padding:'10px 14px',fontSize:14,fontFamily:'inherit',outline:'none',width:'100%'}
const CATEGORIAS = ['Pecas','Ferramentas','Equipamentos','Material Eletrico','Material Hidraulico','EPI','Consumiveis','Outro']
const empty = {nome:'',categoria:'',descricao:'',quantidade:0,quantidade_minima:0,unidade:'un',valor_unitario:'',fornecedor:'',localizacao:''}

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
    const payload = {...form,empresa_id:1,quantidade:parseInt(form.quantidade)||0,quantidade_minima:parseInt(form.quantidade_minima)||0,valor_unitario:parseFloat(form.valor_unitario)||0}
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
    setForm({nome:item.nome||'',categoria:item.categoria||'',descricao:item.descricao||'',quantidade:item.quantidade||0,quantidade_minima:item.quantidade_minima||0,unidade:item.unidade||'un',valor_unitario:item.valor_unitario||'',fornecedor:item.fornecedor||'',localizacao:item.localizacao||''})
    setTab('form')
  }

  function resetForm() { setForm(empty); setEditId(null) }
  function showMsg(text,type) { setMsg({text,type}); setTimeout(()=>setMsg({text:'',type:''}),4000) }
  function f(k,v) { setForm(p=>({...p,[k]:v})) }

  const alertas = list.filter(i=>i.quantidade<=i.quantidade_minima)
  const filtered = list.filter(i=>{
    const ms = !search || i.nome?.toLowerCase().includes(search.toLowerCase()) || i.categoria?.toLowerCase().includes(search.toLowerCase())
    const ma = !filtroAlerta || i.quantidade<=i.quantidade_minima
    return ms && ma
  })
  const fmtVal = v => v ? 'R$ '+parseFloat(v).toLocaleString('pt-BR',{minimumFractionDigits:2}) : '--'
  const totalValor = list.reduce((a,i)=>a+(parseFloat(i.valor_unitario)||0)*i.quantidade,0)

  return (
    <AppLayout>
      <div style={{padding:24,maxWidth:1200}}>
        <div style={{marginBottom:24,display:'flex',alignItems:'flex-start',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
          <div>
            <h1 style={{fontSize:22,fontWeight:800,color:'#EEF2FF'}}>Estoque</h1>
            <p style={{fontSize:12,color:'#3D5070',marginTop:3}}>Controle de pecas e materiais</p>
          </div>
          <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
            <div style={{background:'rgba(6,182,212,0.15)',border:'1px solid rgba(6,182,212,0.3)',borderRadius:12,padding:'8px 16px',textAlign:'center'}}>
              <div style={{fontSize:18,fontWeight:800,color:'#67E8F9'}}>{list.length}</div>
              <div style={{fontSize:10,color:'#3D5070'}}>itens</div>
            </div>
            {alertas.length>0&&(
              <div onClick={()=>setFiltroAlerta(!filtroAlerta)} style={{background:'rgba(239,68,68,0.15)',border:'1px solid rgba(239,68,68,0.3)',borderRadius:12,padding:'8px 16px',textAlign:'center',cursor:'pointer'}}>
                <div style={{fontSize:18,fontWeight:800,color:'#FCA5A5'}}>{alertas.length}</div>
                <div style={{fontSize:10,color:'#FCA5A5'}}>alerta estoque</div>
              </div>
            )}
            <div style={{background:'rgba(16,185,129,0.15)',border:'1px solid rgba(16,185,129,0.3)',borderRadius:12,padding:'8px 16px',textAlign:'center'}}>
              <div style={{fontSize:15,fontWeight:800,color:'#34D399'}}>{fmtVal(totalValor)}</div>
              <div style={{fontSize:10,color:'#3D5070'}}>valor total</div>
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

        {tab==='form'&&(
          <div style={{background:'#0F1729',border:'1px solid rgba(96,165,250,0.07)',borderRadius:16,padding:24}}>
            <div style={{fontSize:14,fontWeight:800,color:'#EEF2FF',marginBottom:18,paddingBottom:14,borderBottom:'1px solid rgba(96,165,250,0.07)',display:'flex',alignItems:'center',gap:8}}>
              {editId?'Editar Item':'Cadastrar Novo Item'}
              {editId&&<button onClick={()=>{resetForm();setTab('lista')}} style={{marginLeft:'auto',padding:'4px 12px',borderRadius:8,background:'rgba(239,68,68,.12)',border:'1px solid rgba(239,68,68,.25)',color:'#FCA5A5',fontSize:12,cursor:'pointer'}}>Cancelar</button>}
            </div>
            <form onSubmit={save}>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:14,marginBottom:16}}>
                <div style={{gridColumn:'1/-1'}}>
                  <label style={{display:'block',fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:6}}>Nome do Item *</label>
                  <input required placeholder="Ex: Filtro de ar, Parafuso M8..." value={form.nome} onChange={e=>f('nome',e.target.value)} style={S}/>
                </div>
                <div>
                  <label style={{display:'block',fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:6}}>Categoria</label>
                  <select value={form.categoria} onChange={e=>f('categoria',e.target.value)} style={{...S,appearance:'none',cursor:'pointer'}}>
                    <option value="">Selecione...</option>
                    {CATEGORIAS.map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{display:'block',fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:6}}>Unidade</label>
                  <select value={form.unidade} onChange={e=>f('unidade',e.target.value)} style={{...S,appearance:'none',cursor:'pointer'}}>
                    {['un','kg','g','l','ml','m','cm','cx','pc','par'].map(u=><option key={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{display:'block',fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:6}}>Quantidade Atual</label>
                  <input type="number" min="0" value={form.quantidade} onChange={e=>f('quantidade',e.target.value)} style={S}/>
                </div>
                <div>
                  <label style={{display:'block',fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:6}}>Quantidade Minima</label>
                  <input type="number" min="0" value={form.quantidade_minima} onChange={e=>f('quantidade_minima',e.target.value)} style={S}/>
                </div>
                <div>
                  <label style={{display:'block',fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:6}}>Valor Unitario (R$)</label>
                  <input type="number" step="0.01" min="0" placeholder="0,00" value={form.valor_unitario} onChange={e=>f('valor_unitario',e.target.value)} style={S}/>
                </div>
                <div>
                  <label style={{display:'block',fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:6}}>Fornecedor</label>
                  <input placeholder="Nome do fornecedor..." value={form.fornecedor} onChange={e=>f('fornecedor',e.target.value)} style={S}/>
                </div>
                <div>
                  <label style={{display:'block',fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:6}}>Localizacao</label>
                  <input placeholder="Ex: Prateleira A3, Gaveta 2..." value={form.localizacao} onChange={e=>f('localizacao',e.target.value)} style={S}/>
                </div>
                <div style={{gridColumn:'1/-1'}}>
                  <label style={{display:'block',fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:6}}>Descricao</label>
                  <textarea placeholder="Descricao, especificacoes tecnicas..." value={form.descricao} onChange={e=>f('descricao',e.target.value)} style={{...S,minHeight:70,resize:'vertical'}}/>
                </div>
              </div>
              <div style={{display:'flex',justifyContent:'flex-end',gap:10}}>
                <button type="button" onClick={resetForm} style={{padding:'10px 20px',borderRadius:10,background:'#162040',border:'1px solid rgba(96,165,250,0.13)',color:'#8899BB',fontSize:13,fontWeight:600,cursor:'pointer'}}>Limpar</button>
                <button type="submit" disabled={saving} style={{padding:'10px 24px',borderRadius:10,background:'#1A56DB',border:'none',color:'#fff',fontSize:13,fontWeight:800,cursor:'pointer',opacity:saving?0.6:1}}>
                  {saving?'Salvando...':editId?'Atualizar':'Salvar Item'}
                </button>
              </div>
            </form>
          </div>
        )}

        {tab==='lista'&&(
          <div>
            <div style={{background:'#0F1729',border:'1px solid rgba(96,165,250,0.07)',borderRadius:14,padding:14,marginBottom:12,display:'flex',gap:10,flexWrap:'wrap',alignItems:'center'}}>
              <input placeholder="Buscar por nome, categoria ou fornecedor..." value={search} onChange={e=>setSearch(e.target.value)} style={{...S,flex:1,minWidth:200,padding:'8px 14px',fontSize:13}}/>
              <button onClick={()=>setFiltroAlerta(!filtroAlerta)} style={{padding:'8px 16px',borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer',border:'none',background:filtroAlerta?'rgba(239,68,68,.2)':'#162040',color:filtroAlerta?'#FCA5A5':'#8899BB'}}>
                {filtroAlerta?'Alertas ativos':'Ver alertas'}
              </button>
            </div>
            <div style={{background:'#0F1729',border:'1px solid rgba(96,165,250,0.07)',borderRadius:16,overflow:'hidden'}}>
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse'}}>
                  <thead>
                    <tr style={{background:'rgba(15,23,41,0.6)'}}>
                      {['Item','Categoria','Qtd Atual','Qtd Min','Valor Unit.','Total','Local','Acoes'].map(h=>(
                        <th key={h} style={{padding:'11px 14px',textAlign:'left',fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'1px',textTransform:'uppercase',borderBottom:'1px solid rgba(96,165,250,0.07)',whiteSpace:'nowrap'}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading?(<tr><td colSpan={8} style={{padding:40,textAlign:'center',color:'#3D5070'}}>Carregando...</td></tr>)
                    :filtered.length===0?(<tr><td colSpan={8} style={{padding:40,textAlign:'center',color:'#3D5070'}}>Nenhum item encontrado</td></tr>)
                    :filtered.map(item=>{
                      const baixo = item.quantidade<=item.quantidade_minima
                      return(
                        <tr key={item.id} onClick={()=>setModal(item)}
                          onMouseEnter={e=>{e.currentTarget.style.background='rgba(96,165,250,0.03)';e.currentTarget.style.cursor='pointer'}}
                          onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                          <td style={{padding:'13px 14px',borderBottom:'1px solid rgba(96,165,250,0.05)'}}>
                            <div style={{fontWeight:700,color:'#EEF2FF',fontSize:14}}>{item.nome}</div>
                            {item.fornecedor&&<div style={{fontSize:11,color:'#3D5070',marginTop:2}}>{item.fornecedor}</div>}
                          </td>
                          <td style={{padding:'13px 14px',borderBottom:'1px solid rgba(96,165,250,0.05)',fontSize:12,color:'#8899BB'}}>{item.categoria||'--'}</td>
                          <td style={{padding:'13px 14px',borderBottom:'1px solid rgba(96,165,250,0.05)'}}>
                            <div style={{display:'flex',alignItems:'center',gap:6}}>
                              <span style={{fontSize:16,fontWeight:800,color:baixo?'#FCA5A5':'#34D399'}}>{item.quantidade}</span>
                              <span style={{fontSize:11,color:'#3D5070'}}>{item.unidade}</span>
                              {baixo&&<span style={{fontSize:10,color:'#FCA5A5',fontWeight:700,background:'rgba(239,68,68,.1)',padding:'2px 6px',borderRadius:6}}>BAIXO</span>}
                            </div>
                          </td>
                          <td style={{padding:'13px 14px',borderBottom:'1px solid rgba(96,165,250,0.05)',fontSize:13,color:'#3D5070'}}>{item.quantidade_minima} {item.unidade}</td>
                          <td style={{padding:'13px 14px',borderBottom:'1px solid rgba(96,165,250,0.05)',fontSize:13,color:'#8899BB'}}>{fmtVal(item.valor_unitario)}</td>
                          <td style={{padding:'13px 14px',borderBottom:'1px solid rgba(96,165,250,0.05)',fontSize:13,fontWeight:700,color:'#67E8F9'}}>{fmtVal((parseFloat(item.valor_unitario)||0)*item.quantidade)}</td>
                          <td style={{padding:'13px 14px',borderBottom:'1px solid rgba(96,165,250,0.05)',fontSize:12,color:'#3D5070'}}>{item.localizacao||'--'}</td>
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

      {modal&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.8)',zIndex:500,display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(4px)'}} onClick={()=>setModal(null)}>
          <div style={{background:'#0F1729',border:'1px solid rgba(96,165,250,0.2)',borderRadius:20,padding:26,width:420,maxHeight:'90vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16,paddingBottom:14,borderBottom:'1px solid rgba(96,165,250,0.07)'}}>
              <div>
                <div style={{fontSize:17,fontWeight:800,color:'#EEF2FF'}}>{modal.nome}</div>
                <div style={{fontSize:12,color:'#3D5070',marginTop:2}}>{modal.categoria||''}</div>
              </div>
              <button onClick={()=>setModal(null)} style={{background:'rgba(96,165,250,0.1)',border:'1px solid rgba(96,165,250,0.2)',color:'#8899BB',fontSize:18,cursor:'pointer',borderRadius:8,width:32,height:32,display:'flex',alignItems:'center',justifyContent:'center'}}>x</button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
              {[
                ['Quantidade',modal.quantidade+' '+modal.unidade],
                ['Qtd Minima',modal.quantidade_minima+' '+modal.unidade],
                ['Valor Unit.',fmtVal(modal.valor_unitario)],
                ['Total',fmtVal((parseFloat(modal.valor_unitario)||0)*modal.quantidade)],
                ['Fornecedor',modal.fornecedor||'--'],
                ['Localizacao',modal.localizacao||'--'],
              ].map(([l,v])=>(
                <div key={l} style={{background:'rgba(96,165,250,0.04)',borderRadius:10,padding:'10px 14px'}}>
                  <div style={{fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:3}}>{l}</div>
                  <div style={{fontSize:13,color:'#EEF2FF',fontWeight:600}}>{v}</div>
                </div>
              ))}
            </div>
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
