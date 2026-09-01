const SUPABASE_URL = "https://sybomoikpbswfpplheve.supabase.co";
const SUPABASE_KEY = "sb_publishable_a20Xy8dj13ahVvPN_TcnNg_DrJaGVrp";

const { createClient } = supabase;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

let massagensData = [];
let pacotesData = [];
let produtosData = [];

document.addEventListener("DOMContentLoaded", async () => {
  await carregarMassagens();
  await carregarPacotes();
  await carregarProdutos();
  configurarFormulario();
});

async function carregarMassagens() {
  const { data, error } = await supabase.from("massagens").select("*").order("id");
  if (error || !data) {
    usarMassagensFallback();
    return;
  }
  massagensData = data;
  renderizarMassagens(data);
}

function renderizarMassagens(lista) {
  const container = document.querySelector(".massagens-grid");
  if (!container) return;
  container.innerHTML = "";
  lista.forEach(m => {
    const card = document.createElement("div");
    card.className = "servico-card";
    card.innerHTML = `
      <div class="card-header">
        <span class="icone">${getIcone(m.icon)}</span>
        <span class="duracao">${m.duration}</span>
      </div>
      <h3>${m.title}</h3>
      <p>${m.descricao}</p>
      <div class="preco">R$ ${m.price.toFixed(2).replace(".", ",")}</div>
      <button class="btn-agendar" data-servico="${m.title}" data-valor="${m.price}">Agendar</button>
    `;
    container.appendChild(card);
  });
  vincularBotoesAgendar();
}

async function carregarPacotes() {
  const { data, error } = await supabase.from("pacotes").select("*").order("id");
  if (error || !data) {
    usarPacotesFallback();
    return;
  }
  pacotesData = data;
  renderizarPacotes(data);
}

function renderizarPacotes(lista) {
  const container = document.querySelector(".pacotes-grid");
  if (!container) return;
  container.innerHTML = "";
  lista.forEach(p => {
    const card = document.createElement("div");
    card.className = `pacote-card ${p.featured ? "destaque" : ""}`;
    card.innerHTML = `
      <h3>${p.title}</h3>
      <div class="sessoes">${p.sessoes} · ${p.duracao}</div>
      ${p.de ? `<div class="de">De R$ ${p.de.toFixed(2).replace(".", ",")}</div>` : ""}
      <div class="por">Por R$ ${p.por.toFixed(2).replace(".", ",")}</div>
      ${p.economia ? `<div class="economia">Economia de R$ ${p.economia.toFixed(2).replace(".", ",")}</div>` : ""}
      <button class="btn-agendar" data-servico="${p.title}" data-valor="${p.por}">Agendar</button>
    `;
    container.appendChild(card);
  });
  vincularBotoesAgendar();
}

async function carregarProdutos() {
  const { data, error } = await supabase.from("produtos").select("*").order("id");
  if (error || !data) {
    usarProdutosFallback();
    return;
  }
  produtosData = data;
  renderizarProdutos(data);
}

function renderizarProdutos(lista) {
  const container = document.querySelector(".produtos-grid");
  if (!container) return;
  container.innerHTML = "";
  lista.forEach(p => {
    const card = document.createElement("div");
    card.className = `produto-card ${p.bg}`;
    card.innerHTML = `
      <span class="categoria">${p.cat}</span>
      <h3>${p.title}</h3>
      <p>${p.descricao}</p>
      <div class="preco">R$ ${p.price.toFixed(2).replace(".", ",")}</div>
    `;
    container.appendChild(card);
  });
}

function configurarFormulario() {
  const form = document.getElementById("form-agendamento");
  if (form) {
    form.addEventListener("submit", async e => {
      e.preventDefault();
      const servico = document.getElementById("servico").value;
      const data = document.getElementById("data").value;
      const horario = document.getElementById("horario").value;
      const nome = document.getElementById("nome").value;
      const obs = document.getElementById("observacoes").value;

      const { error } = await supabase.from("agendamentos").insert([{
        servico, data, horario, nome, observacoes: obs, status: "pendente"
      }]);

      if (error) {
        alert("Erro ao agendar. Tente novamente.");
        return;
      }
      alert("Agendamento enviado com sucesso! Em breve entraremos em contato.");
      form.reset();
      fecharModal();
    });
  }

  const formContato = document.getElementById("form-contato");
  if (formContato) {
    formContato.addEventListener("submit", async e => {
      e.preventDefault();
      const nome = document.getElementById("c-nome").value;
      const whatsapp = document.getElementById("c-whatsapp").value;
      const mensagem = document.getElementById("c-mensagem").value;

      const { error } = await supabase.from("contatos").insert([{
        nome, whatsapp, mensagem
      }]);

      if (error) {
        alert("Erro ao enviar mensagem. Tente novamente.");
        return;
      }
      alert("Mensagem enviada! Obrigada.");
      formContato.reset();
    });
  }
}

function vincularBotoesAgendar() {
  document.querySelectorAll(".btn-agendar").forEach(btn => {
    btn.addEventListener("click", () => {
      document.getElementById("servico").value = btn.dataset.servico;
      abrirModal();
    });
  });
}

function abrirModal() {
  document.getElementById("modal-agendar").classList.add("aberto");
  document.body.style.overflow = "hidden";
}

function fecharModal() {
  document.getElementById("modal-agendar").classList.remove("aberto");
  document.body.style.overflow = "";
}

function getIcone(nome) {
  const icones = {
    "icon-touch": "✋",
    "icon-flower": "🌸",
    "icon-leaf": "🍃",
    "icon-droplet": "💧",
    "icon-heart": "❤️",
    "icon-star": "⭐"
  };
  return icones[nome] || "✋";
}

function usarMassagensFallback() {
  renderizarMassagens([
    { id: "m1", title: "Quick Massage", duration: "15 a 20 min", price: 35.00, descricao: "Alívio rápido da tensão e cansaço do dia a dia.", icon: "icon-touch" },
    { id: "m2", title: "Massagem Relaxante", duration: "60 min", price: 130.00, descricao: "Relaxamento profundo, reduz o estresse e a ansiedade.", icon: "icon-flower" },
    { id: "m3", title: "Massagem Tui Ná", duration: "60 min", price: 150.00, descricao: "Técnica terapêutica que trabalha o equilíbrio e o bem-estar.", icon: "icon-touch" },
    { id: "m4", title: "Drenagem Linfática", duration: "60 min", price: 120.00, descricao: "Estimula a circulação, reduz inchaços e promove leveza.", icon: "icon-leaf" },
    { id: "m5", title: "Massagem Modeladora", duration: "60 min", price: 120.00, descricao: "Auxilia na modelagem do corpo, melhora o contorno e a firmeza.", icon: "icon-droplet" }
  ]);
}

function usarPacotesFallback() {
  renderizarPacotes([
    { id: "pac1", title: "Sessão Avulsa", sessoes: "1 sessão", duracao: "60 minutos", de: null, por: 120.00, economia: null, featured: false },
    { id: "pac2", title: "Pacote 1", sessoes: "2 sessões", duracao: "60 minutos", de: 240.00, por: 220.00, economia: 20.00, featured: false },
    { id: "pac3", title: "Pacote 2", sessoes: "4 sessões", duracao: "60 minutos", de: 480.00, por: 420.00, economia: 60.00, featured: true },
    { id: "pac4", title: "Pacote 3", sessoes: "6 sessões", duracao: "60 minutos", de: 720.00, por: 570.00, economia: 150.00, featured: false },
    { id: "pac5", title: "Pacote 4", sessoes: "10 sessões", duracao: "60 minutos", de: 1200.00, por: 950.00, economia: 250.00, featured: false }
  ]);
}

function usarProdutosFallback() {
  renderizarProdutos([
    { id: "p1", cat: "Sabonetes", title: "Sabonete Argila Rosa & Gerânio", descricao: "Limpeza suave que devolve o viço à pele. Feito pelo método cold process.", price: 32.00, bg: "bg-clay" },
    { id: "p2", cat: "Sabonetes", title: "Sabonete Alecrim & Menta", descricao: "Refrescante e revigorante. Perfeito para o banho matinal.", price: 28.00, bg: "bg-moss" },
    { id: "p3", cat: "Banhos", title: "Sais de Banho Relaxantes", descricao: "Sal de Epsom, flores de lavanda e camomila. Acompanha saquinho de algodão.", price: 45.00, bg: "bg-honey" },
    { id: "p4", cat: "Óleos", title: "Óleo Corporal Bifásico", descricao: "Nutrição profunda com toque seco. Mix de óleos de amêndoas e semente de uva.", price: 58.00, bg: "bg-espresso" }
  ]);
}