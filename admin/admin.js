const SUPABASE_URL = "https://sybomoikpbswfpplheve.supabase.co";
const SUPABASE_KEY = "sb_publishable_a20Xy8dj13ahVvPN_TcnNg_DrJaGVrp";
const STORAGE_BUCKET = "produtos";
const LOGIN_ATTEMPTS_KEY = "afago_login_attempts";
const MUST_CHANGE_PASSWORD_KEY = "afago_must_change_password";
const MAX_LOGIN_ATTEMPTS = 5;
const SESSION_TEMP_KEY = "afago_sessao_temporaria";

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

function salvarSessaoTemporaria(sessao) {
  try {
    sessionStorage.setItem(SESSION_TEMP_KEY, JSON.stringify(sessao));
  } catch {}
}

function lerSessaoTemporaria() {
  try {
    const raw = sessionStorage.getItem(SESSION_TEMP_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function limparSessaoTemporaria() {
  sessionStorage.removeItem(SESSION_TEMP_KEY);
}

async function aplicarSessaoTemporariaSeExistir() {
  const sessaoTemp = lerSessaoTemporaria();
  if (!sessaoTemp) return false;
  try {
    const { error } = await supabaseClient.auth.setSession({
      access_token: sessaoTemp.access_token,
      refresh_token: sessaoTemp.refresh_token
    });
    if (!error) return true;
  } catch {}
  limparSessaoTemporaria();
  return false;
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
  const textEl = el.querySelector('#adminToastText');
  if (textEl) textEl.textContent = texto;
  else el.textContent = texto;
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
  atualizarPreviaIcone('pr-icon', 'icon-flower');
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
  atualizarPreviaIcone('pr-icon', p.icon ?? 'icon-flower');
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

const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;
const MAX_IMAGE_SIDE = 1600;
const JPEG_QUALITY = 0.82;

function idUnicoArquivo() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function arquivoPareceImagem(file) {
  if (!file) return false;
  if (file.type && file.type.startsWith('image/')) return true;
  return /\.(jpe?g|png|webp|gif|bmp|heic|heif)$/i.test(file.name || '');
}

function ehHeic(file) {
  const tipo = (file?.type || '').toLowerCase();
  const nome = (file?.name || '').toLowerCase();
  return tipo.includes('heic') || tipo.includes('heif') || /\.heic$|\.heif$/.test(nome);
}

function mensagemErroUpload(error) {
  const msg = `${error?.message || ''} ${error?.error || ''} ${error?.statusCode || ''}`.toLowerCase();
  if (/row-level security|rls|policy|unauthorized|not allowed|403|401/.test(msg)) {
    return 'Sem permissão para enviar fotos. No Supabase, crie o bucket "produtos" (público) e as políticas de Storage. Veja SUPABASE_SETUP.md.';
  }
  if (/bucket|not found|404/.test(msg)) {
    return 'O bucket "produtos" não existe no Storage do Supabase. Crie-o como público. Veja SUPABASE_SETUP.md.';
  }
  if (/payload|too large|413|maximum|exceed/.test(msg)) {
    return 'A foto ainda está grande demais para o Storage. Tente outra imagem.';
  }
  if (/mime|content type|not supported/.test(msg)) {
    return 'Este formato de foto não é aceito. Envie em JPG ou PNG.';
  }
  return error?.message || 'Não foi possível enviar a foto.';
}

async function criarBitmap(file) {
  if (window.createImageBitmap) {
    try {
      return await createImageBitmap(file);
    } catch {}
  }
  const url = URL.createObjectURL(file);
  try {
    return await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Não foi possível ler a foto. Tente JPG ou PNG.'));
      el.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function compactarImagem(file, opcoes = {}) {
  if (!arquivoPareceImagem(file)) throw new Error('Selecione uma imagem válida (JPG, PNG ou WEBP).');
  if (file.size > MAX_UPLOAD_BYTES) throw new Error('A imagem deve ter no máximo 12 MB.');

  const maxSide = opcoes.maxSide || MAX_IMAGE_SIDE;
  const qualidade = opcoes.quality || JPEG_QUALITY;

  let bitmap;
  try {
    bitmap = await criarBitmap(file);
  } catch (erro) {
    if (ehHeic(file)) {
      throw new Error('Fotos HEIC do iPhone não são aceitas. Em Ajustes > Câmera > Formatos, escolha "Mais Compatível", ou envie a foto em JPG.');
    }
    throw erro;
  }

  const escala = Math.min(1, maxSide / Math.max(bitmap.width || 1, bitmap.height || 1));
  const width = Math.max(1, Math.round((bitmap.width || 1) * escala));
  const height = Math.max(1, Math.round((bitmap.height || 1) * escala));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  if (bitmap.close) bitmap.close();

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(b => b ? resolve(b) : reject(new Error('Não foi possível preparar a foto.')), 'image/jpeg', qualidade);
  });
  const nome = `${idUnicoArquivo()}.jpg`;
  if (typeof File === 'function') return new File([blob], nome, { type: 'image/jpeg', lastModified: Date.now() });
  blob.name = nome;
  return blob;
}

function blobParaDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Não foi possível ler a foto.'));
    reader.readAsDataURL(blob);
  });
}

async function uploadProdutoImagem(file) {
  if (!file) return '';
  const preparado = await compactarImagem(file);
  const path = preparado.name || `${idUnicoArquivo()}.jpg`;
  const { error } = await supabaseClient.storage.from(STORAGE_BUCKET).upload(path, preparado, {
    cacheControl: '3600',
    upsert: false,
    contentType: 'image/jpeg'
  });
  if (!error) {
    const { data } = supabaseClient.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    return data?.publicUrl || '';
  }
  console.error('Upload da imagem:', error);
  avisar('Sem política no Storage. Salvando a foto junto do produto...', 'info');
  const menor = await compactarImagem(file, { maxSide: 900, quality: 0.68 });
  return blobParaDataUrl(menor);
}

async function salvarProdutoImagemSeNecessario() {
  const file = document.getElementById('pr-imagem')?.files?.[0];
  if (!file) return produtoImagemAtual;
  return uploadProdutoImagem(file);
}

function configurarPreviasIcones() {
  const campos = [
    { select: 'm-icon', preview: 'm-icon-preview', padrao: 'icon-touch' },
    { select: 'p-icon', preview: 'p-icon-preview', padrao: 'icon-flower' },
    { select: 'pr-icon', preview: 'pr-icon-preview', padrao: 'icon-flower' }
  ];
  campos.forEach(({ select, preview, padrao }) => {
    const sel = document.getElementById(select);
    const prev = document.getElementById(preview);
    if (!sel || !prev) return;
    const atualizar = () => {
      const valor = sel.value || padrao;
      const use = prev.querySelector('use');
      if (use) use.setAttribute('href', `#${valor}`);
      prev.classList.toggle('vazio', !sel.value);
    };
    sel.addEventListener('change', atualizar);
    atualizar();
  });
}

function atualizarPreviaIcone(selectId, valorIcone) {
  const mapa = {
    'm-icon': 'm-icon-preview',
    'p-icon': 'p-icon-preview',
    'pr-icon': 'pr-icon-preview'
  };
  const prevId = mapa[selectId];
  if (!prevId) return;
  const prev = document.getElementById(prevId);
  const sel = document.getElementById(selectId);
  if (!prev) return;
  const use = prev.querySelector('use');
  if (use && valorIcone) use.setAttribute('href', `#${valorIcone}`);
  if (prev) prev.classList.toggle('vazio', !valorIcone);
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
  configurarPreviasIcones();
  configurarFiltrosPedidos();
  observarSessao();
  await verificarLogin();
});

async function verificarLogin() {
  const { data, error } = await supabaseClient.auth.getSession();
  if (erroSupabase(error, 'verificar sessão')) return;
  if (data?.session) {
    mostrarPainel();
    return;
  }
  const restaurada = await aplicarSessaoTemporariaSeExistir();
  if (restaurada) mostrarPainel();
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
    
    const manterConectado = document.getElementById('lembrar-acesso')?.checked;
    if (!manterConectado) {
      const { data: sessaoData } = await supabaseClient.auth.getSession();
      if (sessaoData?.session) {
        salvarSessaoTemporaria({
          access_token: sessaoData.session.access_token,
          refresh_token: sessaoData.session.refresh_token
        });
        await supabaseClient.auth.signOut({ scope: 'local' });
        await supabaseClient.auth.setSession({
          access_token: sessaoData.session.access_token,
          refresh_token: sessaoData.session.refresh_token
        });
      }
    } else {
      limparSessaoTemporaria();
    }
    
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
    limparSessaoTemporaria();
    document.getElementById('tela-login').style.display = 'flex';
    document.getElementById('painel').classList.remove('mostrar');
    esconderAvisoLogin();
    alternarFormLogin('login');
  });

  document.getElementById('btn-ir-configuracoes')?.addEventListener('click', () => irParaAba('configuracoes'));
}

function mostrarPainel() {
  document.getElementById('tela-login').style.display = 'none';
  document.getElementById('painel').classList.add('mostrar');
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

function rotuloStatus(status) {
  const mapa = {
    pendente: 'Pendente',
    confirmado: 'Aceito',
    aceito: 'Aceito',
    recusado: 'Recusado',
    desistencia: 'Desistência',
    cancelado: 'Recusado',
    concluido: 'Concluído'
  };
  return mapa[status] || status || 'Pendente';
}

function classeStatus(status) {
  if (status === 'confirmado' || status === 'aceito' || status === 'concluido') return 'aceito';
  if (status === 'cancelado') return 'recusado';
  return status || 'pendente';
}

function parseItensPedido(a) {
  if (Array.isArray(a.itens)) return a.itens;
  if (typeof a.itens === 'string' && a.itens.trim()) {
    try { return JSON.parse(a.itens); } catch { return []; }
  }
  return [];
}

function tipoPedido(a) {
  if (a.tipo === 'produto' || a.tipo === 'agendamento') return a.tipo;
  const itens = parseItensPedido(a);
  if (itens.some(i => i.tipo === 'produto')) return 'produto';
  return 'agendamento';
}

function resumoPedido(a) {
  const itens = parseItensPedido(a);
  if (itens.length) {
    return itens.map(i => `${i.title || i.nome || 'Item'} x${i.quantidade || 1}`).join(' · ');
  }
  return a.servico || 'Pedido';
}

function htmlItensPedido(a) {
  const itens = parseItensPedido(a);
  if (!itens.length) return a.servico ? `<div class="obs">${esc(a.servico)}</div>` : '';
  return `<ul class="pedido-detalhe">${itens.map(i => {
    const qtd = Number(i.quantidade || 1);
    const preco = Number(i.price || i.por || 0);
    const tipo = i.tipo === 'pacote' ? 'Pacote' : i.tipo === 'produto' ? 'Produto' : 'Massagem';
    return `<li><span>${esc(tipo)} · ${esc(i.title || i.nome || 'Item')} × ${qtd}</span><strong>${dinheiro(preco * qtd)}</strong></li>`;
  }).join('')}</ul>`;
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
  if (lista) lista.innerHTML = error ? '<div class="empty-state"><svg class="icon"><use href="#icon-alert"/></svg><strong>Não foi possível carregar</strong><p>Tente novamente em instantes.</p></div>' : (data || []).map(a => `
    <div class="item-lista"><div><strong>${esc(a.nome || 'Cliente')}</strong><span class="pill ${classeStatus(a.status)}">${esc(rotuloStatus(a.status))}</span></div><small>${esc(resumoPedido(a))}${a.total ? ` · ${dinheiro(a.total)}` : ''}${a.data ? ` · ${esc(a.data)} às ${esc(a.horario)}` : ''}</small></div>`).join('') || '<div class="empty-state"><svg class="icon"><use href="#icon-calendar"/></svg><strong>Nenhum agendamento ainda</strong><p>Os próximos atendimentos aparecerão aqui.</p></div>';
}

async function carregarMassagens() {
  const { data, error } = await supabaseClient.from('massagens').select('*').order('id');
  const lista = document.getElementById('lista-massagens');
  if (!lista) return;
  if (error) { console.error(error); lista.innerHTML = '<div class="empty-state">Erro ao carregar massagens.</div>'; return; }
  const count = document.getElementById('count-massagens'); if (count) count.textContent = data?.length || 0;
  lista.innerHTML = (data || []).map(m => `<div class="item-lista"><div><strong>${esc(m.title)}</strong><span class="price-mini">${dinheiro(m.price)}</span></div><small>${esc(m.cat)} · ${esc(m.duration)} · ${esc(m.descricao)}</small><div class="acoes"><button class="btn-ghost editar" data-edit-massagem="${esc(m.id)}"><svg class="icon icon-sm"><use href="#icon-edit"/></svg>Editar</button><button class="btn-ghost excluir" data-delete="massagens" data-id="${esc(m.id)}" data-name="${esc(m.title)}"><svg class="icon icon-sm"><use href="#icon-trash"/></svg>Excluir</button></div></div>`).join('') || '<div class="empty-state"><svg class="icon"><use href="#icon-massage"/></svg><strong>Nenhuma massagem cadastrada</strong><p>Cadastre o primeiro serviço usando o botão acima.</p></div>';
  lista.querySelectorAll('[data-edit-massagem]').forEach(b => b.addEventListener('click', () => editarMassagem(b.dataset.editMassagem)));
  lista.querySelectorAll('[data-delete]').forEach(b => b.addEventListener('click', () => excluirRegistro(b.dataset.delete, b.dataset.id, b.dataset.name)));
}

async function carregarPacotes() {
  const { data, error } = await supabaseClient.from('pacotes').select('*').order('id');
  const lista = document.getElementById('lista-pacotes');
  if (!lista) return;
  if (error) { console.error(error); lista.innerHTML = '<div class="empty-state">Erro ao carregar pacotes.</div>'; return; }
  const count = document.getElementById('count-pacotes'); if (count) count.textContent = data?.length || 0;
  lista.innerHTML = (data || []).map(p => `<div class="item-lista"><div><strong>${esc(p.title)}</strong><span class="price-mini">${dinheiro(p.por)}</span></div><small>${esc(p.sessoes)} · ${esc(p.duracao)}${p.featured ? ' · Destaque' : ''}</small><div class="acoes"><button class="btn-ghost editar" data-edit-pacote="${esc(p.id)}"><svg class="icon icon-sm"><use href="#icon-edit"/></svg>Editar</button><button class="btn-ghost excluir" data-delete="pacotes" data-id="${esc(p.id)}" data-name="${esc(p.title)}"><svg class="icon icon-sm"><use href="#icon-trash"/></svg>Excluir</button></div></div>`).join('') || '<div class="empty-state"><svg class="icon"><use href="#icon-gift"/></svg><strong>Nenhum pacote cadastrado</strong><p>Crie ofertas especiais para seus clientes.</p></div>';
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
    return `<div class="item-lista produto-admin-item${oculto ? ' is-oculto' : ''}"><div class="produto-admin-main">${img ? `<img src="${esc(img)}" alt="">` : `<div class="produto-thumb-placeholder"><svg class="icon icon-lg"><use href="#icon-leaf"/></svg></div>`}<div><div><strong>${esc(p.title)}</strong>${oculto ? '<span class="pill oculto">Oculto</span>' : ''}<span class="price-mini">${dinheiro(p.price)}</span></div><small>${esc(p.cat)} · ${esc(p.descricao)}</small></div></div><div class="acoes"><button class="btn-ghost editar" data-edit-produto="${esc(p.id)}"><svg class="icon icon-sm"><use href="#icon-edit"/></svg>Editar</button><button class="btn-ghost toggle ocultar" data-toggle-produto="${esc(p.id)}" data-oculto="${oculto ? '1' : '0'}"><svg class="icon icon-sm"><use href="#icon-eye${oculto ? '' : '-off'}"/></svg>${oculto ? 'Mostrar' : 'Ocultar'}</button><button class="btn-ghost excluir" data-delete="produtos" data-id="${esc(p.id)}" data-name="${esc(p.title)}"><svg class="icon icon-sm"><use href="#icon-trash"/></svg>Excluir</button></div></div>`;
  }).join('') || '<div class="empty-state"><svg class="icon"><use href="#icon-package"/></svg><strong>Nenhum produto cadastrado</strong><p>Adicione produtos à loja Afago usando o botão acima.</p></div>';
  lista.querySelectorAll('[data-edit-produto]').forEach(b => b.addEventListener('click', async () => editarProduto(b.dataset.editProduto)));
  lista.querySelectorAll('[data-toggle-produto]').forEach(b => b.addEventListener('click', () => alternarVisibilidadeProduto(b.dataset.toggleProduto, b.dataset.oculto === '1')));
  lista.querySelectorAll('[data-delete]').forEach(b => b.addEventListener('click', () => excluirRegistro(b.dataset.delete, b.dataset.id, b.dataset.name)));
}

let filtroPedidoAtual = 'todos';
let pedidosCache = [];

async function atualizarStatusPedido(id, status) {
  const { error } = await supabaseClient.from('agendamentos').update({ status }).eq('id', id);
  if (error) {
    console.error(error);
    avisar('Não foi possível atualizar o status.', 'error');
    return;
  }
  const msgs = {
    confirmado: 'Pedido aceito.',
    recusado: 'Pedido recusado.',
    desistencia: 'Marcado como desistência.'
  };
  avisar(msgs[status] || 'Status atualizado.', 'success');
  carregarAgendamentos();
  carregarDashboard();
}

function renderizarListaPedidos() {
  const lista = document.getElementById('lista-agendamentos');
  if (!lista) return;
  const data = pedidosCache.filter(a => {
    if (filtroPedidoAtual === 'todos') return true;
    if (filtroPedidoAtual === 'pendente') return !a.status || a.status === 'pendente';
    return tipoPedido(a) === filtroPedidoAtual;
  });
  lista.innerHTML = data.map(a => {
    const tipo = tipoPedido(a);
    const status = a.status || 'pendente';
    const quando = a.data ? `${esc(a.data)} às ${esc(a.horario || '')}` : 'Pedido da loja';
    return `<div class="item-lista">
      <div><strong>${esc(a.nome || 'Cliente')}</strong><span class="pill ${classeStatus(status)}">${esc(rotuloStatus(status))}</span></div>
      <small>${tipo === 'produto' ? 'Produto' : 'Massagem / pacote'} · ${quando}${a.whatsapp ? ` · ${esc(a.whatsapp)}` : ''}${a.total ? ` · ${dinheiro(a.total)}` : ''}</small>
      ${htmlItensPedido(a)}
      ${a.observacoes ? `<div class="obs">${esc(a.observacoes)}</div>` : ''}
      <div class="acoes">
        <button class="btn-acao aceitar" type="button" data-pedido-status="confirmado" data-id="${esc(a.id)}">Aceitar</button>
        <button class="btn-acao recusar" type="button" data-pedido-status="recusado" data-id="${esc(a.id)}">Recusar</button>
        <button class="btn-acao desistir" type="button" data-pedido-status="desistencia" data-id="${esc(a.id)}">Desistência</button>
      </div>
    </div>`;
  }).join('') || '<div class="empty-state"><svg class="icon"><use href="#icon-calendar"/></svg><strong>Nenhum pedido neste filtro</strong><p>Os agendamentos e compras feitos no site aparecerão aqui.</p></div>';
  lista.querySelectorAll('[data-pedido-status]').forEach(btn => {
    btn.addEventListener('click', () => atualizarStatusPedido(btn.dataset.id, btn.dataset.pedidoStatus));
  });
}

async function carregarAgendamentos() {
  const lista = document.getElementById('lista-agendamentos');
  if (!lista) return;
  let { data, error } = await supabaseClient.from('agendamentos').select('*').order('created_at', { ascending: false });
  if (error) {
    const simples = await supabaseClient.from('agendamentos').select('id, created_at, servico, data, horario, nome, whatsapp, observacoes, status').order('created_at', { ascending: false });
    data = simples.data;
    error = simples.error;
  }
  if (error) {
    console.error(error);
    lista.innerHTML = `<div class="empty-state">Erro ao carregar agendamentos: ${esc(error.message)}</div>`;
    return;
  }
  pedidosCache = data || [];
  renderizarListaPedidos();
}

function configurarFiltrosPedidos() {
  document.getElementById('filtros-agendamentos')?.addEventListener('click', e => {
    const btn = e.target.closest('[data-filtro-pedido]');
    if (!btn) return;
    filtroPedidoAtual = btn.dataset.filtroPedido;
    document.querySelectorAll('[data-filtro-pedido]').forEach(b => b.classList.toggle('is-active', b === btn));
    renderizarListaPedidos();
  });
}

async function carregarContatos() {
  const { data, error } = await supabaseClient.from('contatos').select('*').order('created_at', { ascending: false });
  const lista = document.getElementById('lista-contatos');
  if (!lista) return;
  if (error) { console.error(error); lista.innerHTML = '<div class="empty-state">Erro ao carregar mensagens.</div>'; return; }
  lista.innerHTML = (data || []).map(c => `<div class="item-lista"><div><strong>${esc(c.nome)}</strong><span class="price-mini">${esc(c.whatsapp || '')}</span></div><small>${esc(c.mensagem)}</small></div>`).join('') || '<div class="empty-state"><svg class="icon"><use href="#icon-message"/></svg><strong>Nenhuma mensagem recebida</strong><p>Os contatos enviados pelo formulário do site aparecerão aqui.</p></div>';
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
  if (tipo === 'massagem') {
    document.getElementById('m-icon').value = 'icon-touch';
    atualizarPreviaIcone('m-icon', 'icon-touch');
  } else {
    document.getElementById('p-icon').value = 'icon-flower';
    atualizarPreviaIcone('p-icon', 'icon-flower');
  }
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
  atualizarPreviaIcone('m-icon', data.icon || 'icon-touch');
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
  atualizarPreviaIcone('p-icon', data.icon || 'icon-flower');
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
  const preview = document.querySelector('.upload-preview');
  preview?.addEventListener('click', () => input?.click());
  input?.addEventListener('change', () => {
    const file = input.files?.[0];
    if (!file) return;
    if (!arquivoPareceImagem(file)) {
      input.value = '';
      return avisar('Selecione uma imagem válida (JPG, PNG ou WEBP).', 'error');
    }
    if (ehHeic(file)) {
      avisar('Foto HEIC detectada. Vamos converter para JPG ao salvar. Se falhar, envie em JPG.', 'info');
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      input.value = '';
      return avisar('A imagem deve ter no máximo 12 MB.', 'error');
    }
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
  const id = document.getElementById('pr-id').value;
  const textoBotao = id ? 'Salvar alterações' : 'Criar produto';
  if (button) { button.disabled = true; button.textContent = 'Salvando...'; }
  try {
    let imagem = produtoImagemAtual;
    const arquivo = document.getElementById('pr-imagem')?.files?.[0];
    if (arquivo) {
      avisar('Preparando e enviando foto...', 'info');
      try {
        imagem = await salvarProdutoImagemSeNecessario();
      } catch (erroImg) {
        console.error(erroImg);
        avisar(erroImg.message || 'A foto não pôde ser enviada agora. Salvando o restante do produto.', 'error');
      }
    }
    const payload = { cat: document.getElementById('pr-cat').value.trim(), title: document.getElementById('pr-title').value.trim(), descricao: document.getElementById('pr-desc').value.trim(), price: Number(document.getElementById('pr-price').value), bg: document.getElementById('pr-bg').value.trim() || 'bg-clay', icon: document.getElementById('pr-icon').value.trim() || 'icon-flower', oculto: !!document.getElementById('pr-oculto')?.checked };
    if (imagem) payload.imagem = imagem;
    const ok = await salvarProdutoComImagem('produtos', id, payload);
    if (ok) { resetProdutoForm(); fecharModalCrud(); carregarProdutos(); carregarDashboard(); }
  } catch (error) {
    console.error(error);
    avisar(error.message || 'Não foi possível salvar o produto.', 'error');
  } finally {
    if (button) { button.disabled = false; button.textContent = textoBotao; }
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
    resposta = id ? await supabaseClient.from(tabela).update(atual).eq('id', id) : await supabaseClient.from(tabela).insert([atual]);
    if (!resposta.error) { avisar(id ? 'Produto atualizado com sucesso.' : 'Produto adicionado com sucesso.', 'success'); return true; }
  }
  if (atual.imagem && /imagem|image_url|column|schema cache/i.test(resposta.error?.message || mensagem)) {
    const alternativa = payloadSemColuna(atual, 'imagem');
    alternativa.image_url = atual.imagem;
    resposta = id ? await supabaseClient.from(tabela).update(alternativa).eq('id', id) : await supabaseClient.from(tabela).insert([alternativa]);
    if (!resposta.error) { avisar(id ? 'Produto atualizado com sucesso.' : 'Produto adicionado com sucesso.', 'success'); return true; }
    const semFoto = payloadSemColuna(atual, 'imagem');
    resposta = id ? await supabaseClient.from(tabela).update(semFoto).eq('id', id) : await supabaseClient.from(tabela).insert([semFoto]);
    if (!resposta.error) {
      avisar('Produto salvo, mas falta criar a coluna "imagem" no Supabase. Rode o SQL do SUPABASE_SETUP.md.', 'error');
      return true;
    }
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

// ============================================================
// NOVAS FUNCIONALIDADES - WhatsApp, Expediente, Relatórios
// ============================================================

// ----- Função para gerar mensagem de confirmação WhatsApp -----
function gerarMensagemWhatsApp(agendamento) {
  const itens = parseItensPedido(agendamento);
  let servicos = '';
  if (itens.length) {
    servicos = itens.map(i => `• ${i.title || i.nome || 'Item'}${i.quantidade > 1 ? ` (x${i.quantidade})` : ''}`).join('\n');
  } else {
    servicos = `• ${agendamento.servico || 'Serviço de massagem'}`;
  }
  const data = agendamento.data || '';
  const horario = agendamento.horario || '';
  const nome = agendamento.nome || 'Cliente';
  
  return `Olá ${nome}! Tudo bem? 😊

*A Afago confirma seu agendamento!*

📋 *Serviços solicitados:*
${servicos}

📅 *Data:* ${data}
⏰ *Horário:* ${horario}

Agradecemos pela sua preferência! Estamos ansiosos para recebê-la(o) e proporcionar uma experiência incrível de bem-estar.

Qualquer dúvida, é só chamar!

Com carinho,
*Equipe Afago* 💆‍♀️✨`;
}

function abrirWhatsApp(agendamento) {
  const mensagem = gerarMensagemWhatsApp(agendamento);
  let whatsapp = agendamento.whatsapp || '';
  whatsapp = whatsapp.replace(/\D/g, '');
  if (!whatsapp) {
    avisar('Este agendamento não tem WhatsApp cadastrado.', 'error');
    return;
  }
  const url = `https://wa.me/55${whatsapp}?text=${encodeURIComponent(mensagem)}`;
  window.open(url, '_blank');
}

// ----- Modificar renderização de pedidos para incluir WhatsApp -----
const _renderizarListaPedidosOriginal = renderizarListaPedidos;
renderizarListaPedidos = function() {
  const lista = document.getElementById('lista-agendamentos');
  if (!lista) return;
  const data = pedidosCache.filter(a => {
    if (filtroPedidoAtual === 'todos') return true;
    if (filtroPedidoAtual === 'pendente') return !a.status || a.status === 'pendente';
    if (filtroPedidoAtual === 'aceito') return a.status === 'confirmado' || a.status === 'aceito' || a.status === 'concluido';
    if (filtroPedidoAtual === 'recusado') return a.status === 'recusado' || a.status === 'cancelado';
    if (filtroPedidoAtual === 'desistencia') return a.status === 'desistencia';
    return tipoPedido(a) === filtroPedidoAtual;
  });
  lista.innerHTML = data.map(a => {
    const tipo = tipoPedido(a);
    const status = a.status || 'pendente';
    const quando = a.data ? `${esc(a.data)} às ${esc(a.horario || '')}` : 'Pedido da loja';
    const statusAceito = status === 'confirmado' || status === 'aceito';
    return `<div class="item-lista">
      <div><strong>${esc(a.nome || 'Cliente')}</strong><span class="pill ${classeStatus(status)}">${esc(rotuloStatus(status))}</span></div>
      <small>${tipo === 'produto' ? 'Produto' : 'Massagem / pacote'} · ${quando}${a.whatsapp ? ` · ${esc(a.whatsapp)}` : ''}${a.total ? ` · ${dinheiro(a.total)}` : ''}</small>
      ${htmlItensPedido(a)}
      ${a.observacoes ? `<div class="obs">${esc(a.observacoes)}</div>` : ''}
      <div class="acoes">
        ${statusAceito && a.whatsapp ? `<a class="btn-whatsapp" href="#" onclick="abrirWhatsApp(pedidosCache.find(p=>p.id==${a.id}));return false;">
          <svg class="icon"><use href="#icon-whatsapp"/></svg>Confirmar WhatsApp
        </a>` : ''}
        <button class="btn-acao aceitar" type="button" data-pedido-status="confirmado" data-id="${esc(a.id)}">Aceitar</button>
        <button class="btn-acao recusar" type="button" data-pedido-status="recusado" data-id="${esc(a.id)}">Recusar</button>
        <button class="btn-acao desistir" type="button" data-pedido-status="desistencia" data-id="${esc(a.id)}">Desistência</button>
      </div>
    </div>`;
  }).join('') || '<div class="empty-state"><svg class="icon"><use href="#icon-calendar"/></svg><strong>Nenhum pedido neste filtro</strong><p>Os agendamentos e compras feitos no site aparecerão aqui.</p></div>';
  lista.querySelectorAll('[data-pedido-status]').forEach(btn => {
    btn.addEventListener('click', () => atualizarStatusPedido(btn.dataset.id, btn.dataset.pedidoStatus));
  });
};

// ----- Novo Agendamento Manual -----
function abrirModalNovoAgendamento() {
  const modal = document.getElementById('modalAgendamento');
  if (!modal) return;
  document.getElementById('form-novo-agendamento').reset();
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
}

function fecharModalNovoAgendamento() {
  const modal = document.getElementById('modalAgendamento');
  if (!modal) return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
}

async function criarNovoAgendamento(e) {
  e.preventDefault();
  const nome = document.getElementById('ag-nome').value.trim();
  const whatsapp = document.getElementById('ag-whatsapp').value.trim();
  const servico = document.getElementById('ag-servico').value.trim();
  const data = document.getElementById('ag-data').value;
  const horario = document.getElementById('ag-horario').value;
  const total = parseFloat(document.getElementById('ag-total').value) || null;
  const observacoes = document.getElementById('ag-observacoes').value.trim();

  const { error } = await supabaseClient.from('agendamentos').insert({
    nome, whatsapp, servico, data, horario, total, observacoes,
    status: 'confirmado', tipo: 'agendamento'
  });
  if (error) {
    avisar(`Erro ao criar agendamento: ${error.message}`, 'error');
    return;
  }
  avisar('Agendamento criado com sucesso!', 'success');
  fecharModalNovoAgendamento();
  carregarAgendamentos();
  carregarDashboard();
}

// ----- Expediente -----
const diasSemana = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
let expedienteCache = [];
let indisponibilidadesCache = [];

async function carregarExpediente() {
  const { data, error } = await supabaseClient.from('expediente').select('*').order('dia_semana');
  if (error) {
    console.error('Erro ao carregar expediente:', error);
    return;
  }
  expedienteCache = data || [];
  renderizarExpediente();
}

function renderizarExpediente() {
  const lista = document.getElementById('lista-expediente');
  if (!lista) return;
  
  // Garantir que temos todos os 7 dias
  const diasCompletos = [];
  for (let i = 0; i < 7; i++) {
    const existente = expedienteCache.find(e => e.dia_semana === i);
    diasCompletos.push(existente || {
      dia_semana: i, horario_inicio: '09:00', horario_fim: '18:00',
      intervalo_entre_atendimentos: 60, ativo: i > 0 && i < 6
    });
  }
  
  lista.innerHTML = diasCompletos.map(d => `
    <div class="expediente-item" data-dia="${d.dia_semana}">
      <div class="dia-nome">${diasSemana[d.dia_semana]}</div>
      <input type="time" class="exp-inicio" value="${d.horario_inicio || '09:00'}">
      <input type="time" class="exp-fim" value="${d.horario_fim || '18:00'}">
      <input type="number" class="exp-intervalo" value="${d.intervalo_entre_atendimentos || 60}" min="15" step="15">
      <div class="switch ${d.ativo ? 'ativo' : ''}" data-dia="${d.dia_semana}"></div>
    </div>
  `).join('');
  
  // Eventos dos switches
  lista.querySelectorAll('.switch').forEach(sw => {
    sw.addEventListener('click', () => sw.classList.toggle('ativo'));
  });
}

async function salvarExpediente() {
  const itens = document.querySelectorAll('.expediente-item');
  const promessas = [];
  
  itens.forEach(item => {
    const dia = parseInt(item.dataset.dia);
    const inicio = item.querySelector('.exp-inicio').value;
    const fim = item.querySelector('.exp-fim').value;
    const intervalo = parseInt(item.querySelector('.exp-intervalo').value) || 60;
    const ativo = item.querySelector('.switch').classList.contains('ativo');
    
    const existente = expedienteCache.find(e => e.dia_semana === dia);
    if (existente) {
      promessas.push(supabaseClient.from('expediente').update({
        horario_inicio: inicio, horario_fim: fim,
        intervalo_entre_atendimentos: intervalo, ativo
      }).eq('id', existente.id));
    } else {
      promessas.push(supabaseClient.from('expediente').insert({
        dia_semana: dia, horario_inicio: inicio, horario_fim: fim,
        intervalo_entre_atendimentos: intervalo, ativo
      }));
    }
  });
  
  try {
    await Promise.all(promessas);
    avisar('Expediente salvo com sucesso!', 'success');
    carregarExpediente();
  } catch (erro) {
    avisar(`Erro ao salvar: ${erro.message}`, 'error');
  }
}

function replicarExpediente() {
  avisar('Expediente replicado! Os horários já estão ativos para todos os meses.', 'success');
}

// ----- Indisponibilidades -----
async function carregarIndisponibilidades() {
  const { data, error } = await supabaseClient.from('indisponibilidades').select('*').order('data', { ascending: true });
  if (error) {
    console.error('Erro ao carregar indisponibilidades:', error);
    return;
  }
  indisponibilidadesCache = data || [];
  renderizarIndisponibilidades();
}

function renderizarIndisponibilidades() {
  const lista = document.getElementById('lista-indisponibilidades');
  if (!lista) return;
  
  const hoje = new Date().toISOString().split('T')[0];
  const futuras = indisponibilidadesCache.filter(i => i.data >= hoje && i.ativo !== false);
  
  lista.innerHTML = futuras.length ? futuras.map(i => `
    <div class="indisponibilidade-item">
      <div class="info">
        <strong>${formatarDataBR(i.data)} ${i.horario_inicio ? `· ${i.horario_inicio} às ${i.horario_fim || '--:--'}` : '· Dia todo'}</strong>
        ${i.motivo ? `<small>${esc(i.motivo)}</small>` : ''}
      </div>
      <button class="btn-ghost delete" type="button" data-excluir-ind="${esc(i.id)}">
        <svg class="icon icon-sm"><use href="#icon-trash"/></svg>Excluir
      </button>
    </div>
  `).join('') : '<div class="empty-state"><svg class="icon"><use href="#icon-calendar"/></svg><strong>Nenhuma indisponibilidade</strong><p>Você está disponível em todos os horários configurados.</p></div>';
  
  lista.querySelectorAll('[data-excluir-ind]').forEach(btn => {
    btn.addEventListener('click', () => excluirIndisponibilidade(btn.dataset.excluirInd));
  });
}

function formatarDataBR(dataISO) {
  const partes = dataISO.split('-');
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function abrirModalIndisponibilidade() {
  const modal = document.getElementById('modalIndisponibilidade');
  if (!modal) return;
  document.getElementById('form-indisponibilidade').reset();
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
}

function fecharModalIndisponibilidade() {
  const modal = document.getElementById('modalIndisponibilidade');
  if (!modal) return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
}

async function criarIndisponibilidade(e) {
  e.preventDefault();
  const data = document.getElementById('ind-data').value;
  const inicio = document.getElementById('ind-inicio').value || null;
  const fim = document.getElementById('ind-fim').value || null;
  const motivo = document.getElementById('ind-motivo').value.trim() || null;
  
  const { error } = await supabaseClient.from('indisponibilidades').insert({ data, horario_inicio: inicio, horario_fim: fim, motivo });
  if (error) {
    avisar(`Erro: ${error.message}`, 'error');
    return;
  }
  avisar('Indisponibilidade adicionada!', 'success');
  fecharModalIndisponibilidade();
  carregarIndisponibilidades();
}

async function excluirIndisponibilidade(id) {
  const { error } = await supabaseClient.from('indisponibilidades').delete().eq('id', id);
  if (error) {
    avisar(`Erro ao excluir: ${error.message}`, 'error');
    return;
  }
  avisar('Indisponibilidade removida.', 'success');
  carregarIndisponibilidades();
}

// ----- Relatórios -----
let relatorioDataInicio = null;
let relatorioDataFim = null;

function inicializarFiltrosRelatorio() {
  const hoje = new Date();
  const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  document.getElementById('rel-data-inicio').value = primeiroDiaMes.toISOString().split('T')[0];
  document.getElementById('rel-data-fim').value = hoje.toISOString().split('T')[0];
}

function filtrarAgendamentosPorPeriodo(agendamentos) {
  const inicio = document.getElementById('rel-data-inicio').value;
  const fim = document.getElementById('rel-data-fim').value;
  
  return agendamentos.filter(a => {
    if (!a.data) return false;
    if (inicio && a.data < inicio) return false;
    if (fim && a.data > fim) return false;
    return true;
  });
}

async function carregarRelatorios() {
  const { data: agendamentos, error } = await supabaseClient.from('agendamentos').select('*');
  if (error) {
    console.error('Erro ao carregar relatórios:', error);
    return;
  }
  
  const filtrados = filtrarAgendamentosPorPeriodo(agendamentos || []);
  const aceitos = filtrados.filter(a => a.status === 'confirmado' || a.status === 'aceito' || a.status === 'concluido');
  
  // Cards
  const faturamentoTotal = aceitos.reduce((sum, a) => sum + (Number(a.total) || 0), 0);
  const ticketMedio = aceitos.length ? faturamentoTotal / aceitos.length : 0;
  const taxaConversao = filtrados.length ? (aceitos.length / filtrados.length * 100) : 0;
  
  document.getElementById('rel-faturamento-total').textContent = dinheiro(faturamentoTotal);
  document.getElementById('rel-total-agendamentos').textContent = aceitos.length;
  document.getElementById('rel-ticket-medio').textContent = dinheiro(ticketMedio);
  document.getElementById('rel-taxa-conversao').textContent = `${taxaConversao.toFixed(0)}%`;
  
  // Gráfico de faturamento mensal
  renderizarGraficoFaturamento(aceitos);
  
  // Produtos mais/menos vendidos
  renderizarRankingProdutos(aceitos);
  
  // Massagens mais/menos solicitadas
  renderizarRankingMassagens(aceitos);
}

function renderizarGraficoFaturamento(agendamentos) {
  const container = document.getElementById('grafico-faturamento');
  if (!container) return;
  
  // Agrupar por mês
  const meses = {};
  const nomesMeses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  
  agendamentos.forEach(a => {
    if (!a.data) return;
    const partes = a.data.split('-');
    const chave = `${partes[0]}-${partes[1]}`;
    if (!meses[chave]) meses[chave] = 0;
    meses[chave] += Number(a.total) || 0;
  });
  
  const chaves = Object.keys(meses).sort().slice(-6); // Últimos 6 meses
  if (!chaves.length) {
    container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--admin-muted);width:100%">Sem dados para o período selecionado.</div>';
    return;
  }
  
  const maxValor = Math.max(...chaves.map(k => meses[k]));
  
  container.innerHTML = chaves.map(chave => {
    const [ano, mes] = chave.split('-');
    const valor = meses[chave];
    const altura = maxValor > 0 ? (valor / maxValor * 250) : 0;
    return `<div class="grafico-barra">
      <div class="grafico-barra-valor">${dinheiro(valor)}</div>
      <div class="grafico-barra-fill" style="height:${altura}px"></div>
      <div class="grafico-barra-label">${nomesMeses[parseInt(mes)-1]}/${ano.slice(-2)}</div>
    </div>`;
  }).join('');
}

function renderizarRankingProdutos(agendamentos) {
  const container = document.getElementById('rel-produtos');
  if (!container) return;
  
  const contagem = {};
  agendamentos.forEach(a => {
    const itens = parseItensPedido(a);
    itens.filter(i => i.tipo === 'produto').forEach(i => {
      const nome = i.title || i.nome || 'Produto';
      if (!contagem[nome]) contagem[nome] = { qtd: 0, valor: 0 };
      contagem[nome].qtd += Number(i.quantidade) || 1;
      contagem[nome].valor += (Number(i.price) || 0) * (Number(i.quantidade) || 1);
    });
  });
  
  const lista = Object.entries(contagem)
    .map(([nome, d]) => ({ nome, ...d }))
    .sort((a, b) => b.qtd - a.qtd);
  
  if (!lista.length) {
    container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--admin-muted);font-size:13px">Sem vendas de produtos no período.</div>';
    return;
  }
  
  const maisVendido = lista[0];
  const menosVendido = lista[lista.length - 1];
  
  container.innerHTML = `
    <div class="relatorio-item destaque">
      <div class="info">
        <strong>🏆 ${esc(maisVendido.nome)}</strong>
        <small>Mais vendido · ${maisVendido.qtd} unidades</small>
      </div>
      <div class="valor">${dinheiro(maisVendido.valor)}</div>
    </div>
    ${lista.length > 1 ? `
    <div class="relatorio-item">
      <div class="info">
        <strong>📉 ${esc(menosVendido.nome)}</strong>
        <small>Menos vendido · ${menosVendido.qtd} unidades</small>
      </div>
      <div class="valor">${dinheiro(menosVendido.valor)}</div>
    </div>
    ` : ''}
    ${lista.slice(1, -1).map(item => `
    <div class="relatorio-item">
      <div class="info">
        <strong>${esc(item.nome)}</strong>
        <small>${item.qtd} unidades</small>
      </div>
      <div class="valor">${dinheiro(item.valor)}</div>
    </div>
    `).join('')}
  `;
}

function renderizarRankingMassagens(agendamentos) {
  const container = document.getElementById('rel-massagens');
  if (!container) return;
  
  const contagem = {};
  agendamentos.forEach(a => {
    const itens = parseItensPedido(a);
    const servicos = itens.filter(i => i.tipo !== 'produto');
    if (servicos.length) {
      servicos.forEach(i => {
        const nome = i.title || i.nome || 'Serviço';
        if (!contagem[nome]) contagem[nome] = { qtd: 0, valor: 0 };
        contagem[nome].qtd += Number(i.quantidade) || 1;
        contagem[nome].valor += (Number(i.price) || 0) * (Number(i.quantidade) || 1);
      });
    } else if (a.servico && tipoPedido(a) === 'agendamento') {
      const nome = a.servico;
      if (!contagem[nome]) contagem[nome] = { qtd: 0, valor: 0 };
      contagem[nome].qtd += 1;
      contagem[nome].valor += Number(a.total) || 0;
    }
  });
  
  const lista = Object.entries(contagem)
    .map(([nome, d]) => ({ nome, ...d }))
    .sort((a, b) => b.qtd - a.qtd);
  
  if (!lista.length) {
    container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--admin-muted);font-size:13px">Sem agendamentos no período.</div>';
    return;
  }
  
  const maisSolicitada = lista[0];
  const menosSolicitada = lista[lista.length - 1];
  
  container.innerHTML = `
    <div class="relatorio-item destaque">
      <div class="info">
        <strong>🏆 ${esc(maisSolicitada.nome)}</strong>
        <small>Mais solicitada · ${maisSolicitada.qtd} vezes</small>
      </div>
      <div class="valor">${dinheiro(maisSolicitada.valor)}</div>
    </div>
    ${lista.length > 1 ? `
    <div class="relatorio-item">
      <div class="info">
        <strong>📉 ${esc(menosSolicitada.nome)}</strong>
        <small>Menos solicitada · ${menosSolicitada.qtd} vezes</small>
      </div>
      <div class="valor">${dinheiro(menosSolicitada.valor)}</div>
    </div>
    ` : ''}
    ${lista.slice(1, -1).map(item => `
    <div class="relatorio-item">
      <div class="info">
        <strong>${esc(item.nome)}</strong>
        <small>${item.qtd} agendamentos</small>
      </div>
      <div class="valor">${dinheiro(item.valor)}</div>
    </div>
    `).join('')}
  `;
}

// ----- Inicialização das novas funcionalidades -----
document.addEventListener('DOMContentLoaded', () => {
  // Novo agendamento
  document.getElementById('btn-novo-agendamento')?.addEventListener('click', abrirModalNovoAgendamento);
  document.querySelectorAll('[data-close-agendamento]').forEach(b => b.addEventListener('click', fecharModalNovoAgendamento));
  document.getElementById('form-novo-agendamento')?.addEventListener('submit', criarNovoAgendamento);
  document.getElementById('modalAgendamento')?.addEventListener('click', e => {
    if (e.target.id === 'modalAgendamento') fecharModalNovoAgendamento();
  });
  
  // Expediente
  document.getElementById('btn-salvar-expediente')?.addEventListener('click', salvarExpediente);
  document.getElementById('btn-replicar-expediente')?.addEventListener('click', replicarExpediente);
  
  // Indisponibilidades
  document.getElementById('btn-nova-indisponibilidade')?.addEventListener('click', abrirModalIndisponibilidade);
  document.querySelectorAll('[data-close-indisponibilidade]').forEach(b => b.addEventListener('click', fecharModalIndisponibilidade));
  document.getElementById('form-indisponibilidade')?.addEventListener('submit', criarIndisponibilidade);
  document.getElementById('modalIndisponibilidade')?.addEventListener('click', e => {
    if (e.target.id === 'modalIndisponibilidade') fecharModalIndisponibilidade();
  });
  
  // Relatórios
  inicializarFiltrosRelatorio();
  document.getElementById('btn-filtrar-relatorio')?.addEventListener('click', carregarRelatorios);
  
  // Hook para carregar dados quando as abas forem abertas
  const observarAbas = new MutationObserver(() => {
    if (document.getElementById('aba-expediente')?.classList.contains('ativa')) {
      carregarExpediente();
      carregarIndisponibilidades();
    }
    if (document.getElementById('aba-relatorios')?.classList.contains('ativa')) {
      carregarRelatorios();
    }
  });
  const conteudo = document.querySelector('.conteudo');
  if (conteudo) observarAbas.observe(conteudo, { attributes: true, subtree: true, attributeFilter: ['class'] });
  
  // ESC para fechar novos modais
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (document.getElementById('modalAgendamento')?.classList.contains('open')) fecharModalNovoAgendamento();
      if (document.getElementById('modalIndisponibilidade')?.classList.contains('open')) fecharModalIndisponibilidade();
    }
  });
});
