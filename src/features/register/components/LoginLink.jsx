export default function LoginLink({ onClick }) {
  return <p className="register-login-link"><span>¿Ya tienes cuenta?</span><button type="button" onClick={onClick}>Inicia sesión</button></p>;
}
