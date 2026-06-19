import { useState, useEffect } from 'react';

const BIK = { standardUsers: 10000, fastTrackUsers: 20000, ekGosterge3x: 30000, standardPV: 30000, fastTrackPV: 60000, targetDuration: 60, directRatio: 0.15 };

const fmt = n => Number(n||0).toLocaleString('tr-TR');
const fmtS = s => { const m=Math.floor(s/60),sec=Math.round(s%60); return m>0?`${m}d ${sec}sn`:`${sec}sn`; };
const pct = (v,max) => Math.min(100,Math.round((v/max)*100));

function ProgressBar({value,max,color='#3B8BD4'}) {
  const p=pct(value,max);
  const c=p>=100?'#1D9E75':p>=60?color:'#EF9F27';
  return <div style={{background:'var(--color-background-secondary)',borderRadius:4,height:6,overflow:'hidden',marginTop:6}}><div style={{width:`${p}%`,height:6,background:c,borderRadius:4,transition:'width .4s'}}/></div>;
}

function KPI({label,value,sub,target,unit=''}) {
  return <div style={S.kpi}>
    <div style={S.kpiLabel}>{label}</div>
    <div style={S.kpiVal}>{fmt(value)}{unit}</div>
    {sub&&<div style={S.kpiSub}>{sub}</div>}
    {target!=null&&<><ProgressBar value={value} max={target}/><div style={S.kpiTarget}>{pct(value,target)}% — hedef: {fmt(target)}{unit}</div></>}
  </div>;
}

function ChannelBadge({channel}) {
  const m={'Органик Search':{l:'Organik',c:'#1D9E75'},'Direct':{l:'Doğrudan',c:'#3B8BD4'},'Social':{l:'Sosyal',c:'#7F77DD'},'Referral':{l:'Referans',c:'#EF9F27'}}[channel]||{l:channel,c:'#999'};
  return <span style={{background:m.c+'20',color:m.c,borderRadius:5,fontSize:11,fontWeight:500,padding:'2px 8px'}}>{m.l}</span>;
}

function SparkLine({data,color='#3B8BD4'}) {
  if(!data?.length)return null;
  const vals=data.map(d=>d.users),max=Math.max(...vals,1),W=300,H=60,P=4;
  const x=i=>P+(i/(vals.length-1))*(W-P*2);
  const y=v=>H-P-((v/max)*(H-P*2));
  const pts=vals.map((v,i)=>`${x(i)},${y(v)}`).join(' ');
  return <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',height:60}}>
    <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/>
    <polyline points={`${x(0)},${H} ${pts} ${x(vals.length-1)},${H}`} fill={color} fillOpacity="0.1" stroke="none"/>
  </svg>;
}

export default function GA4Dashboard() {
  const [data,setData]=useState(null),[error,setError]=useState(null),[loading,setLoading]=useState(true);
  useEffect(()=>{
    fetch('/api/ga4').then(r=>r.json()).then(d=>{if(d.ok)setData(d);else setError(d.error);}).catch(e=>setError(e.message)).finally(()=>setLoading(false));
  },[]);

  if(loading)return<div style={S.center}><div style={S.spinner}/><span style={{color:'var(--color-text-secondary)',marginTop:12,fontSize:13}}>GA4 verisi yükleniyor…</span></div>;
  if(error)return<div style={{...S.card,borderColor:'var(--color-border-danger)',color:'var(--color-text-danger)',padding:'1rem'}}>⚠ GA4 hata: {error}</div>;

  const {summary,yesterday,channels,trend,topPages}=data;
  const totalSessions=channels.reduce((s,c)=>s+(c.sessions||0),0);
  const directSessions=channels.find(c=>c.sessionDefaultChannelGrouping==='Direct')?.sessions||0;
  const directRatio=totalSessions>0?directSessions/totalSessions:0;

  return <div style={S.wrap}>
    <div style={S.header}>
      <div><div style={S.title}>kayserim.net — Canlı Dashboard</div><div style={S.subtitle}>Son güncelleme: {new Date(data.generatedAt).toLocaleString('tr-TR')}</div></div>
      <div style={{textAlign:'right'}}><div style={S.subtitle}>Dün</div><div style={{fontSize:20,fontWeight:600,color:yesterday.activeUsers>=BIK.fastTrackUsers?'#1D9E75':'var(--color-text-primary)'}}>{fmt(yesterday.activeUsers)} tekil</div></div>
    </div>

    <div style={{...S.card,background:'var(--color-background-secondary)',marginBottom:16}}>
      <div style={S.secTitle}>BİK 3. Kategori — Hızlı Yol (günlük)</div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:12}}>
        {[{l:'Günlük tekil',v:yesterday.activeUsers,t:BIK.fastTrackUsers},{l:'Günlük PV',v:yesterday.pageViews,t:BIK.fastTrackPV},{l:'Oturum süresi',v:fmtS(yesterday.avgSessionDuration),t:BIK.targetDuration,raw:yesterday.avgSessionDuration},{l:'Doğrudan trafik',v:(directRatio*100).toFixed(1)+'%',t:15,raw:directRatio*100}].map((k,i)=><div key={i}><div style={S.kpiLabel}>{k.l}</div><div style={{fontSize:18,fontWeight:600}}>{k.v}</div><ProgressBar value={k.raw!==undefined?k.raw:k.v} max={k.t}/><div style={S.kpiTarget}>Hedef: {fmt(k.t)}</div></div>)}
      </div>
    </div>

    <div style={S.secTitle}>Son 30 Gün</div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:16}}>
      <KPI label="Toplam tekil" value={summary.activeUsers} sub={`Günlük ort.: ${fmt(summary.dailyAvgUsers)}`}/>
      <KPI label="Toplam oturum" value={summary.sessions}/>
      <KPI label="Sayfa görüntüleme" value={summary.pageViews} sub={`Günlük ort.: ${fmt(summary.dailyAvgPageViews)}`}/>
      <KPI label="Ort. oturum süresi" value={fmtS(summary.avgSessionDuration)}/>
      <KPI label="Hemen çıkma" value={(summary.bounceRate*100).toFixed(1)} unit="%"/>
      <KPI label="Yeni kullanıcılar" value={summary.newUsers}/>
    </div>

    <div style={S.secTitle}>Günlük tekil trend</div>
    <div style={{...S.card,marginBottom:16}}><SparkLine data={trend}/><div style={{display:'flex',justifyContent:'space-between',fontSize:11,color:'var(--color-text-tertiary)',marginTop:4}}><span>30 gün önce</span><span>Bugün</span></div></div>

    <div style={S.secTitle}>Trafik kaynakları</div>
    <div style={{...S.card,marginBottom:16}}>
      {channels.map((ch,i)=>{
        const r=totalSessions>0?(ch.sessions/totalSessions)*100:0;
        return <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'6px 0',borderBottom:i<channels.length-1?'0.5px solid var(--color-border-tertiary)':'none'}}>
          <ChannelBadge channel={ch.sessionDefaultChannelGrouping}/>
          <div style={{flex:1}}><div style={{display:'flex',justifyContent:'space-between',fontSize:12}}><span>{fmt(ch.sessions)} oturum</span><span>{fmt(ch.activeUsers)} tekil</span><span style={{fontWeight:500}}>{r.toFixed(1)}%</span></div><div style={{background:'var(--color-background-secondary)',borderRadius:3,height:4,marginTop:4,overflow:'hidden'}}><div style={{width:`${r}%`,height:4,background:'#3B8BD4',borderRadius:3}}/></div></div>
        </div>;
      })}
    </div>

    <div style={S.secTitle}>En çok okunan sayfalar (son 7 gün)</div>
    <div style={S.card}>
      <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
        <thead><tr style={{borderBottom:'0.5px solid var(--color-border-tertiary)'}}>{['Sayfa','Görüntüleme','Tekil','Süre'].map(h=><th key={h} style={{textAlign:h==='Sayfa'?'left':'right',padding:'4px 6px',color:'var(--color-text-secondary)',fontWeight:500}}>{h}</th>)}</tr></thead>
        <tbody>{topPages.map((p,i)=><tr key={i} style={{borderBottom:'0.5px solid var(--color-border-tertiary)'}}><td style={{padding:'5px 6px',maxWidth:280}}><div style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.title||p.path}</div><div style={{fontSize:10,color:'var(--color-text-tertiary)'}}>{p.path}</div></td><td style={{textAlign:'right',padding:'5px 6px',fontWeight:500}}>{fmt(p.views)}</td><td style={{textAlign:'right',padding:'5px 6px',color:'var(--color-text-secondary)'}}>{fmt(p.users)}</td><td style={{textAlign:'right',padding:'5px 6px',color:'var(--color-text-secondary)'}}>{fmtS(p.duration)}</td></tr>)}</tbody>
      </table>
    </div>
  </div>;
}

const S={
  wrap:{fontFamily:'var(--font-sans,system-ui)',maxWidth:900,margin:'0 auto',padding:16},
  header:{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:16},
  title:{fontSize:17,fontWeight:600,color:'var(--color-text-primary)'},
  subtitle:{fontSize:12,color:'var(--color-text-secondary)',marginTop:2},
  secTitle:{fontSize:10,fontWeight:600,color:'var(--color-text-tertiary)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:8},
  card:{background:'var(--color-background-primary)',border:'0.5px solid var(--color-border-tertiary)',borderRadius:12,padding:'12px 14px',marginBottom:10},
  kpi:{background:'var(--color-background-primary)',border:'0.5px solid var(--color-border-tertiary)',borderRadius:10,padding:'10px 12px'},
  kpiLabel:{fontSize:11,color:'var(--color-text-secondary)',marginBottom:3},
  kpiVal:{fontSize:20,fontWeight:500,color:'var(--color-text-primary)',lineHeight:1},
  kpiSub:{fontSize:11,color:'var(--color-text-secondary)',marginTop:3},
  kpiTarget:{fontSize:10,color:'var(--color-text-tertiary)',marginTop:4},
  center:{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:40},
  spinner:{width:28,height:28,border:'2.5px solid var(--color-border-tertiary)',borderTop:'2.5px solid var(--color-text-primary)',borderRadius:'50%',animation:'spin 0.8s linear infinite'},
};
