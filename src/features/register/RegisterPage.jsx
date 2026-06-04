import RegisterEmailInput from './components/RegisterEmailInput.jsx';
import RegisterPasswordInput from './components/RegisterPasswordInput.jsx';
import CreateProfileButton from './components/CreateProfileButton.jsx';
import LoginLink from './components/LoginLink.jsx';
import { useRegister } from './hooks/useRegister.js';
import registerBackground from './assets/register-bg-clean.png';
import './RegisterPage.css';

export default function RegisterPage() {
  const register = useRegister();

  return (
    <main className="register-screen" aria-label="Crear cuenta GYM 22">
      <section className="register-phone-frame">
        <img className="register-hero" src={registerBackground} alt="" aria-hidden="true" />

        <form className="register-panel" onSubmit={register.submitRegister} noValidate>
          <div className="register-title-block">
            <h1>CREA TU CUENTA</h1>
            <p>Únete y transforma tu mejor versión</p>
          </div>

          <RegisterEmailInput
            value={register.form.email}
            error={register.errors.email}
            disabled={register.isLoading}
            onChange={(value) => register.updateField('email', value)}
          />

          <RegisterPasswordInput
            id="register-password"
            label="Crear contraseña"
            value={register.form.password}
            error={register.errors.password}
            disabled={register.isLoading}
            showPassword={register.showPassword}
            onChange={(value) => register.updateField('password', value)}
            onToggle={register.togglePasswordVisibility}
          />

          <RegisterPasswordInput
            id="register-repeat-password"
            label="Repetir contraseña"
            value={register.form.repeatPassword}
            error={register.errors.repeatPassword}
            disabled={register.isLoading}
            showPassword={register.showRepeatPassword}
            onChange={(value) => register.updateField('repeatPassword', value)}
            onToggle={register.toggleRepeatPasswordVisibility}
          />

          <CreateProfileButton disabled={!register.canSubmit} loading={register.isLoading} />

          {register.message ? (
            <p className={`register-message register-message-${register.status}`} role="status">
              {register.message}
            </p>
          ) : null}

          <LoginLink onClick={register.goToLogin} />
        </form>
      </section>
    </main>
  );
}
