import './TarjetaCliente.css';

function initials(name=''){
  return name.split(' ').filter(Boolean).slice(0,2).map(p=>p[0]).join('').toUpperCase() || 'U';
}

export default function TarjetaCliente({ client }){
  const nombre = `${client.nombre || 'Usuario'} ${client.apellidos || ''}`.trim();
  const resumen = client.calendarioResumen || {};
  const hoy = client.entrenamientoHoy || {};
  const estado = hoy.estado || 'sin_entreno';

  function openClient(){
    window.location.assign(`/panel-entrenador/cliente?folder=${encodeURIComponent(client.folderName)}`);
  }

  return (
    <article className="trainer-client-card" onClick={openClient}>
      <div className="client-photo-wrap">
        {client.fotoUrl ? <img src={client.fotoUrl} alt="" /> : <span>{initials(nombre)}</span>}
      </div>

      <div className="client-info">
        <p className="client-kicker">CLIENTE</p>
        <h3>{nombre}</h3>
        <p className="client-plan">{hoy.grupo || 'Sin entrenamiento cargado'}</p>

        <div className="client-stats">
          <span><strong>{resumen.porcentajeAdherencia ?? 0}%</strong> adherencia</span>
          <span><strong>{resumen.completados ?? 0}</strong> completados</span>
        </div>
      </div>

      <div className={`client-state state-${estado}`}>
        {estado === 'completado' ? 'Completado' : estado === 'en_progreso' ? 'En progreso' : estado === 'pendiente' ? 'Pendiente' : 'Sin entreno'}
      </div>
    </article>
  );
}
