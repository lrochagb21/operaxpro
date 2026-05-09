'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import AppLayout from '@/components/layout/AppLayout'

function Card({ icon, label, value, change, up, color }) {
  const c = {blue:'#1A56DB',cyan:'#06B6D4',green:'#10B981',yellow:'#F59E0B',purple:'#8B5CF6',red:'#EF4444'}
  return (
    <div style={{background:'#0F1729',border:'1px solid rgba(96,165,250,0.07)',borderRadius:16,padding:'18px 20px',position:'relative',overflow:'hidden'}}>
      <div style={{position:'absolute',top:0,left:0,right:0,height:2,borderRadius:'16px 16px 0 0',background:c[color]}}/>
      <div style={{fontSize:20,marginBottom:10}}>{icon}</div>
      <div style={{fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:5}}>{label}</div>
      <div style={{fontSize:26,fontWeight:800,color:'#EEF2FF',letterSpacing:'-1px'}}>{value}</div>
      <div style={{fontSize:11,fontWeight:700,marginTop:4,color:up?'#10B981':'#EF4444'}}>{change}</div>
    </div>
  )
}

export default function Dashboard() {
  const [stats, setStats]       = useState({tec:0,cli:0,osA:0,osC:0,fat:'R$0',estB:0})
  const [os, setOs]             = useState([])
  const [agendaHoje, setAgendaHoje] = useState([])
  const [osConcTec, setOsConcTec]   = useState([])
  const [localizacoes, setLocalizacoes] = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    const hoje = new Date().toISOString().split('T')[0]
    const [t,c,o,e,f,ags,osConc,locs] = await Promise.all([
      supabase.from('usuarios').select('id',{count:'exact'}).eq('perfil','tecnico').eq('status','ativo'),
      supabase.from('clientes').select('id',{count:'exact'}),
      supabase.from('ordens_servico').select('*,clientes(nome),usuarios(nome)').order('criado_em',{ascending:false}).limit(6),
      supabase.from('estoque').select('quantidade,quantidade_minima'),
      supabase.from('financeiro').select('valor').eq('tipo','receita'),
      supabase.from('agenda').select('*,clientes(nome,telefone),usuarios(nome)').eq('data',hoje).order('hora_inicio'),
      supabase.from('ordens_servico').select('tecnico_id,usuarios(nome)').eq('status','Concluída'),
        supabase.from('localizacoes').select('*, usuarios!localizacoes_tecnico_id_fkey(nome)').order('atualizado_em',{ascending:false}),
    ])
    const fat = f.data?.reduce((a,x)=>a+parseFloat(x.valor),0)||0
    setStats({
      tec:t.count||0, cli:c.count||0,
      osA:o.data?.filter(x=>x.status!=='Concluída'&&x.status!=='Cancelada').length||0,
      osC:o.data?.filter(x=>x.status==='Concluída').length||0,
      fat:'R$'+Math.round(fat/1000)+'k',
      estB:e.data?.filter(x=>x.quantidade<=x.quantidade_minima).length||0
    })
    setOs(o.data||[])
    setAgendaHoje(ags.data||[])
    setOsConcTec(osConc.data||[])
      console.log('LOCS:', locs.data, locs.error)
      setLocalizacoes(locs.data||[])
    setLoading(false)
  }

  const badge = s => ({
    'Concluída':       ['rgba(16,185,129,.15)','#34D399'],
    'Em Andamento':    ['rgba(96,165,250,.15)','#93C5FD'],
    'Aberta':          ['rgba(245,158,11,.15)','#FCD34D'],
    'Aguardando Peça': ['rgba(139,92,246,.15)','#C4B5FD'],
    'Cancelada':       ['rgba(239,68,68,.15)','#FCA5A5'],
  }[s]||['rgba(96,165,250,.15)','#93C5FD'])

  // Grafico pizza
  const cores = ['#1A56DB','#06B6D4','#10B981','#F59E0B','#8B5CF6','#EF4444','#EC4899']
  const grupos = osConcTec.reduce((acc,o)=>{
    const nome = o.usuarios?.nome||'Sem tecnico'
    acc[nome]=(acc[nome]||0)+1
    return acc
  },{})
  const totalPizza = Object.values(grupos).reduce((a,b)=>a+b,0)
  const pizzaItems = Object.entries(grupos).sort((a,b)=>b[1]-a[1])
  let angulo = 0
  const slices = pizzaItems.map(([nome,qtd],i)=>{
    const pct = qtd/totalPizza
    const ang = pct*360
    const rad1 = (angulo-90)*Math.PI/180
    const rad2 = (angulo+ang-90)*Math.PI/180
    const cx=90,cy=90,raio=70
    const x1=cx+raio*Math.cos(rad1), y1=cy+raio*Math.sin(rad1)
    const x2=cx+raio*Math.cos(rad2), y2=cy+raio*Math.sin(rad2)
    const large=ang>180?1:0
    const path=`M${cx},${cy} L${x1},${y1} A${raio},${raio} 0 ${large},1 ${x2},${y2} Z`
    angulo+=ang
    return {nome,qtd,pct,path,cor:cores[i%cores.length]}
  })

  return (
    <AppLayout>
      <div style={{padding:24}}>
        <div style={{marginBottom:24}}>
          <h1 style={{fontSize:22,fontWeight:800,color:'#EEF2FF',letterSpacing:'-0.3px'}}>Dashboard</h1>
          <p style={{fontSize:12,color:'#3D5070',marginTop:3}}>Visão geral do sistema</p>
        </div>

        {/* KPIs */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:12,marginBottom:24}}>
          <Card icon="👷" label="Técnicos"      value={stats.tec}  change="ativos"        up color="blue"/>
          <Card icon="👥" label="Clientes"      value={stats.cli}  change="cadastrados"   up color="cyan"/>
          <Card icon="📋" label="OS Abertas"    value={stats.osA}  change="em andamento"  up={false} color="yellow"/>
          <Card icon="✅" label="Concluídas"    value={stats.osC}  change="este mês"      up color="green"/>
          <Card icon="💰" label="Faturamento"   value={stats.fat}  change="receitas"      up color="purple"/>
          <Card icon="📦" label="Estoque Baixo" value={stats.estB} change="verificar!"    up={false} color="red"/>
        </div>

        {/* Agenda do dia */}
        {agendaHoje.length>0&&(
          <div style={{background:'#0F1729',border:'1px solid rgba(6,182,212,0.2)',borderRadius:16,marginBottom:20,overflow:'hidden'}}>
            <div style={{padding:'14px 20px',borderBottom:'1px solid rgba(6,182,212,0.15)',background:'rgba(6,182,212,0.06)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <span style={{fontSize:14,fontWeight:800,color:'#67E8F9'}}>Atendimentos de Hoje ({agendaHoje.length})</span>
              <span style={{fontSize:11,color:'#3D5070'}}>{new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'})}</span>
            </div>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead>
                  <tr style={{background:'rgba(6,182,212,0.04)'}}>
                    {['Horário','Cliente','Técnico','Serviço','Status','Telefone'].map(h=>(
                      <th key={h} style={{padding:'10px 16px',textAlign:'left',fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'1px',textTransform:'uppercase',borderBottom:'1px solid rgba(6,182,212,0.1)'}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {agendaHoje.map(a=>{
                    const stC = {agendado:{bg:'rgba(245,158,11,.15)',c:'#FCD34D'},confirmado:{bg:'rgba(96,165,250,.15)',c:'#93C5FD'},concluido:{bg:'rgba(16,185,129,.15)',c:'#34D399'},cancelado:{bg:'rgba(239,68,68,.15)',c:'#FCA5A5'}}[a.status]||{bg:'rgba(96,165,250,.15)',c:'#93C5FD'}
                    return(
                      <tr key={a.id} onMouseEnter={e=>e.currentTarget.style.background='rgba(6,182,212,0.04)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                        <td style={{padding:'12px 16px',borderBottom:'1px solid rgba(6,182,212,0.06)',fontFamily:'monospace',fontSize:13,color:'#06B6D4',fontWeight:700}}>{a.hora_inicio?.slice(0,5)||'--:--'}{a.hora_fim?' - '+a.hora_fim.slice(0,5):''}</td>
                        <td style={{padding:'12px 16px',borderBottom:'1px solid rgba(6,182,212,0.06)',fontSize:13,fontWeight:700,color:'#EEF2FF'}}>{a.clientes?.nome||'—'}</td>
                        <td style={{padding:'12px 16px',borderBottom:'1px solid rgba(6,182,212,0.06)',fontSize:13,color:'#8899BB'}}>{a.usuarios?.nome||'—'}</td>
                        <td style={{padding:'12px 16px',borderBottom:'1px solid rgba(6,182,212,0.06)',fontSize:13,color:'#8899BB'}}>{a.tipo_servico||'—'}</td>
                        <td style={{padding:'12px 16px',borderBottom:'1px solid rgba(6,182,212,0.06)'}}>
                          <span style={{padding:'3px 9px',borderRadius:20,fontSize:11,fontWeight:700,background:stC.bg,color:stC.c}}>{a.status}</span>
                        </td>
                        <td style={{padding:'12px 16px',borderBottom:'1px solid rgba(6,182,212,0.06)',fontSize:13,color:'#60A5FA'}}>{a.clientes?.telefone||a.telefone||'—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Mapa de tecnicos em tempo real */}
        {localizacoes.length>0&&(
          <div style={{background:'#0F1729',border:'1px solid rgba(96,165,250,0.07)',borderRadius:16,overflow:'hidden',marginBottom:16}}>
            <div style={{padding:'14px 20px',borderBottom:'1px solid rgba(96,165,250,0.07)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div>
                <span style={{fontSize:14,fontWeight:800,color:'#EEF2FF'}}>Tecnicos em Campo</span>
                <span style={{fontSize:11,color:'#3D5070',marginLeft:8}}>Localizacao em tempo real</span>
              </div>
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <div style={{width:8,height:8,borderRadius:'50%',background:'#10B981',boxShadow:'0 0 6px #10B981'}}/>
                <span style={{fontSize:11,color:'#34D399',fontWeight:600}}>{localizacoes.length} online</span>
              </div>
            </div>
            <div style={{padding:16}}>
              <div style={{borderRadius:12,overflow:'hidden',height:350,position:'relative'}}>
                <iframe
                  src={'https://www.openstreetmap.org/export/embed.html?bbox='+
                    (Math.min(...localizacoes.map(l=>parseFloat(l.longitude)))-0.05)+','+
                    (Math.min(...localizacoes.map(l=>parseFloat(l.latitude)))-0.05)+','+
                    (Math.max(...localizacoes.map(l=>parseFloat(l.longitude)))+0.05)+','+
                    (Math.max(...localizacoes.map(l=>parseFloat(l.latitude)))+0.05)+
                    '&layer=mapnik&marker='+localizacoes[0]?.latitude+','+localizacoes[0]?.longitude
                  }
                  style={{width:'100%',height:'100%',border:'none'}}
                />
              </div>
              <div style={{display:'flex',gap:10,flexWrap:'wrap',marginTop:14}}>
                {localizacoes.map(loc=>{
                  const mins = Math.floor((Date.now()-new Date(loc.atualizado_em).getTime())/60000)
                  const online = mins < 2
                  return(
                    <a key={loc.tecnico_id}
                      href={'https://maps.google.com/?q='+loc.latitude+','+loc.longitude}
                      target="_blank" rel="noreferrer"
                      style={{display:'flex',alignItems:'center',gap:8,padding:'8px 14px',background:'rgba(96,165,250,0.06)',border:'1px solid rgba(96,165,250,0.12)',borderRadius:10,textDecoration:'none',cursor:'pointer'}}>
                      <div style={{width:8,height:8,borderRadius:'50%',background:online?'#10B981':'#F59E0B',boxShadow:online?'0 0 6px #10B981':'none',flexShrink:0}}/>
                      <div>
                        <div style={{fontSize:13,fontWeight:700,color:'#EEF2FF'}}>{loc.usuarios?.nome||'Tecnico'}</div>
                        <div style={{fontSize:10,color:'#3D5070'}}>{online?'Agora mesmo':mins+' min atras'} • Ver no Maps</div>
                      </div>
                    </a>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Grafico de barras OS por status */}
        <div style={{background:'#0F1729',border:'1px solid rgba(96,165,250,0.07)',borderRadius:16,padding:20,marginBottom:16}}>
          <div style={{fontSize:14,fontWeight:800,color:'#EEF2FF',marginBottom:4}}>Ordens de Servico por Status</div>
          <div style={{fontSize:11,color:'#3D5070',marginBottom:20}}>Visao geral de todas as OS</div>
          <div style={{display:'flex',gap:12,alignItems:'flex-end',height:160}}>
            {[
              {l:'Urgentes',    v:os.filter(o=>o.prioridade==='Urgente'&&o.status!=='Concluída'&&o.status!=='Cancelada').length, c:'#FCA5A5',bg:'rgba(239,68,68,.6)'},
              {l:'Abertas',     v:os.filter(o=>o.status==='Aberta').length,          c:'#FCD34D',bg:'rgba(245,158,11,.6)'},
              {l:'Andamento',   v:os.filter(o=>o.status==='Em Andamento').length,    c:'#93C5FD',bg:'rgba(96,165,250,.6)'},
              {l:'Ag. Peca',    v:os.filter(o=>o.status==='Aguardando Peça').length, c:'#C4B5FD',bg:'rgba(139,92,246,.6)'},
              {l:'Concluidas',  v:os.filter(o=>o.status==='Concluída').length,       c:'#34D399',bg:'rgba(16,185,129,.6)'},
              {l:'Canceladas',  v:os.filter(o=>o.status==='Cancelada').length,       c:'#8899BB',bg:'rgba(96,165,250,.2)'},
            ].map(({l,v,c,bg})=>{
              const maxV = Math.max(os.length,1)
              const h = Math.max((v/maxV)*130,v>0?8:0)
              return(
                <div key={l} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:6}}>
                  <div style={{fontSize:13,fontWeight:800,color:c}}>{v}</div>
                  <div style={{width:'100%',background:bg,borderRadius:'6px 6px 0 0',height:h+'px',transition:'height .3s',minHeight:v>0?8:2,border:`1px solid ${c}50`}}/>
                  <div style={{fontSize:10,color:'#3D5070',textAlign:'center',fontWeight:600}}>{l}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Grid: Pizza + Tabela OS */}
        <div style={{display:'grid',gridTemplateColumns:'300px 1fr',gap:16,alignItems:'start'}}>

          {/* Pizza */}
          <div style={{background:'#0F1729',border:'1px solid rgba(96,165,250,0.07)',borderRadius:16,padding:20}}>
            <div style={{fontSize:14,fontWeight:800,color:'#EEF2FF',marginBottom:4}}>OS Concluídas</div>
            <div style={{fontSize:11,color:'#3D5070',marginBottom:16}}>Por técnico</div>
            {totalPizza===0?(
              <div style={{textAlign:'center',color:'#3D5070',fontSize:13,padding:20}}>Nenhuma OS concluída ainda</div>
            ):(
              <div>
                <svg viewBox="0 0 180 180" style={{width:'100%',maxWidth:180,display:'block',margin:'0 auto 16px'}}>
                  {slices.map((s,i)=>(
                    <path key={i} d={s.path} fill={s.cor} stroke='#0F1729' strokeWidth='2' opacity='0.9'/>
                  ))}
                  <circle cx={90} cy={90} r={35} fill='#0F1729'/>
                  <text x={90} y={85} textAnchor='middle' fill='#EEF2FF' fontSize='18' fontWeight='bold'>{totalPizza}</text>
                  <text x={90} y={99} textAnchor='middle' fill='#3D5070' fontSize='9'>concluidas</text>
                </svg>
                <div style={{display:'flex',flexDirection:'column',gap:7}}>
                  {slices.map((s,i)=>(
                    <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                      <div style={{display:'flex',alignItems:'center',gap:7}}>
                        <div style={{width:10,height:10,borderRadius:3,background:s.cor,flexShrink:0}}/>
                        <span style={{fontSize:12,color:'#8899BB',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:130}}>{s.nome}</span>
                      </div>
                      <div style={{display:'flex',alignItems:'center',gap:4}}>
                        <span style={{fontSize:13,fontWeight:700,color:s.cor}}>{s.qtd}</span>
                        <span style={{fontSize:10,color:'#3D5070'}}>({(s.pct*100).toFixed(0)}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Tabela OS */}
          <div style={{background:'#0F1729',border:'1px solid rgba(96,165,250,0.07)',borderRadius:16,overflow:'hidden'}}>
            <div style={{padding:'16px 20px',borderBottom:'1px solid rgba(96,165,250,0.07)'}}>
              <span style={{fontSize:14,fontWeight:800,color:'#EEF2FF'}}>Últimas Ordens de Serviço</span>
            </div>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead>
                  <tr style={{background:'rgba(15,23,41,0.6)'}}>
                    {['#','Cliente','Técnico','Serviço','Status','Data'].map(h=>(
                      <th key={h} style={{padding:'10px 16px',textAlign:'left',fontSize:10,fontWeight:700,color:'#3D5070',letterSpacing:'1px',textTransform:'uppercase',borderBottom:'1px solid rgba(96,165,250,0.07)'}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading?(
                    <tr><td colSpan={6} style={{padding:32,textAlign:'center',color:'#3D5070'}}>Carregando...</td></tr>
                  ):os.length===0?(
                    <tr><td colSpan={6} style={{padding:32,textAlign:'center',color:'#3D5070'}}>Nenhuma OS ainda</td></tr>
                  ):os.map(o=>{
                    const [bg,color]=badge(o.status)
                    return(
                      <tr key={o.id} onMouseEnter={e=>e.currentTarget.style.background='rgba(96,165,250,0.03)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                        <td style={{padding:'12px 16px',fontSize:11,fontFamily:'monospace',color:'#3D5070',borderBottom:'1px solid rgba(96,165,250,0.05)'}}># {o.id}</td>
                        <td style={{padding:'12px 16px',fontSize:13,fontWeight:700,color:'#EEF2FF',borderBottom:'1px solid rgba(96,165,250,0.05)'}}>{o.clientes?.nome||'—'}</td>
                        <td style={{padding:'12px 16px',fontSize:13,color:'#8899BB',borderBottom:'1px solid rgba(96,165,250,0.05)'}}>{o.usuarios?.nome||'—'}</td>
                        <td style={{padding:'12px 16px',fontSize:13,color:'#8899BB',borderBottom:'1px solid rgba(96,165,250,0.05)'}}>{o.tipo_servico||'—'}</td>
                        <td style={{padding:'12px 16px',borderBottom:'1px solid rgba(96,165,250,0.05)'}}>
                          <span style={{padding:'3px 9px',borderRadius:20,fontSize:11,fontWeight:700,background:bg,color}}>{o.status}</span>
                        </td>
                        <td style={{padding:'12px 16px',fontSize:12,color:'#3D5070',borderBottom:'1px solid rgba(96,165,250,0.05)'}}>{o.criado_em?new Date(o.criado_em).toLocaleDateString('pt-BR'):'—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
