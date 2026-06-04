import { useEffect, useState } from 'react';
import { trainerService } from '../shared/trainerService.js';
import TarjetaCliente from './components/tarjeta-cliente/TarjetaCliente.jsx';
import './HomeEntrenador.css';

export default function HomeEntrenador(){
  const [data,setData]=useState(null);
  const [error,setError]=useState('');

  useEffect(()=>{
    let mounted=true;
    trainerService.getHome()
      .then(res=>{ if(mounted) setData(res); })
      .catch(err=>{ if(mounted) setError(err.message || 'No se pudo cargar el panel.'); });
    return()=>{mounted=false};
  },[]);

  if(error) return <main className="trainer-page"><p className="trainer-error">{error}</p></main>;

  return (
    <main className="trainer-page">
      <section className="trainer-shell">
<section className="trainer-summary-strip">
          <div><strong>{data?.clients?.length ?? 0}</strong><span>Clientes</span></div>
          <div><strong>{data?.clients?.filter(c=>c.entrenamientoHoy?.estado==='completado').length ?? 0}</strong><span>Hoy completados</span></div>
          <div><strong>{data?.clients?.filter(c=>c.entrenamientoHoy?.estado==='en_progreso').length ?? 0}</strong><span>En progreso</span></div>
        </section>

        <section className="trainer-client-list">
          {data ? data.clients.map(client=><TarjetaCliente key={client.folderName} client={client}/>) : <p className="trainer-loading">Cargando usuarios...</p>}
          {data?.clients?.length === 0 ? <p className="trainer-loading">Todavía no hay usuarios clientes.</p> : null}
        </section>
      </section>
    </main>
  );
}
