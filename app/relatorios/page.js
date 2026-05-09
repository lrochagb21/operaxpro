'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import AppLayout from '@/components/layout/AppLayout'

const MESES = ['Janeiro','Fevereiro','Marco','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const MESES_CURTO = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

export default function Relatorios() {
  const [loading,setLoading]   = useState(true)
  const [ano,setAno]           = useState(new Date().getFullYear())
  const [mes,setMes]           = useState(new Date().getMonth())
  const [periodo,setPeriodo]   = useState('mes')
  const [dados,setDados]       = useState({os:[],clientes:[],tecnicos:[],financeiro:[],agenda:[]})

  useEffect(()=>{ load() },[ano,mes,periodo])

  async function load() {
    setLoading(true)
    const inicioAno  = ano+'-01-01'
    const fimAno     = ano+'-12-31'
    const inicioMes  = ano+'-'+String(mes+1).padStart(2,'0')+'-01'
    const fimMes     = ano+'-'+String(mes+1).padStart(2,'0')+'-31'
    const inicio = periodo==='mes' ? inicioMes : inicioAno
    const fim    = periodo==='mes' ? fimMes : fimAno

    const [osRes,cliRes,tecRes,finRes,agRes] = await Promise.all([
      supabase.from('ordens_servico').select('*,clientes(nome),usuarios(nome)').gte('criado_em',inicio).lte('criado_em',fim+'T23:59:59'),
      supabase.from('clientes').select('id,nome,criado_em'),
      supabase.from('usuarios').select('id,nome,especialidade').eq('perfil','tecnico'),
      supabase.from('financeiro').select('*').gte('data_lancamento',inicio).lte('data_lancamento',fim),
      supabase.from('agenda').select('*,clientes(nome),usuarios(nome)').gte('data',inicio).lte('data',fim),
    ])
    setDados({os:osRes.data||[],clientes:cliRes.data||[],tecnicos:tecRes.data||[],financeiro:finRes.data||[],agenda:agRes.data||[]})
    setLoading(false)
  }

  const fmtVal = v => 'R$ '+parseFloat(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2})

  // Calculos OS
  const osTipo = (tipo) => dados.os.filter(o=>o.tipo===tipo)
  const osStatus = (status) => dados.os.filter(o=>o.status===status)
  const receitas = dados.financeiro.filter(f=>f.tipo==='receita').reduce((a,f)=>a+parseFloat(f.valor||0),0)
  const despesas = dados.financeiro.filter(f=>f.tipo==='despesa').reduce((a,f)=>a+parseFloat(f.valor||0),0)

  // OS por tecnico
  const osPorTecnico = dados.tecnicos.map(t=>({
    ...t,
    total: dados.os.filter(o=>o.tecnico_id===t.id).length,
    concluidas: dados.os.filter(o=>o.tecnico_id===t.id&&o.status==='Concluída').length,
    abertas: dados.os.filter(o=>o.tecnico_id===t.id&&o.status==='Aberta').length,
    faturamento: dados.os.filter(o=>o.tecnico_id===t.id&&o.status==='Concluída').reduce((a,o)=>a+(parseFloat(o.valor)||0)-(parseFloat(o.desconto)||0),0),
  })).sort((a,b)=>b.total-a.total)

  // OS por mes (para grafico anual)
  const osPorMes = MESES_CURTO.map((m,i)=>{
    const mesStr = ano+'-'+String(i+1).padStart(2,'0')
    const osDoMes = dados.os.filter(o=>o.criado_em?.startsWith(mesStr))
    return {mes:m, total:osDoMes.length, concluidas:osDoMes.filter(o=>o.status==='Concluída').length}
  })

  // Ticket medio
  const osComValor = dados.os.filter(o=>parseFloat(o.valor)>0)
  const ticketMedio = osComValor.length > 0 ? osComValor.reduce((a,o)=>a+(parseFloat(o.valor)||0),0)/osComValor.length : 0

  // Taxa de conclusao
  const taxaConclusao = dados.os.length > 0 ? ((osStatus('Concluída').length/dados.os.length)*100).toFixed(1) : 0

  const maxOS = Math.max(...osPorMes.map(d=>d.total),1)

  return (
    <AppLayout>
      <div style={{padding:24,maxWidth:1200}}>
        {/* Header */}
        <div style={{marginBottom:24,display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
          <div>
            <h1 style={{fontSize:22,fontWeight:800,color:'#EEF2FF'}}>Relatorios</h1>
            <p style={{fontSize:12,color:'#3D5070',marginTop:3}}>Analise completa do desempenho</p>
          </div>
          <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
            <div style={{display:'flex',gap:4,background:'#162040',borderRadius:10,padding:4}}>
              {[{v:'mes',l:'Mensal'},{v:'ano',l:'Anual'}].map(({v,l})=>(
                <button key={v} onClick={()=>setPeriodo(v)} style={{padding:'8px 16px',borderRadius:7,border:'none',cursor:'pointer',fontSize:12,fontWeight:700,background:periodo===v?'#1A56DB':'transparent',color:periodo===v?'#fff':'#8899BB'}}>{l}</button>
              ))}
            </div>
            {periodo==='mes'&&(
              <select value={mes} onChange={e=>setMes(parseInt(e.target.value))} style={{background:'#162040',border:'1px solid rgba(96,165,250,0.13)',color:'#EEF2FF',borderRadius:10,padding:'8px 14px',fontSize:13,fontFamily:'inherit',outline:'none',appearance:'none',cursor:'pointer'}}>
                {MESES.map((m,i)=><option key={i} value={i}>{m}</option>)}
              </select>
            )}
            <select value={ano} onChange={e=>setAno(parseInt(e.target.value))} style={{background:'#162040',border:'1px solid rgba(96,165,250,0.13)',color:'#EEF2FF',borderRadius:10,padding:'8px 14px',fontSize:13,fontFamily:'inherit',outline:'none',appearance:'none',cursor:'pointer'}}>
              {[2024,2025,2026,2027].map(a=><option key={a}>{a}</option>)}
            </select>
          </div>
        </div>

        {loading?(
          <div style={{textAlign:'center',color:'#3D5070',padding:60,fontSize:14}}>Carregando relatorios...</div>
        ):(
          <div>
            {/* KPIs principais */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:12,marginBottom:24}}>
              {[
                {l:'Total OS',v:dados.os.length,c:'#60A5FA',bg:'rgba(96,165,250,.1)',icon:'📋'},
                {l:'Concluidas',v:osStatus('Concluída').length,c:'#34D399',bg:'rgba(16,185,129,.1)',icon:'✅'},
                {l:'Orcamentos',v:osTipo('ORC').length,c:'#C4B5FD',bg:'rgba(139,92,246,.1)',icon:'📄'},
                {l:'Agendamentos',v:dados.agenda.length,c:'#67E8F9',bg:'rgba(6,182,212,.1)',icon:'📅'},
                {l:'Receitas',v:receitas,c:'#34D399',bg:'rgba(16,185,129,.1)',icon:'💰',fmt:true},
                {l:'Despesas',v:despesas,c:'#FCA5A5',bg:'rgba(239,68,68,.1)',icon:'💸',fmt:true},
                {l:'Lucro',v:receitas-despesas,c:receitas>=despesas?'#60A5FA':'#FCA5A5',bg:receitas>=despesas?'rgba(26,86,219,.1)':'rgba(239,68,68,.1)',icon:'📈',fmt:true},
                {l:'Ticket Medio',v:ticketMedio,c:'#FCD34D',bg:'rgba(245,158,11,.1)',icon:'🎯',fmt:true},
              ].map(({l,v,c,bg,icon,fmt})=>(
                <div key={l} style={{background:bg,border:`1px solid ${c}30`,borderRadius:14,padding:'16px',position:'relative',overflow:'hidden'}}>
                  <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:c,borderRadius:'14px 14px 0 0'}}/>
                  <div style={{fontSize:20,marginBottom:6}}>{icon}</div>
                  <div style={{fontSize:10,fontWeight:700,color:c,letterSpacing:'1px',textTransform:'uppercase',marginBottom:4}}>{l}</div>
                  <div style={{fontSize:fmt?18:26,fontWeight:800,color:c,letterSpacing:'-0.5px'}}>{fmt?fmtVal(v):v}</div>
                </div>
              ))}
            </div>

            {/* Taxa de conclusao */}
            <div style={{background:'#0F1729',border:'1px solid rgba(96,165,250,0.07)',borderRadius:16,padding:20,marginBottom:16}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12,flexWrap:'wrap',gap:8}}>
                <div style={{fontSize:13,fontWeight:800,color:'#EEF2FF'}}>Taxa de Conclusao de OS</div>
                <div style={{fontSize:22,fontWeight:800,color:'#34D399'}}>{taxaConclusao}%</div>
              </div>
              <div style={{height:16,borderRadius:8,overflow:'hidden',background:'#162040'}}>
                <div style={{width:taxaConclusao+'%',height:'100%',background:'linear-gradient(90deg,#10B981,#34D399)',borderRadius:8,transition:'width .5s'}}/>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',marginTop:8,fontSize:12,color:'#3D5070'}}>
                <span>{osStatus('Concluída').length} concluidas</span>
                <span>{dados.os.length} total</span>
              </div>
            </div>

            {/* Grafico OS por mes (so no anual) */}
            {periodo==='ano'&&(
              <div style={{background:'#0F1729',border:'1px solid rgba(96,165,250,0.07)',borderRadius:16,padding:20,marginBottom:16}}>
                <div style={{fontSize:13,fontWeight:800,color:'#EEF2FF',marginBottom:4}}>OS por Mes — {ano}</div>
                <div style={{fontSize:11,color:'#3D5070',marginBottom:16}}>Total de ordens abertas por mes</div>
                <div style={{display:'flex',gap:6,alignItems:'flex-end',height:140}}>
                  {osPorMes.map(d=>(
                    <div key={d.mes} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
                      <div style={{fontSize:10,fontWeight:700,color:'#60A5FA'}}>{d.total>0?d.total:''}</div>
                      <div style={{width:'100%',display:'flex',gap:1,alignItems:'flex-end',height:100}}>
                        <div style={{flex:1,background:'rgba(96,165,250,.5)',borderRadius:'3px 3px 0 0',height:((d.total/maxOS)*95)+'px',minHeight:d.total>0?4:0}}/>
                        <div style={{flex:1,background:'rgba(16,185,129,.5)',borderRadius:'3px 3px 0 0',height:((d.concluidas/maxOS)*95)+'px',minHeight:d.concluidas>0?4:0}}/>
                      </div>
                      <div style={{fontSize:9,color:'#3D5070'}}>{d.mes}</div>
                    </div>
                  ))}
                </div>
                <div style={{display:'flex',gap:16,marginTop:8,justifyContent:'center'}}>
                  {[{c:'rgba(96,165,250,.5)',l:'Total'},{c:'rgba(16,185,129,.5)',l:'Concluidas'}].map(({c,l})=>(
                    <div key={l} style={{display:'flex',alignItems:'center',gap:5,fontSize:11,color:'#8899BB'}}>
                      <div style={{width:10,height:10,borderRadius:2,background:c}}/>{l}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Status das OS */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:16}}>
              <div style={{background:'#0F1729',border:'1px solid rgba(96,165,250,0.07)',borderRadius:16,padding:16}}>
                <div style={{fontSize:12,fontWeight:800,color:'#EEF2FF',marginBottom:12}}>OS por Status</div>
                {[
                  {s:'Aberta',c:'#FCD34D',bg:'rgba(245,158,11,.15)'},
                  {s:'Em Andamento',c:'#93C5FD',bg:'rgba(96,165,250,.15)'},
                  {s:'Aguardando Peca',c:'#C4B5FD',bg:'rgba(139,92,246,.15)'},
                  {s:'Concluída',c:'#34D399',bg:'rgba(16,185,129,.15)'},
                  {s:'Cancelada',c:'#FCA5A5',bg:'rgba(239,68,68,.15)'},
                ].map(({s,c,bg})=>{
                  const count = dados.os.filter(o=>o.status===s).length
                  const pct = dados.os.length>0?((count/dados.os.length)*100).toFixed(0):0
                  return(
                    <div key={s} style={{marginBottom:10}}>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                        <span style={{fontSize:12,color:'#8899BB'}}>{s}</span>
                        <span style={{fontSize:12,fontWeight:700,color:c}}>{count} ({pct}%)</span>
                      </div>
                      <div style={{height:6,borderRadius:3,background:'#162040',overflow:'hidden'}}>
                        <div style={{width:pct+'%',height:'100%',background:c,borderRadius:3,transition:'width .3s'}}/>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div style={{background:'#0F1729',border:'1px solid rgba(96,165,250,0.07)',borderRadius:16,padding:16}}>
                <div style={{fontSize:12,fontWeight:800,color:'#EEF2FF',marginBottom:12}}>Servicos Mais Realizados</div>
                {Object.entries(
                  dados.os.reduce((acc,o)=>{
                    const k = o.tipo_servico||'Nao informado'
                    acc[k]=(acc[k]||0)+1; return acc
                  },{})
                ).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([tipo,count])=>{
                  const pct = dados.os.length>0?((count/dados.os.length)*100).toFixed(0):0
                  return(
                    <div key={tipo} style={{marginBottom:10}}>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                        <span style={{fontSize:12,color:'#8899BB'}}>{tipo}</span>
                        <span style={{fontSize:12,fontWeight:700,color:'#60A5FA'}}>{count}</span>
                      </div>
                      <div style={{height:6,borderRadius:3,background:'#162040',overflow:'hidden'}}>
                        <div style={{width:pct+'%',height:'100%',background:'#1A56DB',borderRadius:3}}/>
                      </div>
                    </div>
                  )
                })}
                {dados.os.length===0&&<div style={{fontSize:13,color:'#3D5070',textAlign:'center',padding:20}}>Sem dados no periodo</div>}
              </div>
            </div>

            {/* Desempenho por tecnico */}
            <div style={{background:'#0F1729',border:'1px solid rgba(96,165,250,0.07)',borderRadius:16,overflow:'hidden',marginBottom:16}}>
              <div style={{padding:'16px 20px',borderBottom:'1px solid rgba(96,165,250,0.07)'}}>
                <div style={{fontSize:13,fontWeight:800,color:'#EEF2FF'}}>Desempenho por Tecnico</div>
              </div>
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse'}}>
                  <thead>
                    <tr style={{background:'rgba(15,23,41,0.6)'}}>
                      {['Tecnico','Especialidade','Total OS','Concluidas','Em Aberto','Faturamento','Taxa'].map(h=>(
                        <th key={h} style={{padding:'10px 14px',textAlign:'left',fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'1px',textTransform:'uppercase',borderBottom:'1px solid rgba(96,165,250,0.07)',whiteSpace:'nowrap'}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {osPorTecnico.length===0?(
                      <tr><td colSpan={7} style={{padding:32,textAlign:'center',color:'#3D5070',fontSize:13}}>Nenhum dado no periodo</td></tr>
                    ):osPorTecnico.map(t=>{
                      const taxa = t.total>0?((t.concluidas/t.total)*100).toFixed(0):0
                      return(
                        <tr key={t.id}
                          onMouseEnter={e=>e.currentTarget.style.background='rgba(96,165,250,0.03)'}
                          onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                          <td style={{padding:'13px 14px',borderBottom:'1px solid rgba(96,165,250,0.05)',fontWeight:700,color:'#EEF2FF',fontSize:14}}>{t.nome}</td>
                          <td style={{padding:'13px 14px',borderBottom:'1px solid rgba(96,165,250,0.05)',fontSize:12,color:'#8899BB'}}>{t.especialidade||'--'}</td>
                          <td style={{padding:'13px 14px',borderBottom:'1px solid rgba(96,165,250,0.05)',fontSize:15,fontWeight:800,color:'#60A5FA'}}>{t.total}</td>
                          <td style={{padding:'13px 14px',borderBottom:'1px solid rgba(96,165,250,0.05)',fontSize:15,fontWeight:800,color:'#34D399'}}>{t.concluidas}</td>
                          <td style={{padding:'13px 14px',borderBottom:'1px solid rgba(96,165,250,0.05)',fontSize:15,fontWeight:800,color:'#FCD34D'}}>{t.abertas}</td>
                          <td style={{padding:'13px 14px',borderBottom:'1px solid rgba(96,165,250,0.05)',fontSize:13,fontWeight:700,color:'#34D399'}}>{fmtVal(t.faturamento)}</td>
                          <td style={{padding:'13px 14px',borderBottom:'1px solid rgba(96,165,250,0.05)'}}>
                            <div style={{display:'flex',alignItems:'center',gap:8}}>
                              <div style={{flex:1,height:6,borderRadius:3,background:'#162040',overflow:'hidden'}}>
                                <div style={{width:taxa+'%',height:'100%',background:taxa>=70?'#10B981':taxa>=40?'#F59E0B':'#EF4444',borderRadius:3}}/>
                              </div>
                              <span style={{fontSize:12,fontWeight:700,color:taxa>=70?'#34D399':taxa>=40?'#FCD34D':'#FCA5A5',minWidth:32}}>{taxa}%</span>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Clientes mais atendidos */}
            <div style={{background:'#0F1729',border:'1px solid rgba(96,165,250,0.07)',borderRadius:16,overflow:'hidden'}}>
              <div style={{padding:'16px 20px',borderBottom:'1px solid rgba(96,165,250,0.07)'}}>
                <div style={{fontSize:13,fontWeight:800,color:'#EEF2FF'}}>Clientes Mais Atendidos</div>
              </div>
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse'}}>
                  <thead>
                    <tr style={{background:'rgba(15,23,41,0.6)'}}>
                      {['Cliente','OS Total','Concluidas','Valor Total'].map(h=>(
                        <th key={h} style={{padding:'10px 14px',textAlign:'left',fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'1px',textTransform:'uppercase',borderBottom:'1px solid rgba(96,165,250,0.07)'}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(
                      dados.os.reduce((acc,o)=>{
                        const k = o.clientes?.nome||'Desconhecido'
                        if (!acc[k]) acc[k]={nome:k,total:0,concluidas:0,valor:0}
                        acc[k].total++
                        if (o.status==='Concluída') { acc[k].concluidas++; acc[k].valor+=(parseFloat(o.valor)||0)-(parseFloat(o.desconto)||0) }
                        return acc
                      },{})
                    ).sort((a,b)=>b[1].total-a[1].total).slice(0,8).map(([,c])=>(
                      <tr key={c.nome}
                        onMouseEnter={e=>e.currentTarget.style.background='rgba(96,165,250,0.03)'}
                        onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                        <td style={{padding:'12px 14px',borderBottom:'1px solid rgba(96,165,250,0.05)',fontWeight:700,color:'#EEF2FF',fontSize:14}}>{c.nome}</td>
                        <td style={{padding:'12px 14px',borderBottom:'1px solid rgba(96,165,250,0.05)',fontSize:15,fontWeight:800,color:'#60A5FA'}}>{c.total}</td>
                        <td style={{padding:'12px 14px',borderBottom:'1px solid rgba(96,165,250,0.05)',fontSize:15,fontWeight:800,color:'#34D399'}}>{c.concluidas}</td>
                        <td style={{padding:'12px 14px',borderBottom:'1px solid rgba(96,165,250,0.05)',fontSize:13,fontWeight:700,color:'#34D399'}}>{fmtVal(c.valor)}</td>
                      </tr>
                    ))}
                    {dados.os.length===0&&<tr><td colSpan={4} style={{padding:32,textAlign:'center',color:'#3D5070'}}>Sem dados no periodo</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
