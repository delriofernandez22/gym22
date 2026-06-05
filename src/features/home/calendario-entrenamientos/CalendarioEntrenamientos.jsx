import { useEffect, useState } from 'react';
import './CalendarioEntrenamientos.css';

const WEEK_DAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

const STATUS_LABELS = {
  completado: 'Completado',
  cargado: 'Cargado',
  en_progreso: 'Cargado',
  no_realizado: 'No realizado',
  descanso: 'Descanso / Sin entreno',
  sin_entreno: 'Descanso / Sin entreno',
};

function CalendarIcon(){
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M13 8v7M35 8v7M9 16h30M10 12h28v27H10z"/>
      <path d="M17 23h3M24 23h3M31 23h3M17 30h3M24 30h3M31 30h3"/>
    </svg>
  );
}

function Chevron(){
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>;
}

function statusClass(estado){
  if(estado === 'en_progreso') return 'cargado';
  return estado || 'sin_entreno';
}

function buildCalendarCells(dias = []){
  if(!dias.length) return [];
  const first = new Date(`${dias[0].fecha}T12:00:00`);
  const mondayIndex = (first.getDay() + 6) % 7;
  const prevCells = Array.from({length:mondayIndex}, (_,i)=>({placeholder:true, key:`prev-${i}`}));
  return [...prevCells, ...dias.map((dia)=>({...dia, key:dia.fecha}))];
}

function formatMonth(label){
  if(!label) return '';
  return label.charAt(0).toUpperCase() + label.slice(1);
}

async function postJson(url, body){
  const res = await fetch(url, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify(body),
  });
  let data = {};
  try{ data = await res.json(); }catch{}
  if(!res.ok) throw new Error(data.message || 'No se pudo cargar el calendario.');
  return data;
}

function getTrainerSession(){
  return {
    username: localStorage.getItem('gym22.trainerUser') || '',
    password: localStorage.getItem('gym22.trainerPass') || '',
  };
}

function getCurrentUserEmail(){
  try{
    const stored = JSON.parse(localStorage.getItem('gym22.currentUser') || '{}');
    return localStorage.getItem('gym22.currentUserEmail') || stored.email || '';
  }catch{
    return localStorage.getItem('gym22.currentUserEmail') || '';
  }
}

export default function CalendarioEntrenamientos({ calendario }){
  const [viewCalendar, setViewCalendar] = useState(calendario || null);
  const [loadingMonth, setLoadingMonth] = useState(false);
  const [monthError, setMonthError] = useState('');

  useEffect(()=>{
    setViewCalendar(calendario || null);
  }, [calendario]);

  if(!viewCalendar?.dias?.length) return null;

  const cells = buildCalendarCells(viewCalendar.dias);
  const today = viewCalendar.hoy;
  const resumen = viewCalendar.resumen || {};
  const incidentes = resumen.noRealizados ?? 0;

  async function loadMonth(offset){
    if(!viewCalendar) return;
    const year = Number(viewCalendar.year);
    const month = Number(viewCalendar.mes);
    const nextDate = new Date(year, month - 1 + offset, 1);
    const nextYear = nextDate.getFullYear();
    const nextMonth = nextDate.getMonth() + 1;

    setLoadingMonth(true);
    setMonthError('');

    try{
      const folderName = new URLSearchParams(window.location.search).get('folder') || '';

      if(folderName){
        const session = getTrainerSession();
        const res = await postJson('/api/trainer/calendar-month', {
          ...session,
          folderName,
          year: nextYear,
          month: nextMonth,
        });
        setViewCalendar(res.calendario);
      }else{
        const email = getCurrentUserEmail();
        const res = await postJson('/api/home/calendar-month', {
          email,
          year: nextYear,
          month: nextMonth,
        });
        setViewCalendar(res.calendario);
      }
    }catch(err){
      setMonthError(err.message || 'No se pudo cambiar de mes.');
    }finally{
      setLoadingMonth(false);
    }
  }

  function openDay(dia){
    if(!dia || dia.placeholder) return;
    if(!dia.idEntrenamiento || ['descanso','sin_entreno'].includes(dia.estado)){
      return;
    }
    window.location.assign(`/entrenamiento-activo?fecha=${encodeURIComponent(dia.fecha)}&id=${encodeURIComponent(dia.idEntrenamiento)}`);
  }

  return (
    <section className="training-calendar-card" aria-label="Calendario de entrenamientos">
      <div className="calendar-card-bg" aria-hidden="true" />

      <div className="calendar-card-content">
        <header className="calendar-header">
          <div className="calendar-title-wrap">
            <span className="calendar-icon"><CalendarIcon /></span>
            <h2>CALENDARIO DE ENTRENAMIENTOS</h2>
          </div>

          <div className={`calendar-month-nav ${loadingMonth ? 'is-loading' : ''}`}>
            <span>{formatMonth(viewCalendar.mesNombre)}</span>
            <button type="button" aria-label="Mes anterior" onClick={()=>loadMonth(-1)} disabled={loadingMonth}>‹</button>
            <button type="button" aria-label="Mes siguiente" onClick={()=>loadMonth(1)} disabled={loadingMonth}>›</button>
          </div>
        </header>

        {monthError ? <p className="calendar-month-error">{monthError}</p> : null}

        <div className="calendar-weekdays" aria-hidden="true">
          {WEEK_DAYS.map((day)=><span key={day}>{day}</span>)}
        </div>

        <div className="calendar-grid">
          {cells.map((dia)=>(
            <button
              key={dia.key}
              type="button"
              onClick={()=>openDay(dia)}
              disabled={dia.placeholder || !dia.idEntrenamiento || ['descanso','sin_entreno'].includes(dia.estado)}
              className={`calendar-day day-${statusClass(dia.estado)} ${dia.placeholder ? 'is-placeholder' : ''} ${dia.fecha === today?.fecha ? 'is-today' : ''}`}
              aria-label={!dia.placeholder ? `${dia.dia} ${STATUS_LABELS[dia.estado] || ''}` : 'Día vacío'}
            >
              {!dia.placeholder ? <strong>{dia.dia}</strong> : null}
            </button>
          ))}
        </div>

        <div className="calendar-legend">
          <span><i className="legend-ring completado">✓</i> Completado</span>
          <span><i className="legend-ring cargado" /> Cargado</span>
          <span><i className="legend-ring no_realizado">×</i> No realizado</span>
          <span><i className="legend-ring descanso" /> Descanso / Sin entreno</span>
        </div>

        <div className="calendar-summary-row">
          <div className="calendar-summary-block">
            <span>ADHERENCIA MENSUAL</span>
            <strong>{resumen.porcentajeAdherencia ?? 0}%</strong>
            <p>{resumen.completados ?? 0} / {resumen.totalEntrenos ?? 0} entrenamientos</p>
          </div>

          <div className="calendar-summary-block calendar-incidents">
            <span>INCIDENTES</span>
            <strong>{incidentes}</strong>
            <p>Este mes</p>
          </div>

          <button className="summary-chevron" type="button" aria-label="Ver detalles">
            <Chevron />
          </button>
        </div>
      </div>
    </section>
  );
}
