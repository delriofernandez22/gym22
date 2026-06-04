import { useEffect, useMemo, useState } from 'react';
import { entrenamientoActivoService } from './entrenamientoActivoService.js';
import './EntrenamientoActivo.css';

function fmtObjetivo(serie){
  if(!serie) return '';
  const kg = serie.objetivoKg ?? serie.kg ?? serie.resultadoKg;
  const reps = serie.objetivoReps ?? serie.reps ?? serie.resultadoReps ?? serie.objetivoTiempoSeg;
  if(kg && reps) return `${kg} kg x ${reps} reps`;
  if(kg) return `${kg} kg`;
  if(reps) return `${reps}`;
  return 'Objetivo pendiente';
}

function getMainSet(ex){
  const list = Array.isArray(ex?.objetivo) ? ex.objetivo : [];
  return list.find(s => s.tipo === 'top_set') || list[0] || null;
}

function serieLabel(value){ return String(value ?? '').toUpperCase(); }
function isExactNumber(value){ return typeof value === 'number' || /^\d+(\.\d+)?$/.test(String(value ?? '').trim()); }
function needsResultQuestion(serie){
  const reps = serie?.objetivoReps ?? serie?.reps ?? serie?.objetivoTiempoSeg;
  if(reps === null || reps === undefined || reps === '') return true;
  return !isExactNumber(reps);
}
function displayKg(serie){ return serie?.registro?.resultadoKg ?? serie?.resultadoKg ?? serie?.objetivoKg ?? '--'; }
function displayReps(serie){ return serie?.registro?.resultadoTiempoSeg ?? serie?.registro?.resultadoReps ?? serie?.resultadoTiempoSeg ?? serie?.resultadoReps ?? serie?.objetivoTiempoSeg ?? serie?.objetivoReps ?? '--'; }
function initialStateForSeries(series){
  const result = {};
  series.forEach((serie, i)=>{
    if(serie?.registro?.conseguido === true || serie?.estadoSerie === 'completada') result[i] = 'ok';
    if(serie?.registro?.conseguido === false || serie?.estadoSerie === 'no_conseguida') result[i] = 'fail';
  });
  return result;
}
function getCoachTips(ejercicio){
  const items = [];
  if(ejercicio?.tip) items.push(ejercicio.tip);
  if(Array.isArray(ejercicio?.tecnica)) items.push(...ejercicio.tecnica);
  return items.filter(Boolean);
}

function ClockIcon(){ return <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/></svg>; }
function StarIcon(){ return <svg viewBox="0 0 24 24"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.1-5.6-3-5.6 3 1.1-6.1L3 9.6l6.2-.9L12 3Z"/></svg>; }
function ClipboardIcon(){ return <svg viewBox="0 0 24 24"><path d="M8 5h8M9 3h6v4H9zM6 6h12v15H6z"/></svg>; }
function formatTime(seconds){ const m=Math.floor(seconds/60); const s=seconds%60; return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`; }

function ExerciseCard({ ejercicio, index, total, readOnly=false }){
  const mainSet = getMainSet(ejercicio);
  const initialSeries = Array.isArray(ejercicio?.objetivo) ? ejercicio.objetivo : [];
  const [series, setSeries] = useState(initialSeries);
  const [states, setStates] = useState(()=>initialStateForSeries(initialSeries));
  const [timer, setTimer] = useState(150);
  const [running, setRunning] = useState(false);
  const [failModal, setFailModal] = useState(null);
  const [successModal, setSuccessModal] = useState(null);
  const [commentModal, setCommentModal] = useState(null);
  const coachTips = getCoachTips(ejercicio);

  useEffect(()=>{
    if(!running) return;
    const id = setInterval(()=>{
      setTimer(prev => {
        if(prev <= 1){ clearInterval(id); setRunning(false); return 0; }
        return prev - 1;
      });
    },1000);
    return()=>clearInterval(id);
  },[running]);

  async function saveOk(i, payload={}){
    setStates(prev => ({...prev, [i]: 'ok'}));
    setSeries(prev => prev.map((s,idx)=> idx === i ? {
      ...s,
      resultadoKg: payload.kg ?? s.objetivoKg ?? s.resultadoKg ?? '',
      resultadoReps: payload.reps ?? s.objetivoReps ?? s.resultadoReps ?? '',
      resultadoTiempoSeg: payload.segundos ?? s.resultadoTiempoSeg,
      estadoSerie:'completada',
      registro:{...(s.registro||{}), conseguido:true, estado:'completada'}
    } : s));
    try{
      await entrenamientoActivoService.saveAction({
        type:'serie_ok', ejercicioIndex:index, serieIndex:i,
        kg:payload.kg ?? series[i]?.objetivoKg ?? series[i]?.resultadoKg ?? '',
        reps:payload.reps ?? series[i]?.objetivoReps ?? series[i]?.resultadoReps ?? '',
        segundos:payload.segundos ?? series[i]?.objetivoTiempoSeg ?? series[i]?.resultadoTiempoSeg ?? ''
      });
    }catch(err){ console.warn(err); }
  }

  function markOk(i){
    if(readOnly) return;
    const serie = series[i];
    if(needsResultQuestion(serie)){
      const isTime = serie?.objetivoTiempoSeg !== undefined && serie?.objetivoTiempoSeg !== null;
      setSuccessModal({ index:i, kg: serie?.objetivoKg ?? '', reps: isTime ? '' : '', segundos: isTime ? '' : undefined });
      return;
    }
    saveOk(i);
  }

  function openFail(i){
    if(readOnly) return;
    setFailModal({ index:i, kg: series[i]?.objetivoKg ?? '', reps: series[i]?.objetivoReps ?? series[i]?.objetivoTiempoSeg ?? '', motivo:'' });
  }

  async function saveSuccess(){
    if(!successModal) return;
    await saveOk(successModal.index, successModal);
    setSuccessModal(null);
  }

  async function saveFail(){
    if(!failModal) return;
    setStates(prev => ({...prev, [failModal.index]: 'fail'}));
    setSeries(prev => prev.map((s,i)=> i === failModal.index ? {
      ...s,
      resultadoKg: failModal.kg,
      resultadoReps: failModal.reps,
      notas: failModal.motivo,
      estadoSerie: 'no_conseguida',
      registro:{...(s.registro||{}), conseguido:false, estado:'no_conseguida'}
    } : s));
    try{
      await entrenamientoActivoService.saveAction({
        type:'serie_fail', ejercicioIndex:index, serieIndex:failModal.index,
        kg:failModal.kg, reps:failModal.reps, motivo:failModal.motivo
      });
    }catch(err){ console.warn(err); }
    setFailModal(null);
  }

  function addSerie(){
    if(readOnly) return;
    const last = series[series.length - 1] || {};
    setSeries(prev => [...prev, { serie: prev.length + 1, tipo: 'extra', objetivoKg: last.objetivoKg ?? '', objetivoReps: last.objetivoReps ?? '', estadoSerie: 'pendiente', notas: '' }]);
  }

  return (
    <article className={`active-exercise-card ${readOnly ? 'is-summary' : ''}`}>
      <div className="exercise-bg" aria-hidden="true" />
      <section className="exercise-hero">
        <span className="exercise-count">EJERCICIO {index + 1} DE {total}</span>
        <h2>{ejercicio.nombre || "Ejercicio"}</h2>
        <div className="exercise-goal"><span>OBJETIVO</span><strong>{fmtObjetivo(mainSet)}</strong></div>
        {!readOnly ? <div className="exercise-rest"><ClockIcon /><div><span>DESCANSO RECOMENDADO</span><strong>{formatTime(timer)}</strong></div><button className={`rest-btn ${running ? 'is-running' : ''}`} type="button" onClick={async ()=>{ if(timer === 0) setTimer(150); setRunning(true); try{ await entrenamientoActivoService.saveAction({type:'rest_start', ejercicioIndex:index, segundos:timer || 150}); }catch(err){ console.warn(err); } }}>{running ? 'DESCANSANDO...' : '▶ INICIAR DESCANSO'}</button></div> : null}
        {coachTips.length ? <div className="coach-tip"><StarIcon /><div><span>COACH TIP</span><ul>{coachTips.map((item,i)=><li key={i}>{item}</li>)}</ul></div></div> : null}
      </section>

      <section className="series-box">
        <h3><ClipboardIcon /> REGISTRO DE SERIES</h3>
        <div className="series-table" role="table">
          <div className="series-row series-head" role="row"><span>SERIE</span><span>KG</span><span>REPS</span><span>ESTADO</span><span>COMENT.</span></div>
          {series.map((serie, i)=> (
            <div className="series-row" role="row" key={`${serie.serie}-${i}`}>
              <strong>{serieLabel(serie.serie)}</strong>
              <span>{displayKg(serie)}{displayKg(serie) !== '--' ? ' kg' : ''}</span>
              <span>{displayReps(serie)}</span>
              <span className="status-actions"><button onClick={()=>markOk(i)} className={states[i] === 'ok' ? 'ok selected' : 'ok'} type="button" aria-label="Conseguido" disabled={readOnly}>✓</button><button onClick={()=>openFail(i)} className={states[i] === 'fail' ? 'fail selected' : 'fail'} type="button" aria-label="No conseguido" disabled={readOnly}>×</button></span>
              <button onClick={()=>setCommentModal({index:i, text: serie?.registro?.comentario || serie.notas || ''})} className="comment-btn" type="button" aria-label="Comentario">☰</button>
            </div>
          ))}
        </div>
        {!readOnly ? <button onClick={addSerie} className="add-set" type="button">⊕ AÑADIR SERIE</button> : null}
      </section>

      <section className="exercise-comment"><h3>☰ COMENTARIO DEL EJERCICIO <span>(OPCIONAL)</span></h3><textarea defaultValue={ejercicio?.registro?.comentario || ejercicio?.notas || ''} maxLength="300" placeholder="Escribe tu comentario sobre este ejercicio..." readOnly={readOnly} onBlur={async (e)=>{ if(readOnly) return; try{ await entrenamientoActivoService.saveAction({type:'exercise_comment', ejercicioIndex:index, comentario:e.target.value}); }catch(err){ console.warn(err); } }} /></section>

      {successModal ? <div className="modal-backdrop" role="dialog" aria-modal="true"><div className="modal-card"><h3>CONSEGUIDO</h3><p>El objetivo no tenía un número exacto. Indica lo que hiciste realmente.</p>{successModal.segundos !== undefined ? <label>SEGUNDOS<input value={successModal.segundos} onChange={e=>setSuccessModal({...successModal, segundos:e.target.value})} /></label> : <><label>KG<input value={successModal.kg} onChange={e=>setSuccessModal({...successModal, kg:e.target.value})} /></label><label>REPS<input value={successModal.reps} onChange={e=>setSuccessModal({...successModal, reps:e.target.value})} /></label></>}<div className="modal-actions"><button onClick={()=>setSuccessModal(null)} type="button">Cancelar</button><button onClick={saveSuccess} type="button">Guardar</button></div></div></div> : null}
      {failModal ? <div className="modal-backdrop" role="dialog" aria-modal="true"><div className="modal-card"><h3>NO CONSEGUIDO</h3><p>Indica lo que has conseguido realmente.</p><label>KG<input value={failModal.kg} onChange={e=>setFailModal({...failModal, kg:e.target.value})} /></label><label>REPS<input value={failModal.reps} onChange={e=>setFailModal({...failModal, reps:e.target.value})} /></label><label>MOTIVO<textarea value={failModal.motivo} onChange={e=>setFailModal({...failModal, motivo:e.target.value})} /></label><div className="modal-actions"><button onClick={()=>setFailModal(null)} type="button">Cancelar</button><button onClick={saveFail} type="button">Guardar</button></div></div></div> : null}
      {commentModal ? <div className="modal-backdrop" role="dialog" aria-modal="true"><div className="modal-card"><h3>COMENTARIO</h3><textarea value={commentModal.text} onChange={e=>setCommentModal({...commentModal, text:e.target.value})} placeholder="Comentario de la serie..." /><div className="modal-actions"><button onClick={()=>setCommentModal(null)} type="button">Cancelar</button><button onClick={async ()=>{ try{ await entrenamientoActivoService.saveAction({ type:'serie_comment', ejercicioIndex:index, serieIndex:commentModal.index, comentario:commentModal.text }); }catch(err){ console.warn(err); } setCommentModal(null); }} type="button">Guardar</button></div></div></div> : null}
    </article>
  )
}




function getEnergyInfo(value){
  const n = Number(value || 0);
  if(n <= 2) return { valor:n, estado:'muy_mal_agotado', descripcion:'Muy mal / agotado', emoji:'😵' };
  if(n <= 4) return { valor:n, estado:'muy_bajo', descripcion:'Muy bajo', emoji:'😕' };
  if(n <= 6) return { valor:n, estado:'normal', descripcion:'Normal', emoji:'🙂' };
  if(n <= 8) return { valor:n, estado:'bien_fuerte', descripcion:'Bien / fuerte', emoji:'💪' };
  return { valor:n, estado:'me_siento_brutal', descripcion:'Me siento brutal', emoji:'🔥' };
}

function normalizeEnergyValue(value){
  if(value && typeof value === 'object') return Number(value.valor || 5);
  return Number(value || 5);
}

function EnergyHelpModal({ onClose }){
  return (
    <div className="prep-help-backdrop" role="dialog" aria-modal="true">
      <section className="prep-help-card">
        <button type="button" onClick={onClose}>×</button>
        <h3>¿CÓMO USAMOS TU ENERGÍA?</h3>
        <div className="energy-help-list">
          <p><strong>😵 1–2</strong><span>Muy mal / agotado</span></p>
          <p><strong>😕 3–4</strong><span>Muy bajo</span></p>
          <p><strong>🙂 5–6</strong><span>Normal</span></p>
          <p><strong>💪 7–8</strong><span>Bien / fuerte</span></p>
          <p><strong>🔥 9–10</strong><span>Me siento brutal</span></p>
        </div>
        <small>Tu energía no modifica sola el entrenamiento. También usamos sueño, historial, rendimiento previo y series conseguidas.</small>
      </section>
    </div>
  );
}


function getInitialPrep(data){
  const stored = data?.data?.datosUsuario || data?.datosUsuario || data?.registro?.preparacionDia || {};
  const now = new Date();
  return {
    pesoCorporalKg: stored.pesoCorporalKg ?? '',
    horasSueno: stored.horasSueno ?? '',
    energia: normalizeEnergyValue(stored.energia),
    horaInicio: stored.horaInicio || now.toTimeString().slice(0,5),
    fechaInicio: stored.fechaInicio || now.toISOString(),
  };
}

function DatosDiaResumen({ datos, onEdit }){
  if(!datos?.pesoCorporalKg && !datos?.horasSueno && !datos?.energia) return null;
  return (
    <section className="datos-dia-card">
      <div className="datos-dia-head">
        <span>DATOS DEL DÍA</span>
        {!onEdit ? null : <button type="button" onClick={onEdit}>Editar</button>}
      </div>
      <div className="datos-dia-grid">
        <div><strong>{datos.pesoCorporalKg || '--'} kg</strong><span>Peso</span></div>
        <div><strong>{datos.horasSueno || '--'} h</strong><span>Sueño</span></div>
        <div><strong>{normalizeEnergyValue(datos.energia) || '--'}</strong><span>Energía</span></div>
        <div><strong>{datos.horaInicio || '--:--'}</strong><span>Inicio</span></div>
      </div>
    </section>
  );
}

function PreparacionDiaModal({ data, initial, onCancel, onSave }){
  const [form,setForm] = useState(()=>initial || getInitialPrep(data));
  const [showHelp,setShowHelp] = useState(false);
  const dia = data?.data?.dia || data?.dia || {};
  const objetivo = dia.objetivoDia || data?.objetivoDia || '';

  function update(field,value){
    setForm(prev=>({...prev,[field]:value}));
  }

  const energyInfo = getEnergyInfo(form.energia);
  const canSave = String(form.pesoCorporalKg).trim() && String(form.horasSueno).trim() && String(form.energia).trim();

  return (
    <div className="prep-backdrop" role="dialog" aria-modal="true">
      <section className="prep-sheet">
        <div className="prep-handle" aria-hidden="true" />
        <button className="prep-close" type="button" onClick={onCancel}>×</button>

        <p className="prep-kicker">PREPARACIÓN DEL DÍA</p>
        <h2>Antes de entrenar</h2>
        <p className="prep-copy">Registra cómo te encuentras hoy. Esto se guardará junto al entrenamiento.</p>

        <div className="prep-fields">
          <label>
            Peso actual
            <div className="prep-input-wrap"><input inputMode="decimal" value={form.pesoCorporalKg} onChange={e=>update('pesoCorporalKg', e.target.value)} placeholder="78" /><span>kg</span></div>
          </label>

          <label>
            Horas de sueño
            <div className="prep-input-wrap"><input inputMode="decimal" value={form.horasSueno} onChange={e=>update('horasSueno', e.target.value)} placeholder="7.5" /><span>h</span></div>
          </label>

          <label>
            <span className="prep-label-row">Energía <button type="button" onClick={()=>setShowHelp(true)}>¿Cómo usamos esto?</button></span>
            <div className="energy-picker energy-picker-10">
              {[1,2,3,4,5,6,7,8,9,10].map(n=>(
                <button key={n} type="button" className={Number(form.energia)===n ? 'selected' : ''} onClick={()=>update('energia', n)}>{n}</button>
              ))}
            </div>
            <div className="energy-labels"><span>Muy mal</span><span>Brutal</span></div>
            <div className="energy-feedback">{energyInfo.emoji} {energyInfo.descripcion}</div>
          </label>

          <label>
            Hora de inicio
            <div className="prep-input-wrap"><input type="time" value={form.horaInicio} onChange={e=>update('horaInicio', e.target.value)} /><span>⏱</span></div>
          </label>
        </div>

        {objetivo ? <div className="prep-objective"><span>OBJETIVO DEL DÍA</span><p>{objetivo}</p></div> : null}

        <button className="prep-save" type="button" disabled={!canSave} onClick={()=>onSave({...form, energia:getEnergyInfo(form.energia), fechaInicio:new Date().toISOString()})}>
          GUARDAR Y EMPEZAR
        </button>
        {showHelp ? <EnergyHelpModal onClose={()=>setShowHelp(false)} /> : null}
      </section>
    </div>
  );
}


function ObjetivoDiaCard({ data }){
  const [open,setOpen] = useState(false);
  const dia = data?.data?.dia || data?.dia || {};
  const objetivo = dia.objetivoDia || data?.objetivoDia || '';
  const subtitulo = dia.subtitulo || '';
  const frase = dia.fraseDia || '';
  const contexto = dia.contexto || '';

  if(!objetivo && !subtitulo && !frase && !contexto) return null;

  return (
    <section className="objetivo-dia-card">
      <span>OBJETIVO DEL DÍA</span>
      {objetivo ? <strong>{objetivo}</strong> : null}
      {(subtitulo || frase || contexto) ? (
        <button type="button" onClick={()=>setOpen(!open)}>
          {open ? 'Ocultar contexto ↑' : 'Ver contexto ↓'}
        </button>
      ) : null}
      {open ? (
        <div className="objetivo-dia-contexto">
          {subtitulo ? <p className="subtitulo">{subtitulo}</p> : null}
          {frase ? <p>{frase}</p> : null}
          {contexto ? <p>{contexto}</p> : null}
        </div>
      ) : null}
    </section>
  );
}

export default function EntrenamientoActivo(){
  const [data,setData]=useState(null);
  const [error,setError]=useState('');
  const [finishing,setFinishing]=useState(false);
  const [prepData,setPrepData]=useState(null);
  const [showPrep,setShowPrep]=useState(false);

  useEffect(()=>{
    let mounted=true;
    const fecha = new URLSearchParams(window.location.search).get('fecha') || '';
    entrenamientoActivoService.getToday(fecha)
      .then(res=>{
        if(mounted){
          const prep = getInitialPrep(res.entrenamiento);
          setData(res.entrenamiento);
          setPrepData(prep);
          const isCompleted = res.entrenamiento?.estado === 'completado' || res.entrenamiento?.estadoDia === 'completado' || res.entrenamiento?.registro?.estado === 'completado';
          if(!isCompleted && !(prep.pesoCorporalKg && prep.horasSueno && prep.energia)) setShowPrep(true);
        }
      })
      .catch(err=>{ if(mounted) setError(err.message || 'No se pudo cargar el entrenamiento.'); });
    return()=>{mounted=false};
  },[]);

  const ejercicios = useMemo(()=> {
    if (Array.isArray(data?.ejercicios)) return data.ejercicios;
    if (Array.isArray(data?.ejerciciosLista)) return data.ejerciciosLista;
    if (Array.isArray(data?.data?.ejercicios)) return data.data.ejercicios;
    return [];
  }, [data]);
  const readOnly = data?.estado === 'completado' || data?.estadoDia === 'completado' || data?.registro?.estado === 'completado';

  const hasPrep = Boolean(prepData?.pesoCorporalKg && prepData?.horasSueno && prepData?.energia);

  async function savePreparation(nextPrep){
    setPrepData(nextPrep);
    setShowPrep(false);
    try{
      await entrenamientoActivoService.saveAction({
        type:'start_workout',
        pesoCorporalKg: nextPrep.pesoCorporalKg,
        horasSueno: nextPrep.horasSueno,
        energia: nextPrep.energia,
        horaInicio: nextPrep.horaInicio,
        fechaInicio: nextPrep.fechaInicio,
      });
    }catch(err){
      setError(err.message || 'No se pudo guardar la preparación del día.');
    }
  }

  async function finishWorkout(){
    if(!data?.idEntrenamiento) return;
    setFinishing(true);
    try{ await entrenamientoActivoService.finish(data.idEntrenamiento); window.location.assign('/home'); }
    catch(err){ setError(err.message || 'No se pudo finalizar el entrenamiento.'); setFinishing(false); }
  }

  if(error) return <main className="active-page"><p className="active-error">{error}</p></main>;
  if(!data) return <main className="active-page"><p className="active-loading">Cargando entrenamiento...</p></main>;

  return (
    <main className="active-page">
      <header className="active-header"><button onClick={()=>window.location.assign('/home')} type="button" aria-label="Volver">‹</button><h1>{readOnly ? 'RESUMEN DEL ENTRENAMIENTO' : 'ENTRENAMIENTO ACTIVO'}</h1><button type="button" aria-label="Opciones">•••</button></header>
      <section className="active-training-title"><strong>{data.titulo || data.grupoMuscular}</strong></section>
      <DatosDiaResumen datos={prepData} onEdit={readOnly ? null : ()=>setShowPrep(true)} />
      <ObjetivoDiaCard data={data} />
      <section className="exercise-list">{ejercicios.map((ejercicio,index)=><ExerciseCard key={ejercicio.idEjercicio || index} ejercicio={ejercicio} index={index} total={ejercicios.length} readOnly={readOnly}/>)}</section>
      {data.finisher ? <section className="finisher-box"><h2>{data.finisher.titulo}</h2><p>Finisher cargado al final del entrenamiento.</p></section> : null}
      {!readOnly ? (
        <>
          <button disabled={finishing} onClick={()=> hasPrep ? finishWorkout() : setShowPrep(true)} className="finish-workout" type="button">
            {finishing ? 'GUARDANDO...' : hasPrep ? 'FIN DEL ENTRENAMIENTO' : 'GUARDAR DATOS Y EMPEZAR'}
          </button>
          {showPrep ? <PreparacionDiaModal data={data} initial={prepData} onCancel={()=>setShowPrep(false)} onSave={savePreparation} /> : null}
        </>
      ) : <button onClick={()=>window.location.assign('/home')} className="finish-workout" type="button">VOLVER AL HOME</button>}
    </main>
  )
}
