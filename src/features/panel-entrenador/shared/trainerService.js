const TRAINER_USER_KEY = 'gym22.trainerUser';
const TRAINER_PASS_KEY = 'gym22.trainerPass';

export function setTrainerSession(username,password){
  localStorage.setItem(TRAINER_USER_KEY, username);
  localStorage.setItem(TRAINER_PASS_KEY, password);
}

export function getTrainerSession(){
  return {
    username: localStorage.getItem(TRAINER_USER_KEY) || '',
    password: localStorage.getItem(TRAINER_PASS_KEY) || '',
  };
}

async function postJson(url, body){
  const res = await fetch(url, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify(body),
  });
  let data={};
  try{ data = await res.json(); }catch{}
  if(!res.ok) throw new Error(data.message || 'Error de conexión');
  return data;
}

function trainerBody(extra={}){
  const session = getTrainerSession();
  return {...session, ...extra};
}

export const trainerService = {
  getHome(){
    return postJson('/api/trainer/home', trainerBody());
  },
  getClientDetail(folderName){
    return postJson('/api/trainer/client-detail', trainerBody({folderName}));
  },

  async downloadProfile(folderName){
    const result = await postJson('/api/trainer/download-profile', trainerBody({folderName}));
    const blob = new Blob([JSON.stringify(result.content, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.fileName || 'perfil-inicial.json';
    a.click();
    URL.revokeObjectURL(url);
    return result;
  },

  uploadJson(folderName, fileName, content){
    return postJson('/api/trainer/upload-json', trainerBody({folderName, fileName, content}));
  },
  async downloadJson(folderName){
    const result = await postJson('/api/trainer/download-json', trainerBody({folderName}));
    const blob = new Blob([JSON.stringify(result.content, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.fileName || 'entrenamiento.json';
    a.click();
    URL.revokeObjectURL(url);
    return result;
  },
  uploadStrongPhoto(folderName, photoDataUrl){
    return postJson('/api/trainer/upload-strong-photo', trainerBody({folderName, photoDataUrl}));
  }
};
