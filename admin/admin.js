const SUPABASE_URL = "https://sybomoikpbswfpplheve.supabase.co";
const SUPABASE_KEY = "sb_publishable_a20Xy8dj13ahVvPN_TcnNg_DrJaGVrp";

const { createClient } = supabase;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

let usuarioLogado = null;
let abaAtiva = "dashboard";

document.addEventListener("DOMContentLoaded", async () => {
  verificarSessao();
  configurarLogin();
  configurarNavegacao();
});

async function verificarSessao() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    usuarioLogado = session.user;
    mostrarPainel();
  } else {
    supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        usuarioLogado = session.user;
        mostrarPainel();
      }
    });
  }
}

function configurarLogin() {
  document.getElementById("form-login").addEventListener("submit", async e => {
    e.preventDefault();
    const email = document.getElementById("email").value;
    const senha = document.getElementById("senha").value;
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) {
      alert("E-mail ou senha incorretos.");
      return;
    }
  });
  document.getElementById("btn-sair").addEventListener("click", async () => {
    await supabase.auth.signOut();
    usuarioLogado = null;
    document.getElementById("tela-login").style.display = "flex";
    document.getElementById("painel").style.display = "none";
    document.getElementById("form-login").reset();
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
      abaAtiva = btn.dataset.aba;
      document.querySelectorAll(".aba-btn").forEach(b => b.classList.remove("ativa"));
      btn.classList.add("ativa");
      document.querySelectorAll(".conteudo-aba").forEach(c => c.classList.remove("ativa"));
      document.getElementById(`aba-${abaAtiva}`).classList.add("ativa");
      if (abaAtiva === "dashboard") carregarDashboard();
      if (abaAtiva === "massagens") carregarListaMassagens();
      if (abaAtiva === "pacotes") carregarListaPacotes();
      if (abaAtiva === "produtos") carregarListaProdutos();
      if (abaAtiva === "agendamentos") carregarAgendamentos();
      if (abaAtiva === "contatos") carregarContatos();
    });
  });

  document.getElementById("form-massagem").addEventListener("submit", salvarMassagem);
  document.getElementById("form-pacote").addEventListener("submit", salvarPacote);
  document.getElementById("form-produto").addEventListener("submit", salvarProduto);
}

async function carregarDashboard() {
  const [ag, cont, mass, prod] = await Promise.all([
    supabase.from("agendamentos").select("id", { count: "exact", head: true }),
    supabase.from("contatos").select("id", { count: "exact", head: true }),
    supabase.from("massagens").select("id", { count: "exact", head: true }),
    supabase.from("produtos").select("id", { count: "exact", head: true })
  ]);
  document.getElementById("qtd-agendamentos").textContent = ag.count || 0;
  document.getElementById("qtd-contatos").textContent = cont.count || 0;
  document.getElementById("qtd-massagens").textContent = mass.count || 0;
  document.getElementById("qtd-produtos").textContent = prod.count || 0;

  const { data: ultimos } = await supabase.from("agendamentos").select("*").order("created_at", { ascending: false }).limit(5);
  const lista = document.getElementById("ultimos-agendamentos");
  lista.innerHTML = ultimos?.length ? ultimos.map(a => `
    <div class="item-lista">
      <strong>${a.nome}</strong> — ${a.servico}<br>
      <small>${formatarData(a.data)} às ${a.horario} · ${a.status}</small>
    </div>
  `).join("") : "<p>Nenhum agendamento ainda.</p>";
}

async function carregarListaMassagens() {
  const { data } = await supabase.from("massagens").select("*").order("id");
  const lista = document.getElementById("lista-massagens");
  lista.innerHTML = data.map(m => `
    <div class="item-lista">
      <strong>${m.title}</strong> — ${m.duration} · R$ ${Number(m.price).toFixed(2).replace(".", ",")}<br>
      <small>${m.descricao}</small>
      <div class="acoes">
        <button class="editar" data-id="${m.id}">Editar</button>
        <button class="excluir" data-id="${m.id}">Excluir</button>
      </div>
    </div>
  `).join("");
  vincularBotoesMassagens(data);
}

function vincularBotoesMassagens(lista) {
  document.querySelectorAll("#lista-massagens .editar").forEach(btn => {
    btn.addEventListener("click", () => {
      const m = lista.find(x => x.id === btn.dataset.id);
      preencherFormularioMassagem(m);
    });
  });
  document.querySelectorAll("#lista-massagens .excluir").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (confirm("Excluir esta massagem?")) {
        await supabase.from("massagens").delete().eq("id", btn.dataset.id);
        carregarListaMassagens();
      }
    });
  });
}

function preencherFormularioMassagem(m) {
  document.getElementById("m-id").value = m.id;
  document.getElementById("m-cat").value = m.cat;
  document.getElementById("m-title").value = m.title;
  document.getElementById("m-duration").value = m.duration;
  document.getElementById("m-price").value = m.price;
  document.getElementById("m-desc").value = m.descricao;
  document.getElementById("m-icon").value = m.icon;
  document.getElementById("form-massagens").scrollIntoView({ behavior: "smooth" });
}

async function salvarMassagem(e) {
  e.preventDefault();
  const id = document.getElementById("m-id").value || "m" + Date.now();
  const dados = {
    id,
    cat: document.getElementById("m-cat").value,
    title: document.getElementById("m-title").value,
    duration: document.getElementById("m-duration").value,
    price: parseFloat(document.getElementById("m-price").value),
    descricao: document.getElementById("m-desc").value,
    icon: document.getElementById("m-icon").value
  };
  const { data } = await supabase.from("massagens").select("id").eq("id", id);
  data?.length
    ? await supabase.from("massagens").update(dados).eq("id", id)
    : await supabase.from("massagens").insert([dados]);
  this.reset();
  carregarListaMassagens();
  alert("Salvo com sucesso!");
}

async function carregarListaPacotes() {
  const { data } = await supabase.from("pacotes").select("*").order("id");
  const lista = document.getElementById("lista-pacotes");
  lista.innerHTML = data.map(p => `
    <div class="item-lista">
      <strong>${p.title}</strong> — ${p.sessoes} · R$ ${Number(p.por).toFixed(2).replace(".", ",")}${p.featured ? " ⭐" : ""}<br>
      <small>${p.duracao}${p.economia ? ` · Economia R$ ${Number(p.economia).toFixed(2).replace(".", ",")}` : ""}</small>
      <div class="acoes">
        <button class="editar" data-id="${p.id}">Editar</button>
        <button class="excluir" data-id="${p.id}">Excluir</button>
      </div>
    </div>
  `).join("");
  vincularBotoesPacotes(data);
}

function vincularBotoesPacotes(lista) {
  document.querySelectorAll("#lista-pacotes .editar").forEach(btn => {
    btn.addEventListener("click", () => {
      const p = lista.find(x => x.id === btn.dataset.id);
      preencherFormularioPacote(p);
    });
  });
  document.querySelectorAll("#lista-pacotes .excluir").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (confirm("Excluir este pacote?")) {
        await supabase.from("pacotes").delete().eq("id", btn.dataset.id);
        carregarListaPacotes();
      }
    });
  });
}

function preencherFormularioPacote(p) {
  document.getElementById("p-id").value = p.id;
  document.getElementById("p-title").value = p.title;
  document.getElementById("p-sessoes").value = p.sessoes;
  document.getElementById("p-duracao").value = p.duracao;
  document.getElementById("p-de").value = p.de || "";
  document.getElementById("p-por").value = p.por;
  document.getElementById("p-economia").value = p.economia || "";
  document.getElementById("p-icon").value = p.icon;
  document.getElementById("p-destaque").checked = p.featured;
  document.getElementById("form-pacotes").scrollIntoView({ behavior: "smooth" });
}

async function salvarPacote(e) {
  e.preventDefault();
  const id = document.getElementById("p-id").value || "pac" + Date.now();
  const dados = {
    id,
    title: document.getElementById("p-title").value,
    sessoes: document.getElementById("p-sessoes").value,
    duracao: document.getElementById("p-duracao").value,
    de: document.getElementById("p-de").value ? parseFloat(document.getElementById("p-de").value) : null,
    por: parseFloat(document.getElementById("p-por").value),
    economia: document.getElementById("p-economia").value ? parseFloat(document.getElementById("p-economia").value) : null,
    icon: document.getElementById("p-icon").value,
    featured: document.getElementById("p-destaque").checked
  };
  const { data } = await supabase.from("pacotes").select("id").eq("id", id);
  data?.length
    ? await supabase.from("pacotes").update(dados).eq("id", id)
    : await supabase.from("pacotes").insert([dados]);
  this.reset();
  carregarListaPacotes();
  alert("Salvo com sucesso!");
}

async function carregarListaProdutos() {
  const { data } = await supabase.from("produtos").select("*").order("id");
  const lista = document.getElementById("lista-produtos");
  lista.innerHTML = data.map(p => `
    <div class="item-lista">
      <span class="categoria">${p.cat}</span> · <strong>${p.title}</strong> — R$ ${Number(p.price).toFixed(2).replace(".", ",")}<br>
      <small>${p.descricao}</small>
      <div class="acoes">
        <button class="editar" data-id="${p.id}">Editar</button>
        <button class="excluir" data-id="${p.id}">Excluir</button>
      </div>
    </div>
  `).join("");
  vincularBotoesProdutos(data);
}

function vincularBotoesProdutos(lista) {
  document.querySelectorAll("#lista-produtos .editar").forEach(btn => {
    btn.addEventListener("click", () => {
      const p = lista.find(x => x.id === btn.dataset.id);
      preencherFormularioProduto(p);
    });
  });
  document.querySelectorAll("#lista-produtos .excluir").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (confirm("Excluir este produto?")) {
        await supabase.from("produtos").delete().eq("id", btn.dataset.id);
        carregarListaProdutos();
      }
    });
  });
}

function preencherFormularioProduto(p) {
  document.getElementById("pr-id").value = p.id;
  document.getElementById("pr-cat").value = p.cat;
  document.getElementById("pr-title").value = p.title;
  document.getElementById("pr-desc").value = p.descricao;
  document.getElementById("pr-price").value = p.price;
  document.getElementById("pr-bg").value = p.bg;
  document.getElementById("pr-icon").value = p.icon;
  document.getElementById("form-produtos").scrollIntoView({ behavior: "smooth" });
}

async function salvarProduto(e) {
  e.preventDefault();
  const id = document.getElementById("pr-id").value || "p" + Date.now();
  const dados = {
    id,
    cat: document.getElementById("pr-cat").value,
    title: document.getElementById("pr-title").value,
    descricao: document.getElementById("pr-desc").value,
    price: parseFloat(document.getElementById("pr-price").value),
    bg: document.getElementById("pr-bg").value,
    icon: document.getElementById("pr-icon").value
  };
  const { data } = await supabase.from("produtos").select("id").eq("id", id);
  data?.length
    ? await supabase.from("produtos").update(dados).eq("id", id)
    : await supabase.from("produtos").insert([dados]);
  this.reset();
  carregarListaProdutos();
  alert("Salvo com sucesso!");
}

async function carregarAgendamentos() {
  const { data } = await supabase.from("agendamentos").select("*").order("created_at", { ascending: false });
  const lista = document.getElementById("lista-agendamentos");
  lista.innerHTML = data.length ? data.map(a => `
    <div class="item-lista">
      <strong>${a.nome}</strong> — ${a.servico}<br>
      <small>Data: ${formatarData(a.data)} às ${a.horario}</small>
      ${a.observacoes ? `<p class="obs">Obs: ${a.observacoes}</p>` : ""}
      <div class="status">
        <select data-id="${a.id}" class="status-select">
          <option value="pendente" ${a.status === "pendente" ? "selected" : ""}>⏳ Pendente</option>
          <option value="confirmado" ${a.status === "confirmado" ? "selected" : ""}>✅ Confirmado</option>
          <option value="concluido" ${a.status === "concluido" ? "selected" : ""}>✔ Concluído</option>
          <option value="cancelado" ${a.status === "cancelado" ? "selected" : ""}>❌ Cancelado</option>
        </select>
        <button class="excluir" data-id="${a.id}">Excluir</button>
      </div>
    </div>
  `).join("") : "<p>Nenhum agendamento.</p>";

  document.querySelectorAll(".status-select").forEach(sel => {
    sel.addEventListener("change", async () => {
      await supabase.from("agendamentos").update({ status: sel.value }).eq("id", sel.dataset.id);
    });
  });
  document.querySelectorAll("#lista-agendamentos .excluir").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (confirm("Excluir este agendamento?")) {
        await supabase.from("agendamentos").delete().eq("id", btn.dataset.id);
        carregarAgendamentos();
      }
    });
  });
}

async function carregarContatos() {
  const { data } = await supabase.from("contatos").select("*").order("created_at", { ascending: false });
  const lista = document.getElementById("lista-contatos");
  lista.innerHTML = data.length ? data.map(c => `
    <div class="item-lista">
      <strong>${c.nome}</strong> — <a href="https://wa.me/${c.whatsapp.replace(/\D/g, "")}" target="_blank">${c.whatsapp}</a><br>
      <small>${formatarDataCompleta(c.created_at)}</small>
      <p class="obs">${c.mensagem}</p>
    </div>
  `).join("") : "<p>Nenhuma mensagem.</p>";
}

function formatarData(data) {
  if (!data) return "";
  const d = new Date(data + "T00:00:00");
  return d.toLocaleDateString("pt-BR");
}

function formatarDataCompleta(data) {
  if (!data) return "";
  const d = new Date(data);
  return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}
