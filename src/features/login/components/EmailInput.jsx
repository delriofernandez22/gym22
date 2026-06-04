import mailIcon from '../assets/ui/icon-mail-original.png';

export default function EmailInput({ value, error, disabled, onChange }) {
  return (
    <div className="login-control">
      <label className="login-label" htmlFor="email">Correo electrónico</label>
      <div className="login-input-shell">
        <span className="login-input-icon" aria-hidden="true">
          <img className="login-icon-img login-icon-mail" src={mailIcon} alt="" />
        </span>
        <input
          id="email"
          className="login-input"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="Correo electrónico"
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
      {error ? <p className="login-error">{error}</p> : null}
    </div>
  );
}
