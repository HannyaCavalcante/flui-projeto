/* ─── Colaborador Login ─── */
const collaboratorLogin    = document.querySelector('#collaboratorLogin');
const collaboratorFeedback = document.querySelector('#collaboratorFeedback');
const themeToggle          = document.querySelector('#themeToggle');

const API = (typeof window.FLUI_API !== 'undefined')
  ? window.FLUI_API
  : (location.hostname === 'localhost' || location.hostname === '127.0.0.1'
      ? 'http://localhost:3001/api'
      : 'https://flui-backend.up.railway.app/api');

if (collaboratorLogin) {
  collaboratorLogin.addEventListener('submit', async (event) => {
    event.preventDefault();

    const email    = document.querySelector('#collabEmail')?.value.trim()  || '';
    const password = document.querySelector('#collabPassword')?.value       || '';
    const btn      = collaboratorLogin.querySelector('button[type=submit]');

    collaboratorFeedback.textContent = '';
    btn.textContent = 'Entrando…';
    btn.disabled    = true;

    try {
      const res  = await fetch(`${API}/auth/login`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Credenciais inválidas');
      if (data.user.role !== 'admin') throw new Error('Esta conta não tem acesso de colaborador.');

      sessionStorage.setItem('fluiAdminToken', data.token);
      sessionStorage.setItem('fluiAdminUser',  JSON.stringify(data.user));

      collaboratorFeedback.style.color = '#4ade80';
      collaboratorFeedback.innerHTML   =
        'Login realizado com sucesso! Redirecionando para o painel…';

      setTimeout(() => { window.location.href = './admin.html'; }, 1200);
    } catch (err) {
      collaboratorFeedback.style.color = '#f87171';
      collaboratorFeedback.textContent = err.message;
      btn.textContent = 'Entrar';
      btn.disabled    = false;
    }
  });
}

/* ─── Tema claro/escuro ─── */
if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('light-theme');
    themeToggle.textContent = document.body.classList.contains('light-theme')
      ? 'Tema escuro'
      : 'Tema claro';
  });
}
