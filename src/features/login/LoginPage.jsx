import EmailInput from './components/EmailInput.jsx';
import PasswordInput from './components/PasswordInput.jsx';
import LoginButton from './components/LoginButton.jsx';
import ForgotPasswordLink from './components/ForgotPasswordLink.jsx';
import RegisterLink from './components/RegisterLink.jsx';
import { useLogin } from './hooks/useLogin.js';
import loginBackground from './assets/login-bg-exact-clean.png';
import './LoginPage.css';

export default function LoginPage() {
  const login = useLogin();

  return (
    <main className="login-screen" aria-label="Inicio de sesión GYM 22">
      <section className="login-phone-frame">
        <img className="login-hero" src={loginBackground} alt="" aria-hidden="true" />

        <form className="login-panel" onSubmit={login.submitLogin} noValidate>
          <EmailInput
            value={login.form.email}
            error={login.errors.email}
            disabled={login.isLoading}
            onChange={(value) => login.updateField('email', value)}
          />

          <PasswordInput
            value={login.form.password}
            error={login.errors.password}
            disabled={login.isLoading}
            showPassword={login.showPassword}
            onChange={(value) => login.updateField('password', value)}
            onToggle={login.togglePasswordVisibility}
          />

          <ForgotPasswordLink disabled={login.isLoading} onClick={login.recoverPassword} />
          <LoginButton disabled={!login.canSubmit} loading={login.isLoading} />

          {login.message ? (
            <p className={`login-message login-message-${login.status}`} role="status">
              {login.message}
            </p>
          ) : null}

          <div className="login-separator" aria-hidden="true" />
          <RegisterLink onClick={login.goToRegister} />
        </form>
      </section>
    </main>
  );
}
