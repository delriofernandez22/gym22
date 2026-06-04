import lockIcon from '../assets/ui/icon-lock-original.png';
import eyeIcon from '../assets/ui/icon-eye-original.png';

export default function PasswordInput({ value, error, disabled, showPassword, onChange, onToggle }) {
  return (
    <div className="login-control">
      <label className="login-label" htmlFor="password">Contraseña</label>
      <div className="login-input-shell">
        <span className="login-input-icon" aria-hidden="true">
          <img className="login-icon-img login-icon-lock" src={lockIcon} alt="" />
        </span>
        <input
          id="password"
          className="login-input"
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          placeholder="Contraseña"
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        />
        <button
          className="login-password-toggle"
          type="button"
          aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          disabled={disabled}
          onClick={onToggle}
        >
          <img className={showPassword ? 'login-eye-img' : 'login-eye-img login-eye-img-muted'} src={eyeIcon} alt="" />
        </button>
      </div>
      {error ? <p className="login-error">{error}</p> : null}
    </div>
  );
}
