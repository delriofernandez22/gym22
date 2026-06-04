export default function CreateProfileButton({ disabled, loading }) {
  return (
    <button className="register-submit" type="submit" disabled={disabled} aria-label={loading ? 'Creando perfil' : 'Crear perfil'}>
      <span className="register-submit-text">{loading ? 'Creando...' : 'Crear perfil'}</span>
    </button>
  );
}
