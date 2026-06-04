import { useMemo, useState } from 'react';
import { registerService } from '../services/registerService.js';

const initialForm = { email: '', password: '', repeatPassword: '' };

export function useRegister() {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showRepeatPassword, setShowRepeatPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('idle');

  const canSubmit = useMemo(() => (
    form.email.trim().length > 0 &&
    form.password.trim().length > 0 &&
    form.repeatPassword.trim().length > 0 &&
    !isLoading
  ), [form, isLoading]);

  function updateField(field, value) {
    setForm((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => ({ ...previous, [field]: '' }));
    setMessage('');
  }

  function validate() {
    const nextErrors = {};
    const email = form.email.trim();

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      nextErrors.email = 'Escribe un correo válido.';
    }

    if (form.password.trim().length < 6) {
      nextErrors.password = 'La contraseña debe tener mínimo 6 caracteres.';
    }

    if (form.repeatPassword !== form.password) {
      nextErrors.repeatPassword = 'Las contraseñas no coinciden.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function submitRegister(event) {
    event.preventDefault();
    setMessage('');

    if (!validate()) return;

    setIsLoading(true);
    try {
      const result = await registerService.createUser({
        email: form.email.trim(),
        password: form.password,
      });
      localStorage.setItem('gym22.currentUserEmail', result.user.email);
      localStorage.setItem('gym22.currentUserFolder', result.user.folderName || '');
      localStorage.setItem('gym22.currentUser', JSON.stringify(result.user));
      setStatus('success');
      setMessage('Perfil creado correctamente.');
      window.location.assign('/datos-usuario');
    } catch (error) {
      setStatus('error');
      setMessage(error.message || 'No se pudo crear el perfil.');
    } finally {
      setIsLoading(false);
    }
  }

  function goToLogin() {
    window.location.assign('/');
  }

  return {
    form,
    errors,
    showPassword,
    showRepeatPassword,
    isLoading,
    message,
    status,
    canSubmit,
    updateField,
    submitRegister,
    goToLogin,
    togglePasswordVisibility: () => setShowPassword((value) => !value),
    toggleRepeatPasswordVisibility: () => setShowRepeatPassword((value) => !value),
  };
}
