import lockIcon from '../assets/ui/icon-lock-original.png';
import eyeIcon from '../assets/ui/icon-eye-original.png';

export default function RegisterPasswordInput({ id, label, value, error, disabled, showPassword, onChange, onToggle }) {
  return (
    <div className="register-control">
      <label className="register-label" htmlFor={id}>{label}</label>
      <div className="register-input-shell">
        <span className="register-input-icon" aria-hidden="true">
          <img className="register-icon-img register-icon-lock" src={lockIcon} alt="" />
        </span>
        <input
          id={id}
          className="register-input"
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          placeholder={label}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        />
        <button className="register-password-toggle" type="button" aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} disabled={disabled} onClick={onToggle}>
          <img className={showPassword ? 'register-eye-img' : 'register-eye-img register-eye-img-muted'} src={eyeIcon} alt="" />
        </button>
      </div>
      {error ? <p className="register-error">{error}</p> : null}
    </div>
  );
}
