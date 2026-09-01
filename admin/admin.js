const SUPABASE_URL = "https://sybomoikpbswfpplheve.supabase.co";
const SUPABASE_KEY = "sb_publishable_a20Xy8dj13ahVvPN_TcnNg_DrJaGVrp";
const STORAGE_BUCKET = "produtos";

const supabaseClient = window.supabase?.createClient
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

const dinheiro = valor => `R$ ${Number(valor || 0).toFixed(2).replace('.', ',')}`;
const esc = valor => String(valor ?? '').replace(/[&<>\'\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[c]));

let produtoImagemAtual = '';
let produtoImagemNova = '';

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
  produtoImagemAtual = p.imagem || p.image_url || '';
  produtoImagemNova = '';
  atualizarPreviewProduto(produtoImagemAtual);
  document.getElementById('produtoFormTitulo').textContent = 'Editar produto';
  document.getElementById('btn-cancelar-produto').style.display = 'inline-flex';
  document.getElementById('aba-produtos').scrollIntoView({ behavior: 'smooth', block: 'start' });
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
  await verificarLogin();
});

async function verificarLogin() {
  const { data, error } = await supabaseClient.auth.getSession();
  if (erroSupabase(error, 'verificar sessão')) return;
  if (data?.session) mostrarPainel();
}

function configurarFormularioLogin() {
  const form = document.getElementById('form-login');
  form?.addEventListener('submit', async e => {
    e.preventDefault();
    const button = form.querySelector('button[type=submit]');
    if (button) { button.disabled = true; button.textContent = 'Entrando...'; }
    const email = document.getElementById('email').value.trim();
    const senha = document.getElementById('senha').value;
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password: senha });
    if (error) {
      console.error('Erro de login:', error);
      avisar(error.message?.includes('Invalid login') ? 'E-mail ou senha incorretos.' : `Não foi possível entrar: ${error.message}`, 'error');
      if (button) { button.disabled = false; button.textContent = 'Entrar'; }
      return;
    }
    if (button) { button.disabled = false; button.textContent = 'Entrar'; }
    mostrarPainel();
  });

  document.getElementById('btn-sair')?.addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
    document.getElementById('tela-login').style.display = 'flex';
    document.getElementById('painel').style.display = 'none';
  });
}

function mostrarPainel() {
  document.getElementById('tela-login').style.display = 'none';
  document.getElementById('painel').style.display = 'flex';
  carregarDashboard();
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
    });
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
  lista.innerHTML = (data || []).map(m => `<div class="item-lista"><div><strong>${esc(m.title)}</strong><span class="price-mini">${dinheiro(m.price)}</span></div><small>${esc(m.cat)} · ${esc(m.duration)} · ${esc(m.descricao)}</small><div class="acoes"><button class="btn-ghost editar" data-edit-massagem="${esc(m.id)}">Editar</button><button class="btn-ghost excluir" data-delete="massagens" data-id="${esc(m.id)}" data-name="${esc(m.title)}">Excluir</button></div></div>`).join('') || '<div class="empty-state">Nenhuma massagem cadastrada.</div>';
  lista.querySelectorAll('[data-edit-massagem]').forEach(b => b.addEventListener('click', () => editarMassagem(b.dataset.editMassagem)));
  lista.querySelectorAll('[data-delete]').forEach(b => b.addEventListener('click', () => excluirRegistro(b.dataset.delete, b.dataset.id, b.dataset.name)));
}

async function carregarPacotes() {
  const { data, error } = await supabaseClient.from('pacotes').select('*').order('id');
  const lista = document.getElementById('lista-pacotes');
  if (!lista) return;
  if (error) { console.error(error); lista.innerHTML = '<div class="empty-state">Erro ao carregar pacotes.</div>'; return; }
  lista.innerHTML = (data || []).map(p => `<div class="item-lista"><div><strong>${esc(p.title)}</strong><span class="price-mini">${dinheiro(p.por)}</span></div><small>${esc(p.sessoes)} · ${esc(p.duracao)}${p.featured ? ' · Destaque' : ''}</small><div class="acoes"><button class="btn-ghost editar" data-edit-pacote="${esc(p.id)}">Editar</button><button class="btn-ghost excluir" data-delete="pacotes" data-id="${esc(p.id)}" data-name="${esc(p.title)}">Excluir</button></div></div>`).join('') || '<div class="empty-state">Nenhum pacote cadastrado.</div>';
  lista.querySelectorAll('[data-edit-pacote]').forEach(b => b.addEventListener('click', () => editarPacote(b.dataset.editPacote)));
  lista.querySelectorAll('[data-delete]').forEach(b => b.addEventListener('click', () => excluirRegistro(b.dataset.delete, b.dataset.id, b.dataset.name)));
}

async function carregarProdutos() {
  const { data, error } = await supabaseClient.from('produtos').select('*').order('id');
  const lista = document.getElementById('lista-produtos');
  if (!lista) return;
  if (error) { console.error(error); lista.innerHTML = '<div class="empty-state">Erro ao carregar produtos. Verifique as permissões da tabela no Supabase.</div>'; return; }
  lista.innerHTML = (data || []).map(p => {
    const img = p.imagem || p.image_url || '';
    return `<div class="item-lista produto-admin-item"><div class="produto-admin-main">${img ? `<img src="${esc(img)}" alt="">` : '<div class="produto-thumb-placeholder">✦</div>'}<div><div><strong>${esc(p.title)}</strong><span class="price-mini">${dinheiro(p.price)}</span></div><small>${esc(p.cat)} · ${esc(p.descricao)}</small></div></div><div class="acoes"><button class="btn-ghost editar" data-edit-produto="${esc(p.id)}">Editar</button><button class="btn-ghost excluir" data-delete="produtos" data-id="${esc(p.id)}" data-name="${esc(p.title)}">Excluir</button></div></div>`;
  }).join('') || '<div class="empty-state">Nenhum produto cadastrado.</div>';
  lista.querySelectorAll('[data-edit-produto]').forEach(b => b.addEventListener('click', async () => editarProduto(b.dataset.editProduto)));
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
  document.getElementById('btn-cancelar-massagem')?.addEventListener('click', () => resetFormGenerico('massagem'));
  document.getElementById('btn-cancelar-pacote')?.addEventListener('click', () => resetFormGenerico('pacote'));
  document.getElementById('btn-cancelar-produto')?.addEventListener('click', resetProdutoForm);
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
  document.getElementById('massagemFormTitulo').textContent = 'Editar massagem';
  document.getElementById('btn-cancelar-massagem').style.display = 'inline-flex';
  document.getElementById('aba-massagens').scrollIntoView({ behavior: 'smooth', block: 'start' });
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
  document.getElementById('pacoteFormTitulo').textContent = 'Editar pacote';
  document.getElementById('btn-cancelar-pacote').style.display = 'inline-flex';
  document.getElementById('aba-pacotes').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function editarProduto(id) {
  const { data, error } = await supabaseClient.from('produtos').select('*').eq('id', id).single();
  if (error) return avisar('Não foi possível abrir o produto.', 'error');
  preencherProduto(data);
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
  if (await salvarRegistro('massagens', id, payload, 'Massagem')) { resetFormGenerico('massagem'); carregarMassagens(); carregarDashboard(); }
}

async function salvarPacote(e) {
  e.preventDefault();
  const id = document.getElementById('p-id').value;
  const payload = { title: document.getElementById('p-title').value.trim(), sessoes: document.getElementById('p-sessoes').value.trim(), duracao: document.getElementById('p-duracao').value.trim(), de: valorOuNull('p-de'), por: Number(document.getElementById('p-por').value), economia: valorOuNull('p-economia'), icon: document.getElementById('p-icon').value.trim(), featured: document.getElementById('p-destaque').checked };
  if (await salvarRegistro('pacotes', id, payload, 'Pacote')) { resetFormGenerico('pacote'); carregarPacotes(); carregarDashboard(); }
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
    const payload = { cat: document.getElementById('pr-cat').value.trim(), title: document.getElementById('pr-title').value.trim(), descricao: document.getElementById('pr-desc').value.trim(), price: Number(document.getElementById('pr-price').value), bg: document.getElementById('pr-bg').value.trim() || 'bg-clay', icon: document.getElementById('pr-icon').value.trim() || 'icon-flower' };
    if (imagem) payload.imagem = imagem;
    const ok = await salvarProdutoComImagem('produtos', id, payload);
    if (ok) { resetProdutoForm(); carregarProdutos(); carregarDashboard(); }
  } catch (error) {
    console.error(error);
    avisar(error.message || 'Não foi possível salvar o produto.', 'error');
  } finally {
    if (button) { button.disabled = false; button.textContent = 'Salvar produto'; }
  }
}

async function salvarProdutoComImagem(tabela, id, payload) {
  let resposta = id ? await supabaseClient.from(tabela).update(payload).eq('id', id) : await supabaseClient.from(tabela).insert([payload]);
  if (!resposta.error) { avisar(id ? 'Produto atualizado com sucesso.' : 'Produto adicionado com sucesso.', 'success'); return true; }

  const mensagem = resposta.error.message || '';
  if (payload.imagem && /imagem|image_url|column/i.test(mensagem)) {
    const alternativa = { ...payload, imagem: undefined };
    delete alternativa.imagem;
    resposta = id ? await supabaseClient.from(tabela).update({ ...alternativa, image_url: payload.imagem }).eq('id', id) : await supabaseClient.from(tabela).insert([{ ...alternativa, image_url: payload.imagem }]);
    if (!resposta.error) { avisar(id ? 'Produto atualizado com sucesso.' : 'Produto adicionado com sucesso.', 'success'); return true; }
  }
  console.error('Erro ao salvar produto:', resposta.error);
  avisar(`Não foi possível salvar o produto: ${resposta.error.message}`, 'error');
  return false;
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
  if (!confirm(`Excluir "${nome}"? Essa ação não pode ser desfeita.`)) return;
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
