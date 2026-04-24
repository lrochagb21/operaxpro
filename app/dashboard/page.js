'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import AppLayout from '@/components/layout/AppLayout'
import { useRouter } from 'next/navigation'

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
  const router = useRouter()
  const [stats, setStats] = useState({tec:0,cli:0,osA:0,osC:0,fat:'R$0',estB:0})
  const [os, setOs] = useState([])
  const [agHoje, setAgHoje] = useState([])

  useEffect(() => {
    async function load() {
      const [t,c,o,e,f] = await Promise.all([
        supabase.from('usuarios').select('id',{count:'exact'}).eq('perfil','tecnico'),
        supabase.from('clientes').select('id',{count:'exact'}),
        supabase.from('ordens_servico').select('*, clientes(nome), usuarios(nome)').order('criado_em',{ascending:false}).limit(6),
        supabase.from('estoque').select('quantidade,quantidade_minima'),
        supabase.from('financeiro').select('valor').eq('tipo','receita'),

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
      const hoje = new Date().toISOString().split('T')[0]
      const ag = await supabase.from('agenda').select('*,clientes(nome),usuarios(nome)').eq('data',hoje).order('hora_inicio',{ascending:true})
      setAgHoje(ag.data||[])
    }
    load()
  },[])

  const badge = s => ({
    'Concluída':['rgba(16,185,129,.15)','#34D399'],
    'Em Andamento':['rgba(96,165,250,.15)','#93C5FD'],
    'Aberta':['rgba(245,158,11,.15)','#FCD34D'],
    'Aguardando Peça':['rgba(139,92,246,.15)','#C4B5FD'],
    'Cancelada':['rgba(239,68,68,.15)','#FCA5A5'],
  }[s]||['rgba(96,165,250,.15)','#93C5FD'])

  return (
    <AppLayout>
      <div style={{padding:24}}>
        <div style={{marginBottom:24}}>
          <h1 style={{fontSize:22,fontWeight:800,color:'#EEF2FF',letterSpacing:'-0.3px'}}>Dashboard</h1>
          <p style={{fontSize:12,color:'#3D5070',marginTop:3}}>Visão geral do sistema</p>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:12,marginBottom:24}}>
          <Card icon="👷" label="Técnicos"      value={stats.tec}  change="↑ ativos"      up color="blue"/>
          <Card icon="👥" label="Clientes"      value={stats.cli}  change="↑ este mês"    up color="cyan"/>
          <Card icon="📋" label="OS Abertas"    value={stats.osA}  change="em andamento"  up={false} color="yellow"/>
          <Card icon="✅" label="Concluídas"    value={stats.osC}  change="↑ este mês"    up color="green"/>
          <Card icon="💰" label="Faturamento"   value={stats.fat}  change="↑ 12%"         up color="purple"/>
          <Card icon="📦" label="Estoque Baixo" value={stats.estB} change="verificar!"    up={false} color="red"/>
        </div>
        
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:24,alignItems:'start'}}>
        {agHoje.length>0&&(
          <div style={{background:'#0F1729',border:'1px solid rgba(96,165,250,0.07)',borderRadius:16,padding:20}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:16}}>
              <span style={{fontSize:18}}>📅</span>
              <span style={{fontSize:15,fontWeight:800,color:'#EEF2FF'}}>Agenda de Hoje</span>
              <span style={{marginLeft:'auto',background:'rgba(96,165,250,0.15)',color:'#93C5FD',borderRadius:20,padding:'2px 10px',fontSize:12,fontWeight:700}}>{agHoje.length}</span>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {agHoje.map(a=>{
                const st=a.status||'agendado'
                const stC={agendado:{bg:'rgba(245,158,11,.15)',c:'#FCD34D'},confirmado:{bg:'rgba(96,165,250,.15)',c:'#93C5FD'},concluido:{bg:'rgba(16,185,129,.15)',c:'#34D399'},cancelado:{bg:'rgba(239,68,68,.15)',c:'#FCA5A5'}}[st]||{bg:'rgba(96,165,250,.15)',c:'#93C5FD'}
                return(
                  <div key={a.id} onClick={()=>router.push('/agenda?id='+a.id)} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 14px',background:'rgba(96,165,250,0.04)',borderRadius:10,border:'1px solid rgba(96,165,250,0.08)',cursor:'pointer'}}>
                    <span style={{fontSize:13,fontWeight:800,color:'#60A5FA',minWidth:50}}>{a.hora_inicio?.slice(0,5)||'--:--'}</span>
                    <span style={{fontSize:13,fontWeight:700,color:'#EEF2FF',flex:1}}>{a.clientes?.nome||'—'}</span>
                    <span style={{fontSize:12,color:'#8899BB'}}>{a.usuarios?.nome||'—'}</span>
                    <span style={{fontSize:11,padding:'2px 8px',borderRadius:20,background:stC.bg,color:stC.c,fontWeight:700}}>{st}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
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
                {os.length===0 ? (
                  <tr><td colSpan={6} style={{padding:'24px',textAlign:'center',fontSize:13,color:'#3D5070'}}>Nenhuma OS ainda</td></tr>
                ) : os.map(o=>{
                  const [bg,color]=badge(o.status)
                  return (
                    <tr key={o.id}>
                      <td style={{padding:'12px 16px',fontSize:11,fontFamily:'monospace',color:'#3D5070',borderBottom:'1px solid rgba(96,165,250,0.05)'}}># {o.id}</td>
                      <td style={{padding:'12px 16px',fontSize:13,fontWeight:700,color:'#EEF2FF',borderBottom:'1px solid rgba(96,165,250,0.05)'}}>{o.clientes?.nome||o.cliente_id}</td>
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
