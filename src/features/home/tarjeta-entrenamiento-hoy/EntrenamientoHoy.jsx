
import './EntrenamientoHoy.css';

function formatMinutes(value) {
  if (!value && value !== 0) return '-- min';
  const clean = String(value).replace(/min/gi, '').trim();
  return clean ? `${clean} min` : '-- min';
}

function formatExercises(value) {
  if (!value && value !== 0) return '-- ejercicios';
  return `${value} ejercicios`;
}


function formatTrainingDate(entrenamiento){
  const raw = entrenamiento?.data?.dia?.fecha || entrenamiento?.fecha || entrenamiento?.data?.fecha;
  if(!raw) return '';
  const date = new Date(`${raw}T12:00:00`);
  if(Number.isNaN(date.getTime())) return '';
  const dias = ['DOMINGO','LUNES','MARTES','MIÉRCOLES','JUEVES','VIERNES','SÁBADO'];
  const meses = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
  return `${dias[date.getDay()]} · ${String(date.getDate()).padStart(2,'0')} ${meses[date.getMonth()]}`;
}

function getProgress(entrenamiento){
  const total = Number(entrenamiento?.totalEjercicios ?? entrenamiento?.resumen?.totalEjercicios ?? entrenamiento?.ejercicios ?? 0);
  const done = Number(entrenamiento?.ejerciciosCompletados ?? entrenamiento?.resumen?.ejerciciosCompletados ?? 0);
  const porcentaje = Number(entrenamiento?.porcentajeCompletado ?? entrenamiento?.resumen?.porcentaje ?? (total ? Math.round((done / total) * 100) : 0));
  return { total, done, porcentaje };
}

function getEstado(entrenamiento){
  if(!entrenamiento?.exists) return 'no-cargado';
  const progress = getProgress(entrenamiento);
  if(entrenamiento.estado === 'completado' || progress.porcentaje >= 100) return 'completado';
  if(entrenamiento.estado === 'en_progreso' || progress.porcentaje > 0) return 'en_progreso';
  return 'pendiente';
}

export default function EntrenamientoHoy({ entrenamiento }) {
  const loaded = Boolean(entrenamiento?.exists);
  const estado = getEstado(entrenamiento);
  const completado = estado === 'completado';
  const enProgreso = estado === 'en_progreso';
  const progress = getProgress(entrenamiento);
  const dateLabel = formatTrainingDate(entrenamiento);

  function openTraining(){ window.location.assign('/entrenamiento-activo'); }

  return (
    <section className={`training-today-card ${loaded ? 'is-loaded' : 'is-empty'} is-${estado}`} aria-label="Entrenamiento de hoy">
      <div className="training-bg" aria-hidden="true" />
      <div className="training-shade" aria-hidden="true" />

      <div className="training-content">
        <header className="training-header">
          <span className="training-icon" aria-hidden="true">
            <svg viewBox="0 0 48 48" role="img"><path d="M8 20v8M14 16v16M20 22h8M34 16v16M40 20v8" /></svg>
          </span>
          <h2>ENTRENAMIENTO DE HOY</h2>
        </header>

        {loaded ? (
          <div className="training-loaded">
            <span className={`training-status status-${estado}`}>{completado ? 'COMPLETADO' : enProgreso ? 'EN PROGRESO' : 'PENDIENTE'}</span>
            {dateLabel ? <p className="training-date">{dateLabel}</p> : null}
            <p className="training-muscle">{entrenamiento.grupo || 'Entrenamiento cargado'}</p>
            <div className="training-meta" aria-label="Resumen del entrenamiento">
              <span>{formatMinutes(entrenamiento.duracion)}</span>
              <i aria-hidden="true" />
              <span>{progress.total ? `${progress.done}/${progress.total} ejercicios` : formatExercises(entrenamiento.ejercicios)}</span>
            </div>
            {enProgreso ? (
              <div className="training-progress-mini">
                <div><span>{progress.porcentaje}% completado</span></div>
                <i style={{width:`${Math.max(6, progress.porcentaje)}%`}} />
              </div>
            ) : null}
            {entrenamiento.frase ? <p className="training-phrase">{entrenamiento.frase}</p> : null}
            <button onClick={openTraining} className="training-action" type="button">
              {completado ? 'VER RESUMEN' : enProgreso ? 'CONTINUAR ENTRENAMIENTO' : 'INICIAR ENTRENAMIENTO'}
            </button>
          </div>
        ) : (
          <div className="training-empty">
            <p>Tu entrenamiento de hoy</p>
            <p>todavía no está listo.</p>
            <p><strong>Jonatan</strong> está trabajando en ello.</p>
          </div>
        )}
      </div>
    </section>
  );
}
