import './PerfilUsuario.css';

export default function PerfilUsuario({ client, onPhotoChange }){
  const nombre = `${client?.nombre || 'Usuario'} ${client?.apellidos || ''}`.trim();
  const datos = client?.datosFisicos || {};
  const objetivo = client?.objetivo || {};

  return (
    <section className="trainer-profile-card">
      <div className="profile-photo">
        {client?.fotoUrl ? <img src={client.fotoUrl} alt="" /> : <span>{(nombre[0] || 'U').toUpperCase()}</span>}
      </div>

      <div className="profile-info">
        <p>PERFIL USUARIO</p>
        <h2>{nombre}</h2>
        <div className="profile-grid">
          <span><strong>{datos.peso || '--'}</strong>Peso</span>
          <span><strong>{objetivo.pesoObjetivo || objetivo.peso || '--'}</strong>Objetivo</span>
          <span><strong>{client?.experiencia?.nivel || '--'}</strong>Nivel</span>
        </div>
        <label className="profile-photo-button">
          CAMBIAR IMAGEN
          <input type="file" accept="image/*" onChange={onPhotoChange} />
        </label>
      </div>
    </section>
  );
}
