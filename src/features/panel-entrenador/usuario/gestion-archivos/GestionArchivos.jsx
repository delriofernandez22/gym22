import './GestionArchivos.css';

export default function GestionArchivos({ onUploadJson, onDownloadJson, onDownloadProfile }){
  return (
    <section className="trainer-files-card">
      <p>GESTIÓN DE ARCHIVOS</p>
      <h2>Datos del cliente</h2>

      <div className="file-actions">
        <label>
          SUBIR JSON
          <input type="file" accept=".json,application/json,text/json" onChange={onUploadJson} />
        </label>
        <button type="button" onClick={onDownloadJson}>DESCARGAR JSON</button>
        <button type="button" onClick={onDownloadProfile}>DESCARGAR PERFIL</button>
      </div>

      <span className="files-note">El perfil descarga los datos iniciales que rellenó el usuario al registrarse.</span>
    </section>
  );
}
