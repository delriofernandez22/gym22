
import { useState } from 'react';
import './GestionArchivos.css';

function formatSize(bytes=0){
  if(bytes < 1024) return `${bytes} B`;
  if(bytes < 1024*1024) return `${Math.round(bytes/1024)} KB`;
  return `${(bytes/(1024*1024)).toFixed(1)} MB`;
}

function formatDate(value){
  if(!value) return '';
  try{
    return new Date(value).toLocaleString('es-ES', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
  }catch{
    return value;
  }
}

export default function GestionArchivos({
  files=[],
  loadingFiles=false,
  selectedFile,
  editorText='',
  onUploadJson,
  onDownloadJson,
  onDownloadProfile,
  onRefreshFiles,
  onViewFile,
  onEditText,
  onSaveFile,
  onDeleteFile,
  onCloseEditor,
}){
  const [confirmDelete,setConfirmDelete] = useState(null);

  return (
    <section className="trainer-files-card">
      <p>GESTIÓN DE ARCHIVOS</p>
      <h2>Entrenamientos</h2>

      <div className="file-actions">
        <label>
          SUBIR JSON
          <input type="file" accept=".json,application/json,text/json" onChange={onUploadJson} />
        </label>
        <button type="button" onClick={onDownloadJson}>DESCARGAR ÚLTIMO</button>
        <button type="button" onClick={onDownloadProfile}>DESCARGAR PERFIL</button>
      </div>

      <div className="files-head">
        <span>ARCHIVOS GUARDADOS</span>
        <button type="button" onClick={onRefreshFiles}>{loadingFiles ? 'Cargando...' : 'Actualizar'}</button>
      </div>

      <div className="training-files-list">
        {files.length ? files.map((file)=>(
          <article className="training-file-item" key={file.fileName}>
            <div>
              <strong>{file.fileName}</strong>
              <span>{formatDate(file.updatedAt)} · {formatSize(file.size)} · {file.resumen?.totalEntrenos ?? 0} entrenos</span>
            </div>
            <div className="training-file-actions">
              <button type="button" onClick={()=>onViewFile(file.fileName)}>Ver / editar</button>
              <button type="button" onClick={()=>setConfirmDelete(file.fileName)}>Borrar</button>
            </div>
          </article>
        )) : (
          <div className="files-empty">{loadingFiles ? 'Cargando entrenamientos...' : 'Todavía no hay JSON guardados.'}</div>
        )}
      </div>

      {selectedFile ? (
        <div className="json-editor-panel">
          <div className="json-editor-head">
            <div>
              <span>EDITANDO</span>
              <strong>{selectedFile}</strong>
            </div>
            <button type="button" onClick={onCloseEditor}>Cerrar</button>
          </div>
          <textarea value={editorText} onChange={(e)=>onEditText(e.target.value)} spellCheck="false" />
          <div className="json-editor-actions">
            <button type="button" onClick={onSaveFile}>GUARDAR CAMBIOS</button>
            <button type="button" onClick={()=>onViewFile(selectedFile)}>RECARGAR</button>
          </div>
        </div>
      ) : null}

      {confirmDelete ? (
        <div className="delete-confirm" role="dialog" aria-modal="true">
          <div>
            <h3>Borrar JSON</h3>
            <p>¿Seguro que quieres borrar <strong>{confirmDelete}</strong>?</p>
            <div>
              <button type="button" onClick={()=>setConfirmDelete(null)}>Cancelar</button>
              <button type="button" onClick={()=>{ onDeleteFile(confirmDelete); setConfirmDelete(null); }}>Borrar</button>
            </div>
          </div>
        </div>
      ) : null}

      <span className="files-note">Estos archivos se leen desde Supabase y alimentan calendario, entrenamientos y resumen.</span>
    </section>
  );
}
