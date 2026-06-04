import { useEffect, useState } from 'react';
import { homeService } from './homeService.js';
import TarjetaPrincipal from './tarjeta-principal/TarjetaPrincipal.jsx';
import EntrenamientoHoy from './tarjeta-entrenamiento-hoy/EntrenamientoHoy.jsx';
import CalendarioEntrenamientos from './calendario-entrenamientos/CalendarioEntrenamientos.jsx';
import './HomePage.css';

export default function HomePage() {
  const [home, setHome] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    homeService.getHome()
      .then((data) => { if (mounted) setHome(data); })
      .catch((err) => {
        if (!mounted) return;
        setError(err.message || 'No se pudo cargar el Home.');
        window.setTimeout(() => window.location.assign('/'), 800);
      });
    return () => { mounted = false; };
  }, []);

  async function handleSaveTargetWeight(pesoObjetivo) {
    const result = await homeService.updateTargetWeight(pesoObjetivo);
    setHome((current) => ({
      ...current,
      home: {
        ...(current?.home || {}),
        tarjetaPrincipal: result.config,
      },
    }));
  }

  if (error) return <main className="home-page"><p className="home-error">{error}</p></main>;

  return (
    <main className="home-page" aria-label="Home GYM22 del usuario activo">
      <section className="home-shell">
        {home ? (
          <>
            <TarjetaPrincipal
              user={home.user}
              stats={home.stats}
              photoUrl={homeService.getMainPhotoUrl()}
              config={home.home?.tarjetaPrincipal}
              onSaveTargetWeight={handleSaveTargetWeight}
            />
            <EntrenamientoHoy entrenamiento={home.home?.entrenamientoHoy} />
            <CalendarioEntrenamientos calendario={home.home?.calendarioEntrenamientos} />
          </>
        ) : (
          <div className="home-loading">Cargando tu Home...</div>
        )}
      </section>
    </main>
  );
}
