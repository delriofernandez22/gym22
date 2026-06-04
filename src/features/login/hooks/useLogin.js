import { useMemo, useState } from 'react';
import { authService } from '../services/authService.js';

const initialForm={email:'',password:''};
export function useLogin(){
 const [form,setForm]=useState(initialForm); const [errors,setErrors]=useState({}); const [showPassword,setShowPassword]=useState(false); const [isLoading,setIsLoading]=useState(false); const [message,setMessage]=useState(''); const [status,setStatus]=useState('idle');
 const canSubmit=useMemo(()=>form.email.trim().length>0&&form.password.trim().length>0&&!isLoading,[form,isLoading]);
 function updateField(field,value){setForm((p)=>({...p,[field]:value})); setErrors((p)=>({...p,[field]:''})); setMessage('')}
 function validate(){const next={}; const login=form.email.trim(); const isTrainerLogin=login.toLowerCase()==='delrio'; if(!isTrainerLogin&&!/^\S+@\S+\.\S+$/.test(login)) next.email='Escribe un correo válido o usuario entrenador.'; if(form.password.trim().length<6) next.password='La contraseña debe tener mínimo 6 caracteres.'; setErrors(next); return Object.keys(next).length===0}
 async function submitLogin(e){e.preventDefault(); setMessage(''); if(!validate()) return; setIsLoading(true); try{const result=await authService.login({email:form.email.trim(),password:form.password});
      if(result.user?.role==='trainer'){
        localStorage.setItem('gym22.trainerUser', form.email.trim());
        localStorage.setItem('gym22.trainerPass', form.password);
        localStorage.setItem('gym22.currentUser', JSON.stringify(result.user));
        setStatus('success'); setMessage('Inicio de sesión correcto.');
        window.location.assign('/panel-entrenador');
        return;
      }
      localStorage.setItem('gym22.currentUserEmail', result.user.email);
      localStorage.setItem('gym22.currentUserFolder', result.user.folderName || '');
      localStorage.setItem('gym22.currentUser', JSON.stringify(result.user)); setStatus('success'); setMessage('Inicio de sesión correcto.'); window.location.assign(result.user.perfilCompleto?'/home':'/datos-usuario')}catch(err){setStatus('error'); setMessage(err.message||'No se pudo iniciar sesión.')}finally{setIsLoading(false)}}
 async function recoverPassword(){setMessage(''); if(!/^\S+@\S+\.\S+$/.test(form.email.trim())){setErrors((p)=>({...p,email:'Escribe tu correo para recuperar la contraseña.'})); return} setIsLoading(true); try{await authService.recoverPassword(form.email.trim()); setStatus('success'); setMessage('Te hemos enviado instrucciones al correo.')}catch(err){setStatus('error'); setMessage(err.message||'No se pudo recuperar la contraseña.')}finally{setIsLoading(false)}}
 function goToRegister(){window.location.assign('/register')}
 return {form,errors,showPassword,isLoading,message,status,canSubmit,updateField,submitLogin,recoverPassword,goToRegister,togglePasswordVisibility:()=>setShowPassword((v)=>!v)};
}
