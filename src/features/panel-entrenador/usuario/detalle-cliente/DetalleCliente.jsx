import { useEffect, useState } from 'react';
import { trainerService } from '../../shared/trainerService.js';
import PerfilUsuario from '../perfil-usuario/PerfilUsuario.jsx';
import CalendarioUsuario from '../calendario-usuario/CalendarioUsuario.jsx';
import GestionArchivos from '../gestion-archivos/GestionArchivos.jsx';
import './DetalleCliente.css';

function fileToDataUrl(file){
  return new Promise((resolve,reject)=>{
    const reader = new FileReader();
    reader.onload = ()=>resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function DetalleCliente(){
  const [client,setClient]=useState(null);
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
  const folderName = new URLSearchParams(window.location.search).get('folder') || '';

  async function load(){
    const res = await trainerService.getClientDetail(folderName);
    setClient(res.client);
  }

  useEffect(()=>{
    load().catch(err=>setError(err.message || 'No se pudo cargar el cliente.'));
  },[folderName]);

  async function uploadJson(e){
    const file = e.target.files?.[0];
    if(!file) return;
    try{
      const text = await file.text();
      await trainerService.uploadJson(folderName, file.name, text);
      setMessage('JSON subido correctamente.');
      await load();
    }catch(err){
      setMessage(err.message || 'No se pudo subir el JSON.');
    }
  }

  async function downloadJson(){
    try{
      await trainerService.downloadJson(folderName);
      setMessage('JSON descargado.');
    }catch(err){
      setMessage(err.message || 'No se pudo descargar el JSON.');
    }
  }

  async function downloadProfile(){
    try{
      await trainerService.downloadProfile(folderName);
      setMessage('Perfil inicial descargado.');
    }catch(err){
      setMessage(err.message || 'No se pudo descargar el perfil.');
    }
  }

  async function uploadPhoto(e){
    const file = e.target.files?.[0];
    if(!file) return;
    try{
      const dataUrl = await fileToDataUrl(file);
      await trainerService.uploadStrongPhoto(folderName, dataUrl);
      setMessage('Imagen actualizada.');
      await load();
    }catch(err){
      setMessage(err.message || 'No se pudo subir la imagen.');
    }
  }

  if(error) return <main className="trainer-detail-page"><p className="trainer-error">{error}</p></main>;

  return (
    <main className="trainer-detail-page">
      <section className="trainer-detail-shell">
        <header className="trainer-detail-header">
          <button onClick={()=>window.location.assign('/panel-entrenador')} type="button">‹</button>
          <div>
            <p>CLIENTE</p>
            <h1>{client ? `${client.nombre || 'Usuario'} ${client.apellidos || ''}`.trim() : 'Cargando...'}</h1>
          </div>
        </header>

        {message ? <p className="trainer-message">{message}</p> : null}

        {client ? (
          <>
            <PerfilUsuario client={client} onPhotoChange={uploadPhoto} />
            <CalendarioUsuario calendario={client.calendarioEntrenamientos} />
            <GestionArchivos onUploadJson={uploadJson} onDownloadJson={downloadJson} onDownloadProfile={downloadProfile} />
          </>
        ) : <p className="trainer-loading">Cargando cliente...</p>}
      </section>
    </main>
  );
}
