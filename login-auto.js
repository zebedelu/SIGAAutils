/* =========================================================
   Login automático — atua apenas na tela de login
   (sigaa/verTelaLogin.do). Insere um botão
   "Salvar credenciais para login automático" ao lado do
   "Entrar" e, se o checkbox "Login Automático" do painel
   (settings-ui.js) estiver ligado com credenciais salvas,
   preenche e submete o formulário. Estado em
   sigaa_utils_login_* (localStorage).
   ========================================================= */
(function () {
  'use strict';

  const LS_USER = 'sigaa_utils_login_user';
  const LS_SENHA = 'sigaa_utils_login_senha';
  const ROTULO = 'Salvar credenciais para login automático';

  function isLoginPage() {
    return /verTelaLogin/.test(location.pathname);
  }

  function inputs() {
    const user = document.querySelector('input[name="user.login"]');
    const senha = document.querySelector('input[name="user.senha"]');
    return user && senha ? { user, senha } : null;
  }

  // ponytail: heurística — senha errada/expirada recarrega essa mesma tela;
  // se já há mensagem de erro, só preenche, não submete (evita loop).
  function temErroLogin() {
    return /(inv[aá]lid|incorret|erro|falhou|n[aã]o (foi )?poss[ií]vel)/i.test(
      document.body ? document.body.textContent : '');
  }

  function salvar(el) {
    localStorage.setItem(LS_USER, el.user.value.trim());
    localStorage.setItem(LS_SENHA, el.senha.value);
  }

  function criarBotaoSalvar(td) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'login-auto-btn';
    b.textContent = ROTULO;
    b.addEventListener('click', () => {
      const el = inputs();
      if (!el) return;
      salvar(el);
      b.textContent = 'Salvo ✓';
      setTimeout(() => { b.textContent = ROTULO; }, 2000);
    });
    td.appendChild(document.createTextNode(' '));
    td.appendChild(b);
  }

  function autoLogin() {
    const S = window.SIGAAUtils;
    if (!S || typeof S.getLoginAuto !== 'function' || !S.getLoginAuto()) return;
    const el = inputs();
    if (!el) return;
    const user = localStorage.getItem(LS_USER) || '';
    const senha = localStorage.getItem(LS_SENHA) || '';
    if (!user && !senha) return;
    el.user.value = user;
    el.senha.value = senha;
    if (user && senha && !temErroLogin()) {
      const submit = el.user.form && el.user.form.querySelector('input[type="submit"], button[type="submit"]');
      if (submit) submit.click();
    }
  }

  function main() {
    if (!isLoginPage()) return;
    const el = inputs();
    if (!el) return;
    const submit = el.user.form && el.user.form.querySelector('input[type="submit"], button[type="submit"]');
    // Ao lado do "Entrar" (mesmo <td>)
    if (submit && submit.parentNode) criarBotaoSalvar(submit.parentNode);
    autoLogin();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', main);
  else main();
})();