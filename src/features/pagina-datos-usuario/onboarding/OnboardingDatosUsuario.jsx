import { useMemo, useRef, useState } from 'react';
import { userProfileService } from '../shared/userProfileService.js';
import {
  CameraIcon, UserIcon, CalendarIcon, RulerIcon, WeightIcon, PercentIcon,
  MuscleIcon, FlameIcon, ChartIcon, TrophyIcon, HeartIcon, DotsIcon,
  DumbbellIcon, HyroxIcon, KettlebellIcon, RunnerIcon, ClockIcon, LockIcon,
} from '../shared/icons.jsx';
import background from '../assets/user-data-bg.png';
import './OnboardingDatosUsuario.css';

const objetivos = [
  { value: 'ganar_musculo', title: 'Ganar músculo', desc: 'Aumenta tu masa muscular y fuerza.', icon: MuscleIcon },
  { value: 'perder_grasa', title: 'Perder grasa', desc: 'Reduce tu porcentaje de grasa corporal.', icon: FlameIcon },
  { value: 'mejorar_rendimiento', title: 'Mejorar rendimiento', desc: 'Aumenta tu resistencia, fuerza y capacidades físicas.', icon: ChartIcon },
  { value: 'preparar_competicion', title: 'Preparar competición', desc: 'Prepárate para competir y dar tu mejor versión.', icon: TrophyIcon },
  { value: 'salud_general', title: 'Salud general', desc: 'Mejora tu salud, energía y calidad de vida.', icon: HeartIcon },
  { value: 'otro', title: 'Otro', desc: 'Tengo otro objetivo en mente.', icon: DotsIcon },
];
const practicas = [
  { value: 'gym', title: 'Gym', desc: 'Entrenamiento de fuerza en el gimnasio.', icon: DumbbellIcon },
  { value: 'hyrox', title: 'HYROX', desc: 'Entrenamiento funcional y de resistencia.', icon: HyroxIcon },
  { value: 'crossfit', title: 'CrossFit', desc: 'Entrenamiento funcional de alta intensidad.', icon: KettlebellIcon },
  { value: 'running', title: 'Running', desc: 'Carrera y entrenamiento de resistencia.', icon: RunnerIcon },
  { value: 'fuerza', title: 'Fuerza', desc: 'Entrenamiento de fuerza máxima y potencia.', icon: MuscleIcon },
  { value: 'calistenia', title: 'Calistenia', desc: 'Entrenamiento con el peso corporal.', icon: DumbbellIcon },
  { value: 'otro', title: 'Otro', desc: 'Tengo otra actividad principal.', icon: DotsIcon, wide: true },
];
const niveles = [
  { value: 'principiante', title: 'Principiante', desc: 'Estoy empezando' },
  { value: 'intermedio', title: 'Intermedio', desc: 'Tengo experiencia' },
  { value: 'avanzado', title: 'Avanzado', desc: 'Entreno desde hace años' },
];
const dias = ['1', '2', '3', '4', '5', '6', '7+'];
const tiempos = [
  { value: 'menos_45', title: 'Menos de 45 min' },
  { value: '45_60', title: '45 - 60 min' },
  { value: '60_90', title: '60 - 90 min' },
  { value: 'mas_90', title: 'Más de 90 min' },
];
const initial = { nombre:'', edad:'', altura:'', peso:'', grasa:'', fotoPreview:'', objetivo:'ganar_musculo', practicas:['gym'], practicaOtro:'', experiencia:'principiante', diasSemana:'4', tiempoSesion:'menos_45', lesiones:'', observaciones:'' };

function normalizeNumber(value) {
  return Number(String(value || '').replace(',', '.').replace(/[^0-9.]/g, ''));
}
function getImc(peso, altura) {
  const kg = normalizeNumber(peso);
  const cm = normalizeNumber(altura);
  if (!kg || !cm) return null;
  const imc = kg / Math.pow(cm / 100, 2);
  return Number.isFinite(imc) ? imc : null;
}
function imcState(imc) {
  if (!imc) return 'Automático';
  if (imc < 18.5) return 'Bajo';
  if (imc < 25) return 'Normal';
  if (imc < 30) return 'Alto';
  return 'Muy alto';
}
function Header({ title, subtitle }) {
  return <header className="onboarding-header"><h1>{title}</h1><p>{subtitle}</p></header>;
}
function Field({ icon: Icon, label, placeholder, value, onChange, onBlur, inputMode }) {
  return <label className="onboarding-field"><Icon/><span><b>{label}</b><input inputMode={inputMode} value={value} placeholder={placeholder} onChange={(e)=>onChange(e.target.value)} onBlur={onBlur}/></span></label>;
}
function OptionCard({ item, selected, onClick }) {
  const Icon = item.icon || UserIcon;
  return <button type="button" className={`onboarding-card ${selected?'selected':''} ${item.wide?'wide':''}`} onClick={onClick}><Icon/>{selected?<span className="onboarding-check">✓</span>:null}<strong>{item.title}</strong><p>{item.desc}</p></button>;
}

export default function OnboardingDatosUsuario() {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const fileRef = useRef(null);
  const imc = useMemo(() => getImc(form.peso, form.altura), [form.peso, form.altura]);
  function update(field, value) { setForm((prev)=>({ ...prev, [field]: value })); setMessage(''); }
  async function saveStep(step, custom = form) {
    try {
      setSaving(true);
      if (step === 1) await userProfileService.saveStep(1, { nombre:custom.nombre, edad:custom.edad, altura:custom.altura, peso:custom.peso, grasa:custom.grasa, imc: imc ? Number(imc.toFixed(1)) : null });
      if (step === 2) await userProfileService.saveStep(2, { objetivo: custom.objetivo });
      if (step === 3) await userProfileService.saveStep(3, { practicas: custom.practicas, otro: custom.practicaOtro });
      if (step === 4) await userProfileService.saveStep(4, { experiencia:custom.experiencia, diasSemana:custom.diasSemana, tiempoSesion:custom.tiempoSesion, lesiones:custom.lesiones, observaciones:custom.observaciones });
    } finally { setSaving(false); }
  }
  async function handlePhoto(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const photoDataUrl = String(reader.result || '');
      setForm((prev)=>({ ...prev, fotoPreview: photoDataUrl }));
      try { await userProfileService.savePhoto(photoDataUrl); } catch (error) { setMessage(error.message); }
    };
    reader.readAsDataURL(file);
  }
  function chooseObjetivo(value) { const next={...form, objetivo:value}; setForm(next); saveStep(2,next).catch((e)=>setMessage(e.message)); }
  function togglePractica(value) {
    const nextPracticas = form.practicas.includes(value) ? form.practicas.filter((item)=>item!==value) : [...form.practicas, value];
    const next = { ...form, practicas: nextPracticas };
    setForm(next); saveStep(3,next).catch((e)=>setMessage(e.message));
  }
  function chooseExperience(field, value) { const next={...form, [field]:value}; setForm(next); saveStep(4,next).catch((e)=>setMessage(e.message)); }
  async function finish(event) {
    event.preventDefault();
    setMessage('');
    if (!form.nombre.trim()) { setMessage('Escribe tu nombre para terminar.'); return; }
    try {
      setSaving(true);
      await saveStep(1); await saveStep(2); await saveStep(3); await saveStep(4);
      window.location.assign('/home');
    } catch (error) { setMessage(error.message || 'No se pudo guardar tu perfil.'); }
    finally { setSaving(false); }
  }
  return <main className="onboarding-screen"><img className="onboarding-bg" src={background} alt="" aria-hidden="true"/><section className="onboarding-frame"><button type="button" className="onboarding-back" onClick={()=>window.history.back()} aria-label="Volver">‹</button><form className="onboarding-scroll" onSubmit={finish}>
    <section className="onboarding-section step-one"><Header title="Completa tu perfil" subtitle="Cuéntanos un poco sobre ti para personalizar tu experiencia."/><button type="button" className="photo-button" onClick={()=>fileRef.current?.click()}>{form.fotoPreview?<img src={form.fotoPreview} alt="Foto de perfil"/>:<><CameraIcon/><span>Subir foto<br/>de perfil</span></>}</button><input ref={fileRef} className="hidden-file" type="file" accept="image/*" onChange={(e)=>handlePhoto(e.target.files?.[0])}/><h2 className="section-title"><UserIcon/>Información básica</h2><div className="fields-grid"><Field icon={UserIcon} label="Nombre" placeholder="Escribe tu nombre" value={form.nombre} onChange={(v)=>update('nombre',v)} onBlur={()=>saveStep(1)}/><Field icon={CalendarIcon} label="Edad" placeholder="Ej: 28" value={form.edad} inputMode="numeric" onChange={(v)=>update('edad',v)} onBlur={()=>saveStep(1)}/><Field icon={RulerIcon} label="Altura" placeholder="Ej: 178 cm" value={form.altura} inputMode="decimal" onChange={(v)=>update('altura',v)} onBlur={()=>saveStep(1)}/><Field icon={WeightIcon} label="Peso" placeholder="Ej: 82 kg" value={form.peso} inputMode="decimal" onChange={(v)=>update('peso',v)} onBlur={()=>saveStep(1)}/><Field icon={PercentIcon} label="% Grasa corporal" placeholder="Ej: 15%" value={form.grasa} inputMode="decimal" onChange={(v)=>update('grasa',v)} onBlur={()=>saveStep(1)}/></div><div className="imc-box"><span>IMC</span><strong>{imc?imc.toFixed(1):'--'}</strong><em>{imcState(imc)}</em></div><p className="secure-note"><LockIcon/>Tu información está 100% segura y confidencial.</p></section>
    <section className="onboarding-section"><Header title={<><span>¿Cuál es tu</span><br/>objetivo principal?</>} subtitle="Esto nos ayudará a diseñar el plan perfecto para ti."/><div className="cards-grid">{objetivos.map((item)=><OptionCard key={item.value} item={item} selected={form.objetivo===item.value} onClick={()=>chooseObjetivo(item.value)}/>)}</div></section>
    <section className="onboarding-section"><Header title={<><span>¿Qué practicas</span><br/>actualmente?</>} subtitle="Selecciona la actividad que más practicas para personalizar tu plan."/><div className="cards-grid">{practicas.map((item)=><OptionCard key={item.value} item={item} selected={form.practicas.includes(item.value)} onClick={()=>togglePractica(item.value)}/>)}</div>{form.practicas.includes('otro')?<label className="other-input"><span>Especifica cuál</span><input value={form.practicaOtro} placeholder="Ej: ciclismo, natación..." onChange={(e)=>update('practicaOtro',e.target.value)} onBlur={()=>saveStep(3)}/></label>:null}</section>
    <section className="onboarding-section step-four"><Header title={<><span>Cuéntanos más</span><br/>sobre tu experiencia</>} subtitle="Esto nos ayudará a crear el mejor plan personalizado para ti."/><h2 className="section-title"><ChartIcon/>Nivel de experiencia</h2><div className="cards-grid three">{niveles.map((item)=><OptionCard key={item.value} item={item} selected={form.experiencia===item.value} onClick={()=>chooseExperience('experiencia',item.value)}/>)}</div><h2 className="section-title compact"><CalendarIcon/>Días que entrenas por semana</h2><div className="days-row">{dias.map((d)=><button type="button" key={d} className={form.diasSemana===d?'selected':''} onClick={()=>chooseExperience('diasSemana',d)}>{d}</button>)}</div><h2 className="section-title compact"><ClockIcon/>Tiempo por sesión</h2><div className="cards-grid time-grid">{tiempos.map((item)=><button key={item.value} type="button" className={`time-card ${form.tiempoSesion===item.value?'selected':''}`} onClick={()=>chooseExperience('tiempoSesion',item.value)}><ClockIcon/><span>{item.title}</span></button>)}</div><label className="textarea-field"><span><HeartIcon/>Lesiones / molestias <small>(opcional)</small></span><textarea value={form.lesiones} placeholder="Ej: Lesión de hombro, dolor de rodilla..." onChange={(e)=>update('lesiones',e.target.value)} onBlur={()=>saveStep(4)}/></label><label className="textarea-field"><span><ChartIcon/>Observaciones <small>(opcional)</small></span><textarea value={form.observaciones} placeholder="Cuéntanos algo más que consideres importante..." onChange={(e)=>update('observaciones',e.target.value)} onBlur={()=>saveStep(4)}/></label><button className="final-button" type="submit" disabled={saving}>{saving?'GUARDANDO...':<>EMPEZAR <span>→</span></>}</button>{message?<p className="onboarding-message" role="status">{message}</p>:null}<p className="secure-note"><LockIcon/>Tu información está 100% segura y confidencial.</p></section>
  </form></section></main>;
}
