import { useState, useEffect } from 'react'

const SUPABASE_URL = 'https://ifcqzgwassoqtrefkinm.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmY3F6Z3dhc3NvcXRyZWZraW5tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNDE3MTYsImV4cCI6MjA4MzkxNzcxNn0.8uOt18qIhf-r8q62e1WYTnL2rl6TxBozux3qDM90yiU'

async function query(table, options = {}) {
  let url = `${SUPABASE_URL}/rest/v1/${table}?`
  if (options.filter) url += `${options.filter}&`
  if (options.order) url += `order=${options.order}&`
  if (options.limit) url += `limit=${options.limit}&`
  const response = await fetch(url, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  })
  return response.json()
}

const t = { primary: '#F97316', dark: '#09090B', gray: '#18181B', gray2: '#27272A', gray3: '#3F3F46', white: '#FAFAFA', textGray: '#A1A1AA', success: '#22C55E', warning: '#F59E0B', danger: '#EF4444', info: '#3B82F6', purple: '#8B5CF6' }

export default function App() {
  const [time, setTime] = useState(new Date())
  const [tab, setTab] = useState('instalaciones')
  const [loading, setLoading] = useState(true)
  const [blink, setBlink] = useState(true)
  const [instalaciones, setInstalaciones] = useState([])
  const [turnos, setTurnos] = useState([])
  const [alertas, setAlertas] = useState([])
  const [rondas, setRondas] = useState([])
  const [reportes, setReportes] = useState([])
  const [guardias, setGuardias] = useState([])
  const [selected, setSelected] = useState(null)

  useEffect(() => { const i = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(i) }, [])
  useEffect(() => { const i = setInterval(() => setBlink(b => !b), 500); return () => clearInterval(i) }, [])
  useEffect(() => { loadData(); const i = setInterval(loadData, 15000); return () => clearInterval(i) }, [])

  const loadData = async () => {
    try {
      const [inst, guard, turn, alert, rond, rep] = await Promise.all([
        query('is_instalaciones', { filter: 'activo=eq.true' }),
        query('is_guardias', { filter: 'activo=eq.true' }),
        query('is_turnos', { order: 'created_at.desc', limit: 200 }),
        query('is_alertas', { order: 'created_at.desc', limit: 100 }),
        query('is_rondas', { order: 'created_at.desc', limit: 500 }),
        query('is_reportes', { order: 'created_at.desc', limit: 200 })
      ])
      const processed = (inst || []).map(i => {
        const turno = (turn || []).find(ti => ti.instalacion_id === i.id && ti.estado === 'activo')
        const guardia = turno ? (guard || []).find(g => g.id === turno.guardia_id) : null
        const rondasT = turno ? (rond || []).filter(r => r.turno_id === turno.id) : []
        const reportesT = turno ? (rep || []).filter(r => r.turno_id === turno.id) : []
        const lastAct = rondasT[0]?.timestamp_fin || turno?.checkin_timestamp
        const mins = lastAct ? Math.floor((new Date() - new Date(lastAct)) / 60000) : 999
        let estado = 'sin_guardia', prio = 0
        if (turno) {
          const emerg = (alert || []).some(a => a.instalacion_id === i.id && a.tipo === 'emergencia' && !a.leida)
          const urg = reportesT.some(r => r.tipo === 'urgente')
          const pend = mins > (i.intervalo_rondas || 60)
          if (emerg || urg) { estado = 'critico'; prio = 3 }
          else if (pend) { estado = 'alerta'; prio = 2 }
          else { estado = 'ok'; prio = 0 }
        }
        return { ...i, turno, guardia, rondas_count: rondasT.length, reportes_count: reportesT.length, mins, estado, prio }
      })
      processed.sort((a, b) => b.prio - a.prio)
      setInstalaciones(processed)
      setGuardias(guard || [])
      setTurnos(turn || [])
      setAlertas(alert || [])
      setRondas(rond || [])
      setReportes(rep || [])
      setLoading(false)
    } catch (e) { console.error(e); setLoading(false) }
  }

  const activos = turnos.filter(t => t.estado === 'activo').length
  const criticos = instalaciones.filter(i => i.estado === 'critico').length
  const enAlerta = instalaciones.filter(i => i.estado === 'alerta').length
  const noLeidas = alertas.filter(a => !a.leida).length
  const conCheckin = instalaciones.filter(i => i.turno)
  const sinCheckin = instalaciones.filter(i => !i.turno)

  const fmt = d => `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`
  const fmtD = d => `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()}`
  const fmtH = h => h ? h.substring(0,5).replace(':','h') : '--'

  if (loading) return (
    <div style={{ minHeight: '100vh', background: t.dark, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: t.textGray }}>Cargando...</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: t.dark, fontFamily: 'system-ui' }}>
      <header style={{ background: t.gray, borderBottom: `1px solid ${t.gray2}`, padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, background: t.primary, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: t.white, fontSize: 14 }}>🛡️</span>
          </div>
          <div>
            <h1 style={{ color: t.white, fontSize: 13, fontWeight: 700, margin: 0 }}>Centro de Control</h1>
            <p style={{ color: t.primary, fontSize: 8, margin: 0 }}>GENIA TECH × INOUT</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ padding: '4px 10px', background: t.gray2, borderRadius: 6 }}>
            <span style={{ color: t.success, fontSize: 11, fontWeight: 600 }}>👥 {activos}</span>
          </div>
          {criticos > 0 && (
            <div style={{ padding: '4px 10px', background: `${t.danger}20`, border: `1px solid ${t.danger}`, borderRadius: 6 }}>
              <span style={{ color: t.danger, fontSize: 11, fontWeight: 700, opacity: blink ? 1 : 0.3 }}>🚨 {criticos}</span>
            </div>
          )}
          {enAlerta > 0 && (
            <div style={{ padding: '4px 10px', background: `${t.warning}20`, border: `1px solid ${t.warning}`, borderRadius: 6 }}>
              <span style={{ color: t.warning, fontSize: 11, fontWeight: 700, opacity: blink ? 1 : 0.3 }}>⚠️ {enAlerta}</span>
            </div>
          )}
          <div style={{ textAlign: 'right' }}>
            <p style={{ color: t.white, fontSize: 13, fontWeight: 600, margin: 0, fontFamily: 'monospace' }}>{fmt(time)}</p>
            <p style={{ color: t.textGray, fontSize: 8, margin: 0 }}>{fmtD(time)}</p>
          </div>
        </div>
      </header>

      <div style={{ background: t.gray, borderBottom: `1px solid ${t.gray2}`, padding: '0 16px', display: 'flex', gap: 4, overflowX: 'auto' }}>
        {[
          { id: 'instalaciones', label: '🏢 Instalaciones' },
          { id: 'checkins', label: '✅ Check-ins', badge: sinCheckin.length },
          { id: 'seguimiento', label: '👁️ Seguimiento', badge: criticos + enAlerta },
          { id: 'alertas', label: '🔔 Alertas', badge: noLeidas },
          { id: 'reportes', label: '📋 Reportes' },
        ].map(item => (
          <button key={item.id} onClick={() => setTab(item.id)} style={{ padding: '8px 12px', background: 'transparent', border: 'none', borderBottom: `2px solid ${tab === item.id ? t.primary : 'transparent'}`, color: tab === item.id ? t.primary : t.textGray, fontSize: 10, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            {item.label}
            {item.badge > 0 && <span style={{ marginLeft: 4, padding: '1px 4px', background: t.danger, borderRadius: 6, fontSize: 8, color: t.white }}>{item.badge}</span>}
          </button>
        ))}
      </div>

      <main style={{ padding: 12 }}>
        {tab === 'instalaciones' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h2 style={{ color: t.white, fontSize: 13, fontWeight: 700, margin: '0 0 8px' }}>Instalaciones ({instalaciones.length})</h2>
            {instalaciones.map(inst => (
              <div key={inst.id} onClick={() => setSelected(inst)} style={{ background: t.gray, borderRadius: 10, padding: '10px 12px', border: `1px solid ${inst.estado === 'critico' ? t.danger : inst.estado === 'alerta' ? t.warning : t.gray2}`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: inst.estado === 'ok' ? t.success : inst.estado === 'alerta' ? t.warning : inst.estado === 'critico' ? t.danger : t.gray3, opacity: (inst.estado === 'alerta' || inst.estado === 'critico') && blink ? 0.3 : 1 }} />
                <div style={{ flex: 1 }}>
                  <span style={{ color: t.white, fontSize: 12, fontWeight: 700 }}>{inst.codigo || inst.nombre}</span>
                  <p style={{ color: t.textGray, fontSize: 9, margin: '2px 0 0' }}>{inst.direccion}</p>
                </div>
                {inst.guardia ? (
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ color: t.white, fontSize: 10, margin: 0 }}>{inst.guardia.nombre}</p>
                    <p style={{ color: t.textGray, fontSize: 9, margin: 0 }}>R:{inst.rondas_count} | {inst.mins < 999 ? `${inst.mins}m` : '--'}</p>
                  </div>
                ) : <span style={{ color: t.gray3, fontSize: 9 }}>Sin guardia</span>}
              </div>
            ))}
          </div>
        )}

        {tab === 'checkins' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              <div style={{ background: t.gray, borderRadius: 10, padding: 12, textAlign: 'center' }}>
                <p style={{ color: t.success, fontSize: 24, fontWeight: 700, margin: 0 }}>{conCheckin.length}</p>
                <p style={{ color: t.textGray, fontSize: 9, margin: 0 }}>ACTIVOS</p>
              </div>
              <div style={{ background: t.gray, borderRadius: 10, padding: 12, textAlign: 'center' }}>
                <p style={{ color: t.warning, fontSize: 24, fontWeight: 700, margin: 0 }}>{sinCheckin.length}</p>
                <p style={{ color: t.textGray, fontSize: 9, margin: 0 }}>PENDIENTES</p>
              </div>
              <div style={{ background: t.gray, borderRadius: 10, padding: 12, textAlign: 'center' }}>
                <p style={{ color: t.white, fontSize: 24, fontWeight: 700, margin: 0 }}>{instalaciones.length}</p>
                <p style={{ color: t.textGray, fontSize: 9, margin: 0 }}>TOTAL</p>
              </div>
            </div>
            {sinCheckin.length > 0 && (
              <div style={{ background: `${t.warning}10`, border: `1px solid ${t.warning}`, borderRadius: 10, padding: 12 }}>
                <h3 style={{ color: t.warning, fontSize: 11, fontWeight: 700, margin: '0 0 8px' }}>⚠️ Pendientes</h3>
                {sinCheckin.map(inst => (
                  <div key={inst.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: t.gray, borderRadius: 6, marginBottom: 4 }}>
                    <span style={{ color: t.white, fontSize: 11 }}>{inst.codigo}</span>
                    <span style={{ color: t.warning, fontSize: 10 }}>SIN GUARDIA</span>
                  </div>
                ))}
              </div>
            )}
            <div style={{ background: t.gray, borderRadius: 10, padding: 12 }}>
              <h3 style={{ color: t.white, fontSize: 11, fontWeight: 700, margin: '0 0 8px' }}>✅ En Servicio</h3>
              {conCheckin.map(inst => (
                <div key={inst.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: t.gray2, borderRadius: 6, marginBottom: 4 }}>
                  <span style={{ color: t.white, fontSize: 10 }}>{inst.guardia?.nombre} → {inst.codigo}</span>
                  <span style={{ color: t.success, fontSize: 10 }}>{fmtH(inst.turno?.checkin_hora)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'seguimiento' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {instalaciones.filter(i => i.estado === 'alerta' || i.estado === 'critico').length === 0 ? (
              <div style={{ background: `${t.success}10`, border: `1px solid ${t.success}`, borderRadius: 12, padding: 30, textAlign: 'center' }}>
                <p style={{ color: t.success, fontSize: 14, fontWeight: 700 }}>✅ Todo en Orden</p>
              </div>
            ) : (
              instalaciones.filter(i => i.estado === 'alerta' || i.estado === 'critico').map(inst => (
                <div key={inst.id} style={{ background: inst.estado === 'critico' ? `${t.danger}10` : `${t.warning}10`, border: `1px solid ${inst.estado === 'critico' ? t.danger : t.warning}`, borderRadius: 10, padding: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ color: t.white, fontSize: 14, fontWeight: 700 }}>{inst.codigo}</span>
                    <span style={{ color: inst.estado === 'critico' ? t.danger : t.warning, fontSize: 10, fontWeight: 700 }}>{inst.estado === 'critico' ? '🚨 CRÍTICO' : '⚠️ ALERTA'}</span>
                  </div>
                  {inst.guardia && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: t.gray, borderRadius: 8, padding: 10 }}>
                      <div>
                        <p style={{ color: t.white, fontSize: 11, margin: 0 }}>{inst.guardia.nombre} {inst.guardia.apellido}</p>
                        <p style={{ color: t.textGray, fontSize: 9, margin: 0 }}>{inst.mins < 999 ? `${inst.mins} min sin reportar` : 'Sin actividad'}</p>
                      </div>
                      <a href={`tel:${inst.guardia.telefono}`} style={{ padding: '6px 12px', background: t.success, borderRadius: 6, color: t.white, fontSize: 10, fontWeight: 700, textDecoration: 'none' }}>📞 Llamar</a>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'alertas' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {alertas.length === 0 ? (
              <div style={{ padding: 30, textAlign: 'center', background: t.gray, borderRadius: 10 }}>
                <p style={{ color: t.textGray }}>No hay alertas</p>
              </div>
            ) : alertas.map(a => (
              <div key={a.id} style={{ background: t.gray, borderRadius: 10, padding: 12, border: `1px solid ${a.leida ? t.gray2 : t.danger}`, opacity: a.leida ? 0.6 : 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <p style={{ color: t.white, fontSize: 11, fontWeight: 600, margin: 0 }}>{a.titulo}</p>
                  <span style={{ color: t.textGray, fontSize: 9 }}>{new Date(a.created_at).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                {a.mensaje && <p style={{ color: t.textGray, fontSize: 10, margin: '4px 0 0' }}>{a.mensaje}</p>}
              </div>
            ))}
          </div>
        )}

        {tab === 'reportes' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {reportes.length === 0 ? (
              <div style={{ padding: 30, textAlign: 'center', background: t.gray, borderRadius: 10 }}>
                <p style={{ color: t.textGray }}>No hay reportes</p>
              </div>
            ) : reportes.slice(0, 20).map(r => {
              const turno = turnos.find(ti => ti.id === r.turno_id)
              const guardia = turno ? guardias.find(g => g.id === turno.guardia_id) : null
              const inst = turno ? instalaciones.find(i => i.id === turno.instalacion_id) : null
              return (
                <div key={r.id} style={{ background: t.gray, borderRadius: 10, padding: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: 8, fontWeight: 700, background: r.tipo === 'urgente' ? `${t.danger}20` : `${t.info}20`, color: r.tipo === 'urgente' ? t.danger : t.info }}>{r.tipo?.toUpperCase()}</span>
                    <span style={{ color: t.textGray, fontSize: 9 }}>{fmtH(r.hora)} | {inst?.codigo}</span>
                  </div>
                  <p style={{ color: t.white, fontSize: 11, margin: '4px 0' }}>{r.descripcion}</p>
                  <span style={{ color: t.textGray, fontSize: 9 }}>👤 {guardia?.nombre} {guardia?.apellido}</span>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 12 }} onClick={() => setSelected(null)}>
          <div style={{ background: t.gray, borderRadius: 16, width: '100%', maxWidth: 400, maxHeight: '85vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: 16, borderBottom: `1px solid ${t.gray2}`, display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ color: t.white, fontSize: 16, fontWeight: 700, margin: 0 }}>{selected.codigo}</h2>
                <p style={{ color: t.textGray, fontSize: 10, margin: 0 }}>{selected.direccion}</p>
              </div>
              <button onClick={() => setSelected(null)} style={{ width: 28, height: 28, background: t.gray2, border: 'none', borderRadius: 6, color: t.textGray, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ padding: 16 }}>
              {selected.guardia ? (
                <div style={{ background: t.gray2, borderRadius: 10, padding: 12, marginBottom: 12 }}>
                  <p style={{ color: t.white, fontSize: 13, fontWeight: 700, margin: 0 }}>{selected.guardia.nombre} {selected.guardia.apellido}</p>
                  <p style={{ color: t.textGray, fontSize: 9, margin: '4px 0' }}>Check-in: {fmtH(selected.turno?.checkin_hora)}</p>
                  <a href={`tel:${selected.guardia.telefono}`} style={{ display: 'inline-block', padding: '8px 12px', background: t.success, borderRadius: 6, color: t.white, fontSize: 10, fontWeight: 700, textDecoration: 'none', marginTop: 8 }}>📞 Llamar</a>
                </div>
              ) : (
                <div style={{ background: `${t.warning}10`, border: `1px solid ${t.warning}`, borderRadius: 10, padding: 12, marginBottom: 12, textAlign: 'center' }}>
                  <p style={{ color: t.warning, fontSize: 11, margin: 0 }}>Sin guardia asignado</p>
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                <div style={{ background: t.gray2, borderRadius: 8, padding: 10, textAlign: 'center' }}>
                  <p style={{ color: t.purple, fontSize: 18, fontWeight: 700, margin: 0 }}>{selected.rondas_count}</p>
                  <p style={{ color: t.textGray, fontSize: 8, margin: 0 }}>RONDAS</p>
                </div>
                <div style={{ background: t.gray2, borderRadius: 8, padding: 10, textAlign: 'center' }}>
                  <p style={{ color: t.info, fontSize: 18, fontWeight: 700, margin: 0 }}>{selected.reportes_count}</p>
                  <p style={{ color: t.textGray, fontSize: 8, margin: 0 }}>REPORTES</p>
                </div>
                <div style={{ background: t.gray2, borderRadius: 8, padding: 10, textAlign: 'center' }}>
                  <p style={{ color: selected.mins > 60 ? t.warning : t.success, fontSize: 18, fontWeight: 700, margin: 0 }}>{selected.mins < 999 ? selected.mins : '--'}</p>
                  <p style={{ color: t.textGray, fontSize: 8, margin: 0 }}>MIN</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
