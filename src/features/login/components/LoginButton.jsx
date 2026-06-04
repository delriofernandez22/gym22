export default function LoginButton({ disabled, loading }) {
  return (
    <button className="login-submit" type="submit" disabled={disabled} aria-label={loading ? 'Entrando' : 'Iniciar sesión'}>
      <span className="login-submit-text">{loading ? 'Entrando...' : 'Iniciar sesión'}</span>
    </button>
  );
}
