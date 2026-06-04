import './TarjetaPrincipal.css';

function getNombre(user) {
  return user?.nombre || user?.datosFisicos?.nombre || 'Atleta';
}

function getPeso(user) {
  const peso = user?.datosFisicos?.peso;
  if (!peso) return '--';
  const clean = String(peso).replace(/kg/gi, '').trim();
  return `${clean}kg`;
}

function getNivel(user) {
  const value = user?.experiencia?.experiencia || user?.experiencia?.nivel || '';
  if (!value) return 'Inicial';
  return String(value).replaceAll('_', ' ').replace(/^./, (c) => c.toUpperCase());
}


function getLevelBars(nivel) {
  const clean = String(nivel || '').toLowerCase();
  if (clean.includes('avanz')) return 5;
  if (clean.includes('inter')) return 3;
  if (clean.includes('princip') || clean.includes('inicial')) return 1;
  return 3;
}

function formatTargetWeight(value) {
  if (!value) return 'Añadir';
  const clean = String(value).replace(/kg/gi, '').trim();
  return clean ? `${clean}kg` : 'Añadir';
}

export default function TarjetaPrincipal({ user, stats, photoUrl, config, onSaveTargetWeight }) {
  const nombre = getNombre(user);
  const peso = getPeso(user);
  const nivel = getNivel(user);
  const levelBars = getLevelBars(nivel);
  const pesoObjetivo = formatTargetWeight(config?.pesoObjetivo);
  const racha = stats?.rachaDias ?? 0;
  const entrenos = stats?.entrenosTotales ?? 0;

  function handleTargetWeightClick() {
    const current = config?.pesoObjetivo || '';
    const nextValue = window.prompt('Peso objetivo en kg', current);
    if (nextValue === null) return;
    const clean = String(nextValue).replace(/kg/gi, '').trim();
    if (!clean) return;
    onSaveTargetWeight?.(clean);
  }

  return (
    <section className="main-home-card" aria-label="Tarjeta principal del usuario">
      <div className="card-person" aria-label="Tu versión más fuerte">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt="Tu versión más fuerte"
            onError={(event) => { event.currentTarget.style.display = 'none'; }}
          />
        ) : null}
      </div>

      <div className="card-content">
        <header className="card-topline">
          <button className="menu-button" type="button" aria-label="Abrir menú">☰</button>
          <p className="card-kicker">MÁS FUERTE QUE AYER</p>
        </header>

        <div className="card-copy">
          <h1>Hola, {nombre} <span>👋</span></h1>
          <p className="card-subtitle">Tu versión más fuerte</p>
          <div className="level-pill" aria-label={`Nivel actual ${nivel}`}>
            <span className="level-bars" aria-hidden="true">
              {Array.from({ length: levelBars }).map((_, index) => (
                <i key={index} />
              ))}
            </span>
            <span className="level-text">{nivel}</span>
            <span className="level-caption">Nivel actual</span>
          </div>
        </div>
      </div>

      <div className="card-separator" aria-hidden="true" />

      <div className="card-stats" aria-label="Resumen del usuario">
        <article>
          <span className="stat-icon" aria-hidden="true">▱</span>
          <small>PESO</small>
          <strong>{peso}</strong>
        </article>

        <button className="stat-button" type="button" onClick={handleTargetWeightClick} aria-label="Añadir o cambiar peso objetivo">
          <span className="stat-icon" aria-hidden="true">◎</span>
          <small>PESO OBJETIVO</small>
          <strong>{pesoObjetivo}</strong>
        </button>

        <article>
          <span className="stat-icon" aria-hidden="true">▣</span>
          <small>ENTRENOS</small>
          <strong>{entrenos}</strong>
        </article>

        <article>
          <span className="stat-icon" aria-hidden="true">🔥</span>
          <small>RACHA</small>
          <strong>{racha} días</strong>
        </article>
      </div>
    </section>
  );
}
