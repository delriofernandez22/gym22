import LoginPage from '../features/login/LoginPage.jsx';
import RegisterPage from '../features/register/RegisterPage.jsx';
import OnboardingDatosUsuario from '../features/pagina-datos-usuario/onboarding/OnboardingDatosUsuario.jsx';
import HomePage from '../features/home/HomePage.jsx';
import EntrenamientoActivo from '../features/entrenamiento-activo/EntrenamientoActivo.jsx';
import HomeEntrenador from '../features/panel-entrenador/home-entrenador/HomeEntrenador.jsx';
import DetalleCliente from '../features/panel-entrenador/usuario/detalle-cliente/DetalleCliente.jsx';

export default function App() {
  const path = window.location.pathname;

  if (path === '/register') return <RegisterPage />;
  if (path === '/datos-usuario' || path.startsWith('/datos-usuario/')) return <OnboardingDatosUsuario />;
  if (path === '/home') return <HomePage />;
  if (path === '/entrenamiento-activo') return <EntrenamientoActivo />;
  if (path === '/panel-entrenador') return <HomeEntrenador />;
  if (path === '/panel-entrenador/cliente') return <DetalleCliente />;

  return <LoginPage />;
}
