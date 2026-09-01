const SUPABASE_URL = "https://sybomoikpbswfpplheve.supabase.co";
const SUPABASE_KEY = "sb_publishable_a20Xy8dj13ahVvPN_TcnNg_DrJaGVrp";
const STORAGE_BUCKET = "produtos";
const LOGIN_ATTEMPTS_KEY = "afago_login_attempts";
const MUST_CHANGE_PASSWORD_KEY = "afago_must_change_password";
const MAX_LOGIN_ATTEMPTS = 5;

const supabaseClient = window.supabase?.createClient
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

const dinheiro = valor => `R$ ${Number(valor || 0).toFixed(2).replace('.', ',')}`;
const esc = valor => String(valor ?? '').replace(/[&<>\'\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[c]));

let produtoImagemAtual = '';
let produtoImagemNova = '';
let crudFormBlocks = {};
let confirmResolver = null;

function normalizarEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function lerTentativasLogin() {
  try {
    return JSON.parse(localStorage.getItem(LOGIN_ATTEMPTS_KEY) || '{}');
  } catch {
    return {};
  }
}

function salvarTentativasLogin(data) {
  localStorage.setItem(LOGIN_ATTEMPTS_KEY, JSON.stringify(data));
}

function registrarFalhaLogin(email) {
  const data = lerTentativasLogin();
  const chave = normalizarEmail(email);
  const atual = data[chave] || { count: 0 };
  atual.count += 1;
  atual.at = Date.now();
  data[chave] = atual;
  salvarTentativasLogin(data);
  return atual;
}

function limparTentativasLogin(email) {
  const data = lerTentativasLogin();
  delete data[normalizarEmail(email)];
  salvarTentativasLogin(data);
}

function marcarTrocaSenha(ativo) {
  if (ativo) localStorage.setItem(MUST_CHANGE_PASSWORD_KEY, '1');
  else localStorage.removeItem(MUST_CHANGE_PASSWORD_KEY);
}

function precisaTrocarSenha() {
  return localStorage.getItem(MUST_CHANGE_PASSWORD_KEY) === '1';
}

function mostrarAvisoLogin(texto, tipo = '') {
  const el = document.getElementById('login-aviso');
  if (!el) return avisar(texto, tipo === 'erro' ? 'error' : tipo === 'ok' ? 'success' : 'info');
  el.hidden = false;
  el.className = `login-aviso${tipo ? ` ${tipo}` : ''}`;
  el.innerHTML = texto;
}

function esconderAvisoLogin() {
  const el = document.getElementById('login-aviso');
  if (!el) return;
  el.hidden = true;
  el.textContent = '';
}

function textoPassoAPasso(email) {
  return `
    Enviamos o passo a passo para <strong>${esc(email)}</strong>.
    <ol class="login-steps">
      <li>Abra a caixa de entrada (e o spam) do e-mail cadastrado.</li>
      <li>Use o link de acesso provisório enviado pela Afago.</li>
      <li>Entre no painel com esse acesso temporário.</li>
      <li>Em Configurações, troque a senha imediatamente.</li>
    </ol>`;
}

function urlRedirecionamentoAdmin() {
  return `${location.origin}${location.pathname}`;
}

async function enviarRecuperacaoSenha(email) {
  const destino = normalizarEmail(email);
  if (!destino) throw new Error('Informe o e-mail cadastrado.');
  const { error } = await supabaseClient.auth.resetPasswordForEmail(destino, {
    redirectTo: urlRedirecionamentoAdmin()
  });
  if (error) throw error;
  marcarTrocaSenha(true);
  limparTentativasLogin(destino);
  return destino;
}

function alternarFormLogin(modo) {
  const login = document.getElementById('form-login');
  const recuperar = document.getElementById('form-recuperar');
  login?.classList.toggle('ativa', modo === 'login');
  if (recuperar) recuperar.style.display = modo === 'recuperar' ? 'block' : 'none';
  if (login) login.style.display = modo === 'login' ? 'block' : 'none';
}

function irParaAba(aba) {
  const btn = document.querySelector(`.aba-btn[data-aba="${aba}"]`);
  btn?.click();
}

function atualizarBannerSenha() {
  const banner = document.getElementById('aviso-senha');
  if (!banner) return;
  banner.classList.toggle('show', precisaTrocarSenha());
}

function preencherConfiguracoes() {
  supabaseClient.auth.getUser().then(({ data }) => {
    const atual = data?.user?.email || '';
    const el = document.getElementById('config-email-atual');
    if (el) el.textContent = atual || 'Não foi possível carregar o e-mail.';
    const input = document.getElementById('config-email');
    if (input && atual) input.placeholder = atual;
  }).catch(() => {});
}



function inicializarModais() {
  crudFormBlocks = {
    massagem: document.querySelector('#aba-massagens .form-bloco'),
    pacote: document.querySelector('#aba-pacotes .form-bloco'),
    produto: document.querySelector('#aba-produtos .form-bloco')
  };

  document.querySelectorAll('[data-open-form]').forEach(button => {
    button.addEventListener('click', () => abrirModalCrud(button.dataset.openForm, false));
  });

  document.querySelectorAll('[data-close-modal]').forEach(button => {
    button.addEventListener('click', fecharModalCrud);
  });
  document.querySelectorAll('[data-close-confirm]').forEach(button => {
    button.addEventListener('click', () => resolverConfirmacao(false));
  });
  document.getElementById('crudModal')?.addEventListener('click', e => {
    if (e.target.id === 'crudModal') fecharModalCrud();
  });
  document.getElementById('confirmModal')?.addEventListener('click', e => {
    if (e.target.id === 'confirmModal') resolverConfirmacao(false);
  });
  document.getElementById('confirmDeleteBtn')?.addEventListener('click', () => resolverConfirmacao(true));

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      const confirm = document.getElementById('confirmModal');
      if (confirm?.classList.contains('open')) resolverConfirmacao(false);
      else if (document.getElementById('crudModal')?.classList.contains('open')) fecharModalCrud();
    }
  });
}

function abaDoTipo(tipo) {
  if (tipo === 'produto') return 'aba-produtos';
  if (tipo === 'pacote') return 'aba-pacotes';
  if (tipo === 'massagem') return 'aba-massagens';
  return '';
}

function devolverFormularioModal() {
  const modal = document.getElementById('crudModal');
  const body = document.getElementById('modalBody');
  const block = body?.firstElementChild;
  if (!modal || !block) return;
  const aba = document.getElementById(abaDoTipo(modal.dataset.tipo));
  if (!aba) return;
  const ancora = aba.querySelector('.lista-head');
  if (ancora) aba.insertBefore(block, ancora);
  else aba.appendChild(block);
}

function abrirModalCrud(tipo, edicao = false) {
  const modal = document.getElementById('crudModal');
  const body = document.getElementById('modalBody');
  const block = crudFormBlocks[tipo];
  if (!modal || !body || !block) return;

  if (!edicao) {
    if (tipo === 'massagem') resetFormGenerico('massagem');
    if (tipo === 'pacote') resetFormGenerico('pacote');
    if (tipo === 'produto') resetProdutoForm();
  }
  devolverFormularioModal();
  body.appendChild(block);
  const titulos = {
    massagem: edicao ? 'Editar massagem' : 'Nova massagem',
    pacote: edicao ? 'Editar pacote' : 'Novo pacote',
    produto: edicao ? 'Editar produto' : 'Novo produto'
  };
  const subtitulos = {
    massagem: 'Atualize os dados do serviço e mantenha seu catálogo sempre atual.',
    pacote: 'Monte uma oferta bonita, clara e pronta para aparecer no site.',
    produto: 'Cadastre nome, preço, categoria e escolha uma foto da galeria.'
  };
  document.getElementById('modalTitle').textContent = titulos[tipo] || 'Editar item';
  document.getElementById('modalSubtitle').textContent = subtitulos[tipo] || 'Atualize os dados e salve as alterações.';
  const submit = block.querySelector('button[type=submit]');
  if (submit) submit.textContent = edicao ? `Salvar alterações` : `Criar ${tipo === 'massagem' ? 'massagem' : tipo === 'pacote' ? 'pacote' : 'produto'}`;
  modal.dataset.tipo = tipo;
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
  requestAnimationFrame(() => {
    const first = block.querySelector('input:not([type=hidden]), select, textarea');
    first?.focus({preventScroll:true});
  });
}

function fecharModalCrud() {
  const modal = document.getElementById('crudModal');
  if (!modal) return;
  devolverFormularioModal();
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
}

function pedirConfirmacao(nome) {
  return new Promise(resolve => {
    confirmResolver = resolve;
    document.getElementById('confirmTitle').textContent = `Excluir “${nome}”?`;
    document.getElementById('confirmText').textContent = 'O item será removido do catálogo e essa ação não poderá ser desfeita.';
    const modal = document.getElementById('confirmModal');
    modal?.classList.add('open');
    modal?.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
  });
}

function resolverConfirmacao(valor) {
  const modal = document.getElementById('confirmModal');
  modal?.classList.remove('open');
  modal?.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
  const resolve = confirmResolver;
  confirmResolver = null;
  resolve?.(valor);
}

function avisar(texto, tipo = 'info') {
  const el = document.getElementById('adminToast');
  if (!el) return alert(texto);
  el.textContent = texto;
  el.dataset.tipo = tipo;
  el.classList.add('show');
  clearTimeout(avisar.timer);
  avisar.timer = setTimeout(() => el.classList.remove('show'), 3500);
}

function erroSupabase(erro, contexto) {
  if (erro) {
    console.error(`Supabase — ${contexto}:`, erro);
    return true;
  }
  return false;
}

function resetProdutoForm() {
  const form = document.getElementById('form-produto');
  if (!form) return;
  form.reset();
  document.getElementById('pr-id').value = '';
  document.getElementById('pr-bg').value = 'bg-clay';
  document.getElementById('pr-icon').value = 'icon-flower';
  const oculto = document.getElementById('pr-oculto');
  if (oculto) oculto.checked = false;
  produtoImagemAtual = '';
  produtoImagemNova = '';
  atualizarPreviewProduto('');
  document.getElementById('produtoFormTitulo').textContent = 'Adicionar produto';
  document.getElementById('btn-cancelar-produto').style.display = 'none';
}

function preencherProduto(p) {
  document.getElementById('pr-id').value = p.id ?? '';
  document.getElementById('pr-cat').value = p.cat ?? '';
  document.getElementById('pr-title').value = p.title ?? '';
  document.getElementById('pr-desc').value = p.descricao ?? '';
  document.getElementById('pr-price').value = p.price ?? '';
  document.getElementById('pr-bg').value = p.bg ?? 'bg-clay';
  document.getElementById('pr-icon').value = p.icon ?? 'icon-flower';
  const oculto = document.getElementById('pr-oculto');
  if (oculto) oculto.checked = produtoEstaOculto(p);
  produtoImagemAtual = p.imagem || p.image_url || '';
  produtoImagemNova = '';
  atualizarPreviewProduto(produtoImagemAtual);
  document.getElementById('produtoFormTitulo').textContent = 'Editar produto';
  document.getElementById('btn-cancelar-produto').style.display = 'inline-flex';
}

function atualizarPreviewProduto(url) {
  const preview = document.getElementById('produtoImagemPreview');
  const placeholder = document.getElementById('produtoImagemPlaceholder');
  if (!preview || !placeholder) return;
  if (url) {
    preview.src = url;
    preview.style.display = 'block';
    placeholder.style.display = 'none';
  } else {
    preview.removeAttribute('src');
    preview.style.display = 'none';
    placeholder.style.display = 'flex';
  }
}

async function uploadProdutoImagem(file) {
  if (!file) return '';
  if (!file.type.startsWith('image/')) throw new Error('Selecione uma imagem válida.');
  if (file.size > 5 * 1024 * 1024) throw new Error('A imagem deve ter no máximo 5 MB.');

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
  const path = `produtos/${crypto.randomUUID()}.${ext || 'jpg'}`;
  const { error } = await supabaseClient.storage.from(STORAGE_BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type
  });
  if (error) {
    console.error('Upload da imagem:', error);
    throw new Error('Não foi possível enviar a foto. Verifique se o bucket "produtos" existe e está configurado como público no Supabase.');
  }
  const { data } = supabaseClient.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return data?.publicUrl || '';
}

async function salvarProdutoImagemSeNecessario() {
  const file = document.getElementById('pr-imagem')?.files?.[0];
  if (!file) return produtoImagemAtual;
  return uploadProdutoImagem(file);
}

document.addEventListener('DOMContentLoaded', async () => {
  if (!supabaseClient) {
    avisar('Não foi possível carregar o Supabase. Verifique sua conexão e recarregue a página.', 'error');
    return;
  }
  configurarFormularioLogin();
  configurarNavegacao();
  configurarFormulariosCRUD();
  configurarUploadProduto();
  configurarConta();
  inicializarModais();
  observarSessao();
  await verificarLogin();
});

async function verificarLogin() {
  const { data, error } = await supabaseClient.auth.getSession();
  if (erroSupabase(error, 'verificar sessão')) return;
  if (data?.session) mostrarPainel();
}

function observarSessao() {
  supabaseClient.auth.onAuthStateChange((event) => {
    if (event === 'PASSWORD_RECOVERY') {
      marcarTrocaSenha(true);
      mostrarPainel();
      irParaAba('configuracoes');
      avisar('Acesso provisório confirmado. Troque sua senha em Configurações.', 'success');
    }
  });
}

function configurarFormularioLogin() {
  const form = document.getElementById('form-login');
  const formRecuperar = document.getElementById('form-recuperar');

  form?.addEventListener('submit', async e => {
    e.preventDefault();
    esconderAvisoLogin();
    const button = form.querySelector('button[type=submit]');
    const email = document.getElementById('email').value.trim();
    const senha = document.getElementById('senha').value;
    if (button) { button.disabled = true; button.textContent = 'Entrando...'; }
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password: senha });
    if (error) {
      console.error('Erro de login:', error);
      const tentativas = registrarFalhaLogin(email);
      const restantes = Math.max(0, MAX_LOGIN_ATTEMPTS - tentativas.count);
      if (tentativas.count >= MAX_LOGIN_ATTEMPTS) {
        try {
          await enviarRecuperacaoSenha(email);
          mostrarAvisoLogin(`Por segurança, após ${MAX_LOGIN_ATTEMPTS} tentativas enviamos um acesso provisório ao e-mail cadastrado.${textoPassoAPasso(email)}`, 'ok');
        } catch (envioError) {
          console.error('Recuperação automática:', envioError);
          mostrarAvisoLogin('Limite de tentativas atingido. Use “Esqueci minha senha” para receber o passo a passo no e-mail.', 'erro');
        }
      } else {
        const msg = error.message?.includes('Invalid login') ? 'E-mail ou senha incorretos.' : `Não foi possível entrar: ${error.message}`;
        mostrarAvisoLogin(`${msg} Restam ${restantes} tentativa${restantes === 1 ? '' : 's'} antes do envio da senha provisória.`, 'erro');
        avisar(msg, 'error');
      }
      if (button) { button.disabled = false; button.textContent = 'Entrar no painel'; }
      return;
    }
    limparTentativasLogin(email);
    if (button) { button.disabled = false; button.textContent = 'Entrar no painel'; }
    mostrarPainel();
  });

  document.getElementById('btn-esqueci-senha')?.addEventListener('click', () => {
    esconderAvisoLogin();
    const email = document.getElementById('email')?.value.trim();
    const campo = document.getElementById('email-recuperar');
    if (campo && email) campo.value = email;
    alternarFormLogin('recuperar');
  });

  document.getElementById('btn-voltar-login')?.addEventListener('click', () => {
    esconderAvisoLogin();
    alternarFormLogin('login');
  });

  formRecuperar?.addEventListener('submit', async e => {
    e.preventDefault();
    const button = formRecuperar.querySelector('button[type=submit]');
    const email = document.getElementById('email-recuperar').value.trim();
    if (button) { button.disabled = true; button.textContent = 'Enviando...'; }
    try {
      await enviarRecuperacaoSenha(email);
      mostrarAvisoLogin(`Pronto. ${textoPassoAPasso(email)}`, 'ok');
      avisar('Instruções enviadas para o e-mail cadastrado.', 'success');
    } catch (error) {
      console.error('Esqueci a senha:', error);
      mostrarAvisoLogin(error.message || 'Não foi possível enviar o e-mail de recuperação.', 'erro');
    } finally {
      if (button) { button.disabled = false; button.textContent = 'Enviar senha provisória'; }
    }
  });

  document.getElementById('btn-sair')?.addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
    document.getElementById('tela-login').style.display = 'flex';
    document.getElementById('painel').style.display = 'none';
    esconderAvisoLogin();
    alternarFormLogin('login');
  });

  document.getElementById('btn-ir-configuracoes')?.addEventListener('click', () => irParaAba('configuracoes'));
}

function mostrarPainel() {
  document.getElementById('tela-login').style.display = 'none';
  document.getElementById('painel').style.display = 'flex';
  atualizarBannerSenha();
  preencherConfiguracoes();
  carregarDashboard();
  if (precisaTrocarSenha()) irParaAba('configuracoes');
}

function configurarNavegacao() {
  document.querySelectorAll('.aba-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.aba-btn').forEach(b => b.classList.remove('ativa'));
      btn.classList.add('ativa');
      const aba = btn.dataset.aba;
      document.querySelectorAll('.conteudo-aba').forEach(c => c.classList.remove('ativa'));
      document.getElementById(`aba-${aba}`)?.classList.add('ativa');
      if (aba === 'dashboard') carregarDashboard();
      if (aba === 'massagens') carregarMassagens();
      if (aba === 'pacotes') carregarPacotes();
      if (aba === 'produtos') carregarProdutos();
      if (aba === 'agendamentos') carregarAgendamentos();
      if (aba === 'contatos') carregarContatos();
      if (aba === 'configuracoes') preencherConfiguracoes();
    });
  });
}

function produtoEstaOculto(p) {
  return p?.oculto === true || p?.hidden === true || p?.visivel === false;
}

function configurarConta() {
  document.getElementById('form-email')?.addEventListener('submit', async e => {
    e.preventDefault();
    const button = e.target.querySelector('button[type=submit]');
    const email = document.getElementById('config-email').value.trim();
    if (!email) return avisar('Informe o novo e-mail.', 'error');
    if (button) { button.disabled = true; button.textContent = 'Salvando...'; }
    const { error } = await supabaseClient.auth.updateUser({ email });
    if (button) { button.disabled = false; button.textContent = 'Atualizar e-mail'; }
    if (error) {
      console.error(error);
      return avisar(error.message || 'Não foi possível atualizar o e-mail.', 'error');
    }
    document.getElementById('config-email').value = '';
    preencherConfiguracoes();
    avisar('E-mail atualizado. Se o Supabase pedir confirmação, verifique a caixa de entrada.', 'success');
  });

  document.getElementById('form-senha')?.addEventListener('submit', async e => {
    e.preventDefault();
    const nova = document.getElementById('config-senha-nova').value;
    const confirma = document.getElementById('config-senha-confirma').value;
    if (nova.length < 6) return avisar('A senha precisa ter pelo menos 6 caracteres.', 'error');
    if (nova !== confirma) return avisar('A confirmação da senha não confere.', 'error');
    const button = e.target.querySelector('button[type=submit]');
    if (button) { button.disabled = true; button.textContent = 'Salvando...'; }
    const { error } = await supabaseClient.auth.updateUser({ password: nova });
    if (button) { button.disabled = false; button.textContent = 'Salvar nova senha'; }
    if (error) {
      console.error(error);
      return avisar(error.message || 'Não foi possível atualizar a senha.', 'error');
    }
    document.getElementById('form-senha').reset();
    marcarTrocaSenha(false);
    atualizarBannerSenha();
    avisar('Senha atualizada com sucesso.', 'success');
  });
}

async function carregarDashboard() {
  const [ag, cont, mass, prod] = await Promise.all([
    supabaseClient.from('agendamentos').select('*', { count: 'exact', head: true }),
    supabaseClient.from('contatos').select('*', { count: 'exact', head: true }),
    supabaseClient.from('massagens').select('*', { count: 'exact', head: true }),
    supabaseClient.from('produtos').select('*', { count: 'exact', head: true })
  ]);
  document.getElementById('qtd-agendamentos').textContent = ag.count ?? 0;
  document.getElementById('qtd-contatos').textContent = cont.count ?? 0;
  document.getElementById('qtd-massagens').textContent = mass.count ?? 0;
  document.getElementById('qtd-produtos').textContent = prod.count ?? 0;

  const { data, error } = await supabaseClient.from('agendamentos').select('*').order('created_at', { ascending: false }).limit(5);
  const lista = document.getElementById('ultimos-agendamentos');
  if (lista) lista.innerHTML = error ? '<div class="empty-state">Não foi possível carregar os agendamentos.</div>' : (data || []).map(a => `
    <div class="item-lista"><div><strong>${esc(a.nome)}</strong><span class="pill">${esc(a.status || 'pendente')}</span></div><small>${esc(a.servico)} · ${esc(a.data)} às ${esc(a.horario)}${a.whatsapp ? ` · ${esc(a.whatsapp)}` : ''}</small></div>`).join('') || '<div class="empty-state">Nenhum agendamento ainda.</div>';
}

async function carregarMassagens() {
  const { data, error } = await supabaseClient.from('massagens').select('*').order('id');
  const lista = document.getElementById('lista-massagens');
  if (!lista) return;
  if (error) { console.error(error); lista.innerHTML = '<div class="empty-state">Erro ao carregar massagens.</div>'; return; }
  const count = document.getElementById('count-massagens'); if (count) count.textContent = data?.length || 0;
  lista.innerHTML = (data || []).map(m => `<div class="item-lista"><div><strong>${esc(m.title)}</strong><span class="price-mini">${dinheiro(m.price)}</span></div><small>${esc(m.cat)} · ${esc(m.duration)} · ${esc(m.descricao)}</small><div class="acoes"><button class="btn-ghost editar" data-edit-massagem="${esc(m.id)}">Editar</button><button class="btn-ghost excluir" data-delete="massagens" data-id="${esc(m.id)}" data-name="${esc(m.title)}">Excluir</button></div></div>`).join('') || '<div class="empty-state">Nenhuma massagem cadastrada.</div>';
  lista.querySelectorAll('[data-edit-massagem]').forEach(b => b.addEventListener('click', () => editarMassagem(b.dataset.editMassagem)));
  lista.querySelectorAll('[data-delete]').forEach(b => b.addEventListener('click', () => excluirRegistro(b.dataset.delete, b.dataset.id, b.dataset.name)));
}

async function carregarPacotes() {
  const { data, error } = await supabaseClient.from('pacotes').select('*').order('id');
  const lista = document.getElementById('lista-pacotes');
  if (!lista) return;
  if (error) { console.error(error); lista.innerHTML = '<div class="empty-state">Erro ao carregar pacotes.</div>'; return; }
  const count = document.getElementById('count-pacotes'); if (count) count.textContent = data?.length || 0;
  lista.innerHTML = (data || []).map(p => `<div class="item-lista"><div><strong>${esc(p.title)}</strong><span class="price-mini">${dinheiro(p.por)}</span></div><small>${esc(p.sessoes)} · ${esc(p.duracao)}${p.featured ? ' · Destaque' : ''}</small><div class="acoes"><button class="btn-ghost editar" data-edit-pacote="${esc(p.id)}">Editar</button><button class="btn-ghost excluir" data-delete="pacotes" data-id="${esc(p.id)}" data-name="${esc(p.title)}">Excluir</button></div></div>`).join('') || '<div class="empty-state">Nenhum pacote cadastrado.</div>';
  lista.querySelectorAll('[data-edit-pacote]').forEach(b => b.addEventListener('click', () => editarPacote(b.dataset.editPacote)));
  lista.querySelectorAll('[data-delete]').forEach(b => b.addEventListener('click', () => excluirRegistro(b.dataset.delete, b.dataset.id, b.dataset.name)));
}

async function carregarProdutos() {
  const { data, error } = await supabaseClient.from('produtos').select('*').order('id');
  const lista = document.getElementById('lista-produtos');
  if (!lista) return;
  if (error) { console.error(error); lista.innerHTML = '<div class="empty-state">Erro ao carregar produtos. Verifique as permissões da tabela no Supabase.</div>'; return; }
  const count = document.getElementById('count-produtos'); if (count) count.textContent = data?.length || 0;
  lista.innerHTML = (data || []).map(p => {
    const img = p.imagem || p.image_url || '';
    const oculto = produtoEstaOculto(p);
    return `<div class="item-lista produto-admin-item${oculto ? ' is-oculto' : ''}"><div class="produto-admin-main">${img ? `<img src="${esc(img)}" alt="">` : '<div class="produto-thumb-placeholder">✦</div>'}<div><div><strong>${esc(p.title)}</strong>${oculto ? '<span class="pill oculto">Oculto</span>' : ''}<span class="price-mini">${dinheiro(p.price)}</span></div><small>${esc(p.cat)} · ${esc(p.descricao)}</small></div></div><div class="acoes"><button class="btn-ghost editar" data-edit-produto="${esc(p.id)}">Editar</button><button class="btn-ghost ocultar" data-toggle-produto="${esc(p.id)}" data-oculto="${oculto ? '1' : '0'}">${oculto ? 'Mostrar no site' : 'Ocultar do site'}</button><button class="btn-ghost excluir" data-delete="produtos" data-id="${esc(p.id)}" data-name="${esc(p.title)}">Excluir</button></div></div>`;
  }).join('') || '<div class="empty-state">Nenhum produto cadastrado.</div>';
  lista.querySelectorAll('[data-edit-produto]').forEach(b => b.addEventListener('click', async () => editarProduto(b.dataset.editProduto)));
  lista.querySelectorAll('[data-toggle-produto]').forEach(b => b.addEventListener('click', () => alternarVisibilidadeProduto(b.dataset.toggleProduto, b.dataset.oculto === '1')));
  lista.querySelectorAll('[data-delete]').forEach(b => b.addEventListener('click', () => excluirRegistro(b.dataset.delete, b.dataset.id, b.dataset.name)));
}

async function carregarAgendamentos() {
  const { data, error } = await supabaseClient.from('agendamentos').select('*').order('created_at', { ascending: false });
  const lista = document.getElementById('lista-agendamentos');
  if (!lista) return;
  if (error) { console.error(error); lista.innerHTML = '<div class="empty-state">Erro ao carregar agendamentos.</div>'; return; }
  lista.innerHTML = (data || []).map(a => `<div class="item-lista"><div><strong>${esc(a.nome)}</strong><span class="pill">${esc(a.status || 'pendente')}</span></div><small>${esc(a.servico)} · ${esc(a.data)} às ${esc(a.horario)}${a.whatsapp ? ` · ${esc(a.whatsapp)}` : ''}</small>${a.observacoes ? `<div class="obs">${esc(a.observacoes)}</div>` : ''}<div class="acoes"><select class="status-select" data-status-id="${esc(a.id)}"><option ${a.status === 'pendente' ? 'selected' : ''}>pendente</option><option ${a.status === 'confirmado' ? 'selected' : ''}>confirmado</option><option ${a.status === 'concluido' ? 'selected' : ''}>concluido</option><option ${a.status === 'cancelado' ? 'selected' : ''}>cancelado</option></select></div></div>`).join('') || '<div class="empty-state">Nenhum agendamento recebido.</div>';
  lista.querySelectorAll('[data-status-id]').forEach(select => select.addEventListener('change', async () => {
    const { error: updateError } = await supabaseClient.from('agendamentos').update({ status: select.value }).eq('id', select.dataset.statusId);
    if (updateError) { console.error(updateError); avisar('Não foi possível atualizar o status.', 'error'); }
    else avisar('Status atualizado.', 'success');
  }));
}

async function carregarContatos() {
  const { data, error } = await supabaseClient.from('contatos').select('*').order('created_at', { ascending: false });
  const lista = document.getElementById('lista-contatos');
  if (!lista) return;
  if (error) { console.error(error); lista.innerHTML = '<div class="empty-state">Erro ao carregar mensagens.</div>'; return; }
  lista.innerHTML = (data || []).map(c => `<div class="item-lista"><div><strong>${esc(c.nome)}</strong><span class="price-mini">${esc(c.whatsapp || '')}</span></div><small>${esc(c.mensagem)}</small></div>`).join('') || '<div class="empty-state">Nenhuma mensagem recebida.</div>';
}

function configurarFormulariosCRUD() {
  document.getElementById('form-massagem')?.addEventListener('submit', salvarMassagem);
  document.getElementById('form-pacote')?.addEventListener('submit', salvarPacote);
  document.getElementById('form-produto')?.addEventListener('submit', salvarProduto);
  document.getElementById('btn-cancelar-massagem')?.addEventListener('click', () => { resetFormGenerico('massagem'); fecharModalCrud(); });
  document.getElementById('btn-cancelar-pacote')?.addEventListener('click', () => { resetFormGenerico('pacote'); fecharModalCrud(); });
  document.getElementById('btn-cancelar-produto')?.addEventListener('click', () => { resetProdutoForm(); fecharModalCrud(); });
}

function resetFormGenerico(tipo) {
  const form = document.getElementById(`form-${tipo}`);
  if (!form) return;
  form.reset();
  const prefixo = tipo === 'massagem' ? 'm' : 'p';
  document.getElementById(`${prefixo}-id`).value = '';
  document.getElementById(`btn-cancelar-${tipo}`).style.display = 'none';
  const titulo = document.getElementById(`${tipo}FormTitulo`);
  if (titulo) titulo.textContent = tipo === 'massagem' ? 'Adicionar massagem' : 'Adicionar pacote';
}

async function editarMassagem(id) {
  const { data, error } = await supabaseClient.from('massagens').select('*').eq('id', id).single();
  if (error) return avisar('Não foi possível abrir a massagem.', 'error');
  document.getElementById('m-id').value = data.id;
  document.getElementById('m-cat').value = data.cat || '';
  document.getElementById('m-title').value = data.title || '';
  document.getElementById('m-duration').value = data.duration || '';
  document.getElementById('m-price').value = data.price ?? '';
  document.getElementById('m-desc').value = data.descricao || '';
  document.getElementById('m-icon').value = data.icon || 'icon-touch';
  document.getElementById('btn-cancelar-massagem').style.display = 'inline-flex';
  abrirModalCrud('massagem', true);
}

async function editarPacote(id) {
  const { data, error } = await supabaseClient.from('pacotes').select('*').eq('id', id).single();
  if (error) return avisar('Não foi possível abrir o pacote.', 'error');
  document.getElementById('p-id').value = data.id;
  document.getElementById('p-title').value = data.title || '';
  document.getElementById('p-sessoes').value = data.sessoes || '';
  document.getElementById('p-duracao').value = data.duracao || '';
  document.getElementById('p-de').value = data.de ?? '';
  document.getElementById('p-por').value = data.por ?? '';
  document.getElementById('p-economia').value = data.economia ?? '';
  document.getElementById('p-icon').value = data.icon || 'icon-flower';
  document.getElementById('p-destaque').checked = !!data.featured;
  document.getElementById('btn-cancelar-pacote').style.display = 'inline-flex';
  abrirModalCrud('pacote', true);
}

async function editarProduto(id) {
  const { data, error } = await supabaseClient.from('produtos').select('*').eq('id', id).single();
  if (error) return avisar('Não foi possível abrir o produto.', 'error');
  preencherProduto(data);
  abrirModalCrud('produto', true);
}

function configurarUploadProduto() {
  const input = document.getElementById('pr-imagem');
  input?.addEventListener('change', () => {
    const file = input.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return avisar('Selecione uma imagem válida.', 'error');
    const url = URL.createObjectURL(file);
    atualizarPreviewProduto(url);
  });
}

async function salvarMassagem(e) {
  e.preventDefault();
  const id = document.getElementById('m-id').value;
  const payload = { cat: document.getElementById('m-cat').value.trim(), title: document.getElementById('m-title').value.trim(), duration: document.getElementById('m-duration').value.trim(), price: Number(document.getElementById('m-price').value), descricao: document.getElementById('m-desc').value.trim(), icon: document.getElementById('m-icon').value.trim() };
  if (await salvarRegistro('massagens', id, payload, 'Massagem')) { resetFormGenerico('massagem'); fecharModalCrud(); carregarMassagens(); carregarDashboard(); }
}

async function salvarPacote(e) {
  e.preventDefault();
  const id = document.getElementById('p-id').value;
  const payload = { title: document.getElementById('p-title').value.trim(), sessoes: document.getElementById('p-sessoes').value.trim(), duracao: document.getElementById('p-duracao').value.trim(), de: valorOuNull('p-de'), por: Number(document.getElementById('p-por').value), economia: valorOuNull('p-economia'), icon: document.getElementById('p-icon').value.trim(), featured: document.getElementById('p-destaque').checked };
  if (await salvarRegistro('pacotes', id, payload, 'Pacote')) { resetFormGenerico('pacote'); fecharModalCrud(); carregarPacotes(); carregarDashboard(); }
}

async function salvarProduto(e) {
  e.preventDefault();
  const button = e.target.querySelector('button[type=submit]');
  if (button) { button.disabled = true; button.textContent = 'Salvando...'; }
  try {
    const id = document.getElementById('pr-id').value;
    let imagem = produtoImagemAtual;
    if (document.getElementById('pr-imagem')?.files?.[0]) {
      avisar('Enviando foto...');
      imagem = await salvarProdutoImagemSeNecessario();
    }
    const payload = { cat: document.getElementById('pr-cat').value.trim(), title: document.getElementById('pr-title').value.trim(), descricao: document.getElementById('pr-desc').value.trim(), price: Number(document.getElementById('pr-price').value), bg: document.getElementById('pr-bg').value.trim() || 'bg-clay', icon: document.getElementById('pr-icon').value.trim() || 'icon-flower', oculto: !!document.getElementById('pr-oculto')?.checked };
    if (imagem) payload.imagem = imagem;
    const ok = await salvarProdutoComImagem('produtos', id, payload);
    if (ok) { resetProdutoForm(); fecharModalCrud(); carregarProdutos(); carregarDashboard(); }
  } catch (error) {
    console.error(error);
    avisar(error.message || 'Não foi possível salvar o produto.', 'error');
  } finally {
    if (button) { button.disabled = false; button.textContent = 'Salvar produto'; }
  }
}

function payloadSemColuna(payload, coluna) {
  const copia = { ...payload };
  delete copia[coluna];
  return copia;
}

async function salvarProdutoComImagem(tabela, id, payload) {
  let atual = { ...payload };
  let resposta = id ? await supabaseClient.from(tabela).update(atual).eq('id', id) : await supabaseClient.from(tabela).insert([atual]);
  if (!resposta.error) { avisar(id ? 'Produto atualizado com sucesso.' : 'Produto adicionado com sucesso.', 'success'); return true; }

  const mensagem = resposta.error.message || '';
  if (/oculto|hidden|column/i.test(mensagem) && 'oculto' in atual) {
    atual = payloadSemColuna(atual, 'oculto');
    avisar('Produto salvo, mas a coluna "oculto" ainda não existe no Supabase. Veja SUPABASE_SETUP.md.', 'error');
    resposta = id ? await supabaseClient.from(tabela).update(atual).eq('id', id) : await supabaseClient.from(tabela).insert([atual]);
    if (!resposta.error) return true;
  }
  if (atual.imagem && /imagem|image_url|column/i.test(resposta.error?.message || mensagem)) {
    const alternativa = payloadSemColuna(atual, 'imagem');
    alternativa.image_url = atual.imagem;
    resposta = id ? await supabaseClient.from(tabela).update(alternativa).eq('id', id) : await supabaseClient.from(tabela).insert([alternativa]);
    if (!resposta.error) { avisar(id ? 'Produto atualizado com sucesso.' : 'Produto adicionado com sucesso.', 'success'); return true; }
  }
  console.error('Erro ao salvar produto:', resposta.error);
  avisar(`Não foi possível salvar o produto: ${resposta.error.message}`, 'error');
  return false;
}

async function alternarVisibilidadeProduto(id, jaOculto) {
  const oculto = !jaOculto;
  const { error } = await supabaseClient.from('produtos').update({ oculto }).eq('id', id);
  if (error) {
    console.error(error);
    if (/oculto|column/i.test(error.message || '')) {
      avisar('Crie a coluna "oculto" na tabela produtos do Supabase para usar essa função. Veja SUPABASE_SETUP.md.', 'error');
    } else {
      avisar('Não foi possível alterar a visibilidade do produto.', 'error');
    }
    return;
  }
  avisar(oculto ? 'Produto ocultado do site.' : 'Produto visível no site novamente.', 'success');
  carregarProdutos();
}

function valorOuNull(id) {
  const v = document.getElementById(id).value;
  return v === '' ? null : Number(v);
}

async function salvarRegistro(tabela, id, payload, nome) {
  const resposta = id ? await supabaseClient.from(tabela).update(payload).eq('id', id) : await supabaseClient.from(tabela).insert([payload]);
  if (resposta.error) {
    console.error(`Erro ao salvar ${nome}:`, resposta.error);
    avisar(`Não foi possível salvar ${nome.toLowerCase()}: ${resposta.error.message}`, 'error');
    return false;
  }
  avisar(`${nome} ${id ? 'atualizada' : 'salva'} com sucesso.`, 'success');
  return true;
}

async function excluirRegistro(tabela, id, nome) {
  const confirmou = await pedirConfirmacao(nome);
  if (!confirmou) return;
  const { error } = await supabaseClient.from(tabela).delete().eq('id', id);
  if (error) {
    console.error(`Erro ao excluir ${tabela}:`, error);
    avisar(`Não foi possível excluir: ${error.message}`, 'error');
    return;
  }
  avisar('Registro excluído com sucesso.', 'success');
  if (tabela === 'produtos') { carregarProdutos(); carregarDashboard(); }
  if (tabela === 'massagens') { carregarMassagens(); carregarDashboard(); }
  if (tabela === 'pacotes') { carregarPacotes(); carregarDashboard(); }
}
