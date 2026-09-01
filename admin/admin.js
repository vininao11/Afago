const SUPABASE_URL = "https://sybomoikpbswfpplheve.supabase.co";
const SUPABASE_KEY = "sb_publishable_a20Xy8dj13ahVvPN_TcnNg_DrJaGVrp";

const { createClient } = supabase;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

document.addEventListener("DOMContentLoaded", () => {
  verificarLogin();
  configurarFormularioLogin();
  configurarNavegacao();
});

async function verificarLogin() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    mostrarPainel();
  }
}

function configurarFormularioLogin() {
  const form = document.getElementById("form-login");
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const email = document.getElementById("email").value;
    const senha = document.getElementById("senha").value;
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) {
      alert("E-mail ou senha incorretos!");
      return;
    }
    mostrarPainel();
  });

  const btnSair = document.getElementById("btn-sair");
  btnSair.addEventListener("click", async () => {
    await supabase.auth.signOut();
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
      document.getElementById(`aba-${aba}`).classList.add("ativa");
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
    supabase.from("agendamentos").select("*", { count: "exact", head: true }),
    supabase.from("contatos").select("*", { count: "exact", head: true }),
    supabase.from("massagens").select("*", { count: "exact", head: true }),
    supabase.from("produtos").select("*", { count: "exact", head: true })
  ]);
  document.getElementById("qtd-agendamentos").textContent = ag.count || 0;
  document.getElementById("qtd-contatos").textContent = cont.count || 0;
  document.getElementById("qtd-massagens").textContent = mass.count || 0;
  document.getElementById("qtd-produtos").textContent = prod.count || 0;
}

async function carregarMassagens() {
  const { data } = await supabase.from("massagens").select("*").order("id");
  const lista = document.getElementById("lista-massagens");
  lista.innerHTML = "";
  if (data) data.forEach(m => {
    lista.innerHTML += `
      <div class="item-lista">
        <strong>${m.title}</strong> — ${m.duration} · R$ ${Number(m.price).toFixed(2).replace(".", ",")}<br>
        <small>${m.descricao}</small>
      </div>
    `;
  });
}

async function carregarPacotes() {
  const { data } = await supabase.from("pacotes").select("*").order("id");
  const lista = document.getElementById("lista-pacotes");
  lista.innerHTML = "";
  if (data) data.forEach(p => {
    lista.innerHTML += `
      <div class="item-lista">
        <strong>${p.title}</strong> — ${p.sessoes} · R$ ${Number(p.por).toFixed(2).replace(".", ",")}<br>
        <small>${p.duracao}</small>
      </div>
    `;
  });
}

async function carregarProdutos() {
  const { data } = await supabase.from("produtos").select("*").order("id");
  const lista = document.getElementById("lista-produtos");
  lista.innerHTML = "";
  if (data) data.forEach(p => {
    lista.innerHTML += `
      <div class="item-lista">
        <strong>${p.title}</strong> — R$ ${Number(p.price).toFixed(2).replace(".", ",")}<br>
        <small>${p.cat} · ${p.descricao}</small>
      </div>
    `;
  });
}

async function carregarAgendamentos() {
  const { data } = await supabase.from("agendamentos").select("*").order("created_at", { ascending: false });
  const lista = document.getElementById("lista-agendamentos");
  lista.innerHTML = "";
  if (data) data.forEach(a => {
    lista.innerHTML += `
      <div class="item-lista">
        <strong>${a.nome}</strong> — ${a.servico} (${a.status})<br>
        <small>${a.data} às ${a.horario}</small>
      </div>
    `;
  });
}

async function carregarContatos() {
  const { data } = await supabase.from("contatos").select("*").order("created_at", { ascending: false });
  const lista = document.getElementById("lista-contatos");
  lista.innerHTML = "";
  if (data) data.forEach(c => {
    lista.innerHTML += `
      <div class="item-lista">
        <strong>${c.nome}</strong> — ${c.whatsapp}<br>
        <small>${c.mensagem}</small>
      </div>
    `;
  });
}
