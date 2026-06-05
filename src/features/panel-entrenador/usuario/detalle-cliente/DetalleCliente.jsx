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
  const [trainingFiles,setTrainingFiles]=useState([]);
  const [loadingFiles,setLoadingFiles]=useState(false);
  const [selectedFile,setSelectedFile]=useState('');
  const [editorText,setEditorText]=useState('');
  const folderName = new URLSearchParams(window.location.search).get('folder') || '';

  async function load(){
    const res = await trainerService.getClientDetail(folderName);
    setClient(res.client);
  }

  async function loadTrainingFiles(){
    if(!folderName) return;
    setLoadingFiles(true);
    try{
      const res = await trainerService.listJsonFiles(folderName);
      setTrainingFiles(res.files || []);
    }catch(err){
      setMessage(err.message || 'No se pudieron cargar los archivos.');
    }finally{
      setLoadingFiles(false);
    }
  }

  useEffect(()=>{
    load().catch(err=>setError(err.message || 'No se pudo cargar el cliente.'));
    loadTrainingFiles();
  },[folderName]);

  async function uploadJson(e){
    const file = e.target.files?.[0];
    if(!file) return;
    try{
      const text = await file.text();
      await trainerService.uploadJson(folderName, file.name, text);
      setMessage('JSON subido correctamente.');
      await load();
      await loadTrainingFiles();
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


  async function viewJsonFile(fileName){
    try{
      const res = await trainerService.readJsonFile(folderName, fileName);
      setSelectedFile(res.fileName);
      setEditorText(JSON.stringify(res.content, null, 2));
      setMessage('');
    }catch(err){
      setMessage(err.message || 'No se pudo abrir el JSON.');
    }
  }

  async function saveJsonFile(){
    if(!selectedFile) return;
    try{
      JSON.parse(editorText);
      await trainerService.updateJsonFile(folderName, selectedFile, editorText);
      setMessage('JSON actualizado correctamente.');
      await load();
      await loadTrainingFiles();
    }catch(err){
      setMessage(err.message || 'JSON no válido.');
    }
  }

  async function deleteJsonFile(fileName){
    try{
      await trainerService.deleteJsonFile(folderName, fileName);
      if(selectedFile === fileName){
        setSelectedFile('');
        setEditorText('');
      }
      setMessage('JSON borrado.');
      await load();
      await loadTrainingFiles();
    }catch(err){
      setMessage(err.message || 'No se pudo borrar el JSON.');
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
            <GestionArchivos
              files={trainingFiles}
              loadingFiles={loadingFiles}
              selectedFile={selectedFile}
              editorText={editorText}
              onUploadJson={uploadJson}
              onDownloadJson={downloadJson}
              onDownloadProfile={downloadProfile}
              onRefreshFiles={loadTrainingFiles}
              onViewFile={viewJsonFile}
              onEditText={setEditorText}
              onSaveFile={saveJsonFile}
              onDeleteFile={deleteJsonFile}
              onCloseEditor={()=>{setSelectedFile(''); setEditorText('');}}
            />
          </>
        ) : <p className="trainer-loading">Cargando cliente...</p>}
      </section>
    </main>
  );
}
