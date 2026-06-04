import mailIcon from '../assets/ui/icon-mail-original.png';

export default function RegisterEmailInput({ value, error, disabled, onChange }) {
  return (
    <div className="register-control">
      <label className="register-label" htmlFor="register-email">Correo electrónico nuevo</label>
      <div className="register-input-shell">
        <span className="register-input-icon" aria-hidden="true">
          <img className="register-icon-img register-icon-mail" src={mailIcon} alt="" />
        </span>
        <input
          id="register-email"
          className="register-input"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="Correo electrónico nuevo"
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
      {error ? <p className="register-error">{error}</p> : null}
    </div>
  );
}
