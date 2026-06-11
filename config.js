/* Configuração da API — troque pela URL do deploy em produção */
window.FLUI_API = (
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1'
)
  ? 'http://localhost:3001/api'
  : 'https://flui-backend.up.railway.app/api';  // ← URL do deploy
