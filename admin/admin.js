const SUPABASE_URL = "https://sybomoikpbswfpplheve.supabase.co";
const SUPABASE_KEY = "sb_publishable_a20Xy8dj13ahVvPN_TcnNg_DrJaGVrp";

const supabaseClient = window.supabase?.createClient
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

const dinheiro = valor => `R$ ${Number(valor || 0).toFixed(2).replace(".", ",")}`;
const esc = valor => String(valor ?? "").replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\"":"&quot;"}[c]));

function erroSupabase(erro, contexto) {
  if (erro) {
    console.error(`Supabase — ${contexto}:`, erro);
    return true;
  }
  return false;
}

document.addEventListener("DOMContentLoaded", async () => {
  if (!supabaseClient) {
    alert("Não foi possível carregar o Supabase. Verifique sua conexão e recarregue a página.");
    return;
  }
  configurarFormularioLogin();
  configurarNavegacao();
  configurarFormulariosCRUD();
  await verificarLogin();
});

async function verificarLogin() {
  const { data, error } = await supabaseClient.auth.getSession();
  if (erroSupabase(error, "verificar sessão")) return;
  if (data?.session) mostrarPainel();
}

function configurarFormularioLogin() {
  const form = document.getElementById("form-login");
  form?.addEventListener("submit", async e => {
    e.preventDefault();
    const button = form.querySelector("button[type=submit]");
    if (button) { button.disabled = true; button.textContent = "Entrando..."; }
    const email = document.getElementById("email").value.trim();
    const senha = document.getElementById("senha").value;
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password: senha });
    if (error) {
      console.error("Erro de login:", error);
      alert("E-mail ou senha incorretos. Verifique os dados e tente novamente.");
      if (button) { button.disabled = false; button.textContent = "Entrar"; }
      return;
    }
    if (button) { button.disabled = false; button.textContent = "Entrar"; }
    mostrarPainel();
  });

  document.getElementById("btn-sair")?.addEventListener("click", async () => {
    const { error } = await supabaseClient.auth.signOut();
    if (error) console.error("Erro ao sair:", error);
    document.getElementById("tela-login").style.display = "flex";
    document.getElementById("painel").style.display = "none";
  });
}

function mostrarPainel() {
  document.getElementById("tela-login").style.display = "none";
  document.getElementById("painel").style.display = "flex";
  carregarDashboard();
}

function configurarNavegacao() {
  document.querySelectorAll(".aba-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".aba-btn").forEach(b => b.classList.remove("ativa"));
      btn.classList.add("ativa");
      const aba = btn.dataset.aba;
      document.querySelectorAll(".conteudo-aba").forEach(c => c.classList.remove("ativa"));
      document.getElementById(`aba-${aba}`)?.classList.add("ativa");
      if (aba === "dashboard") carregarDashboard();
      if (aba === "massagens") carregarMassagens();
      if (aba === "pacotes") carregarPacotes();
      if (aba === "produtos") carregarProdutos();
      if (aba === "agendamentos") carregarAgendamentos();
      if (aba === "contatos") carregarContatos();
    });
  });
}

async function carregarDashboard() {
  const [ag, cont, mass, prod] = await Promise.all([
    supabaseClient.from("agendamentos").select("*", { count: "exact", head: true }),
    supabaseClient.from("contatos").select("*", { count: "exact", head: true }),
    supabaseClient.from("massagens").select("*", { count: "exact", head: true }),
    supabaseClient.from("produtos").select("*", { count: "exact", head: true })
  ]);
  [ag, cont, mass, prod].forEach((r, i) => { if (r.error) console.error("Dashboard:", i, r.error); });
  document.getElementById("qtd-agendamentos").textContent = ag.count ?? 0;
  document.getElementById("qtd-contatos").textContent = cont.count ?? 0;
  document.getElementById("qtd-massagens").textContent = mass.count ?? 0;
  document.getElementById("qtd-produtos").textContent = prod.count ?? 0;

  const { data, error } = await supabaseClient.from("agendamentos").select("*").order("created_at", { ascending: false }).limit(5);
  const lista = document.getElementById("ultimos-agendamentos");
  if (lista) lista.innerHTML = error ? `<div class="item-lista">Não foi possível carregar os agendamentos.</div>` : (data || []).map(a => `
    <div class="item-lista"><strong>${esc(a.nome)}</strong> — ${esc(a.servico)} (${esc(a.status || "pendente")})<br><small>${esc(a.data)} às ${esc(a.horario)}${a.whatsapp ? ` · ${esc(a.whatsapp)}` : ""}</small></div>`).join("") || `<div class="item-lista">Nenhum agendamento ainda.</div>`;
}

async function carregarMassagens() {
  const { data, error } = await supabaseClient.from("massagens").select("*").order("id");
  const lista = document.getElementById("lista-massagens");
  if (!lista) return;
  if (error) { console.error(error); lista.innerHTML = `<div class="item-lista">Erro ao carregar massagens.</div>`; return; }
  lista.innerHTML = (data || []).map(m => `<div class="item-lista"><strong>${esc(m.title)}</strong> — ${esc(m.duration)} · ${dinheiro(m.price)}<br><small>${esc(m.cat)} · ${esc(m.descricao)}</small></div>`).join("") || `<div class="item-lista">Nenhuma massagem cadastrada.</div>`;
}

async function carregarPacotes() {
  const { data, error } = await supabaseClient.from("pacotes").select("*").order("id");
  const lista = document.getElementById("lista-pacotes");
  if (!lista) return;
  if (error) { console.error(error); lista.innerHTML = `<div class="item-lista">Erro ao carregar pacotes.</div>`; return; }
  lista.innerHTML = (data || []).map(p => `<div class="item-lista"><strong>${esc(p.title)}</strong> — ${esc(p.sessoes)} · ${dinheiro(p.por)}<br><small>${esc(p.duracao)}${p.featured ? " · Destaque" : ""}</small></div>`).join("") || `<div class="item-lista">Nenhum pacote cadastrado.</div>`;
}

async function carregarProdutos() {
  const { data, error } = await supabaseClient.from("produtos").select("*").order("id");
  const lista = document.getElementById("lista-produtos");
  if (!lista) return;
  if (error) { console.error(error); lista.innerHTML = `<div class="item-lista">Erro ao carregar produtos.</div>`; return; }
  lista.innerHTML = (data || []).map(p => `<div class="item-lista"><strong>${esc(p.title)}</strong> — ${dinheiro(p.price)}<br><small>${esc(p.cat)} · ${esc(p.descricao)}</small></div>`).join("") || `<div class="item-lista">Nenhum produto cadastrado.</div>`;
}

async function carregarAgendamentos() {
  const { data, error } = await supabaseClient.from("agendamentos").select("*").order("created_at", { ascending: false });
  const lista = document.getElementById("lista-agendamentos");
  if (!lista) return;
  if (error) { console.error(error); lista.innerHTML = `<div class="item-lista">Erro ao carregar agendamentos.</div>`; return; }
  lista.innerHTML = (data || []).map(a => `<div class="item-lista"><strong>${esc(a.nome)}</strong> — ${esc(a.servico)}<br><small>${esc(a.data)} às ${esc(a.horario)}${a.whatsapp ? ` · ${esc(a.whatsapp)}` : ""}</small><div class="acoes"><select class="status-select" data-status-id="${esc(a.id)}"><option ${a.status === "pendente" ? "selected" : ""}>pendente</option><option ${a.status === "confirmado" ? "selected" : ""}>confirmado</option><option ${a.status === "concluido" ? "selected" : ""}>concluido</option><option ${a.status === "cancelado" ? "selected" : ""}>cancelado</option></select></div>${a.observacoes ? `<div class="obs">${esc(a.observacoes)}</div>` : ""}</div>`).join("") || `<div class="item-lista">Nenhum agendamento recebido.</div>`;
  lista.querySelectorAll("[data-status-id]").forEach(select => select.addEventListener("change", async () => {
    const { error: updateError } = await supabaseClient.from("agendamentos").update({ status: select.value }).eq("id", select.dataset.statusId);
    if (updateError) { console.error(updateError); alert("Não foi possível atualizar o status."); }
  }));
}

async function carregarContatos() {
  const { data, error } = await supabaseClient.from("contatos").select("*").order("created_at", { ascending: false });
  const lista = document.getElementById("lista-contatos");
  if (!lista) return;
  if (error) { console.error(error); lista.innerHTML = `<div class="item-lista">Erro ao carregar mensagens.</div>`; return; }
  lista.innerHTML = (data || []).map(c => `<div class="item-lista"><strong>${esc(c.nome)}</strong> — ${esc(c.whatsapp || "")}${c.email ? ` · ${esc(c.email)}` : ""}<br><small>${esc(c.mensagem)}</small></div>`).join("") || `<div class="item-lista">Nenhuma mensagem recebida.</div>`;
}

function configurarFormulariosCRUD() {
  document.getElementById("form-massagem")?.addEventListener("submit", salvarMassagem);
  document.getElementById("form-pacote")?.addEventListener("submit", salvarPacote);
  document.getElementById("form-produto")?.addEventListener("submit", salvarProduto);
}

async function salvarMassagem(e) {
  e.preventDefault();
  const id = document.getElementById("m-id").value;
  const payload = { cat: document.getElementById("m-cat").value, title: document.getElementById("m-title").value, duration: document.getElementById("m-duration").value, price: Number(document.getElementById("m-price").value), descricao: document.getElementById("m-desc").value, icon: document.getElementById("m-icon").value };
  await salvarRegistro("massagens", id, payload, "Massagem");
  e.target.reset(); document.getElementById("m-id").value = ""; carregarMassagens(); carregarDashboard();
}

async function salvarPacote(e) {
  e.preventDefault();
  const id = document.getElementById("p-id").value;
  const payload = { title: document.getElementById("p-title").value, sessoes: document.getElementById("p-sessoes").value, duracao: document.getElementById("p-duracao").value, de: valorOuNull("p-de"), por: Number(document.getElementById("p-por").value), economia: valorOuNull("p-economia"), icon: document.getElementById("p-icon").value, featured: document.getElementById("p-destaque").checked };
  await salvarRegistro("pacotes", id, payload, "Pacote");
  e.target.reset(); document.getElementById("p-id").value = ""; carregarPacotes(); carregarDashboard();
}

async function salvarProduto(e) {
  e.preventDefault();
  const id = document.getElementById("pr-id").value;
  const payload = { cat: document.getElementById("pr-cat").value, title: document.getElementById("pr-title").value, descricao: document.getElementById("pr-desc").value, price: Number(document.getElementById("pr-price").value), bg: document.getElementById("pr-bg").value, icon: document.getElementById("pr-icon").value };
  await salvarRegistro("produtos", id, payload, "Produto");
  e.target.reset(); document.getElementById("pr-id").value = ""; carregarProdutos(); carregarDashboard();
}

function valorOuNull(id) {
  const v = document.getElementById(id).value;
  return v === "" ? null : Number(v);
}

async function salvarRegistro(tabela, id, payload, nome) {
  const resposta = id
    ? await supabaseClient.from(tabela).update(payload).eq("id", id)
    : await supabaseClient.from(tabela).insert([payload]);
  if (resposta.error) {
    console.error(`Erro ao salvar ${nome}:`, resposta.error);
    alert(`Não foi possível salvar ${nome.toLowerCase()}. Verifique as permissões da tabela no Supabase.`);
    return false;
  }
  alert(`${nome} salva com sucesso!`);
  return true;
}
