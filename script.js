const SUPABASE_URL = "https://sybomoikpbswfpplheve.supabase.co";
const SUPABASE_KEY = "sb_publishable_a20Xy8dj13ahVvPN_TcnNg_DrJaGVrp";

// O site é estático, então o Supabase é carregado pelo CDN no próprio navegador.
// Não use "const { createClient } = supabase" aqui: isso cria conflito com a
// variável local e também quebrava o site quando o CDN não estava carregado.
const supabaseClient = window.supabase?.createClient
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

const WHATSAPP = "5511920113729";

const massagensFallback = [
  { id: "m1", cat: "relax", title: "Quick Massage", duration: "15 a 20 min", price: 35, descricao: "Alívio rápido da tensão e cansaço do dia a dia.", icon: "icon-touch" },
  { id: "m2", cat: "relax", title: "Massagem Relaxante", duration: "60 min", price: 130, descricao: "Relaxamento profundo, reduz o estresse e a ansiedade.", icon: "icon-flower" },
  { id: "m3", cat: "terap", title: "Massagem Tui Ná", duration: "60 min", price: 150, descricao: "Técnica terapêutica que trabalha o equilíbrio e o bem-estar.", icon: "icon-touch" },
  { id: "m4", cat: "dren", title: "Drenagem Linfática", duration: "60 min", price: 120, descricao: "Estimula a circulação, reduz inchaços e promove leveza.", icon: "icon-leaf" },
  { id: "m5", cat: "dren", title: "Massagem Modeladora", duration: "60 min", price: 120, descricao: "Auxilia na modelagem do corpo, melhora o contorno e a firmeza.", icon: "icon-droplet" }
];

const pacotesFallback = [
  { id: "pac1", title: "Sessão Avulsa", sessoes: "1 sessão", duracao: "60 minutos", de: null, por: 120, economia: null, featured: false },
  { id: "pac2", title: "Pacote 1", sessoes: "2 sessões", duracao: "60 minutos", de: 240, por: 220, economia: 20, featured: false },
  { id: "pac3", title: "Pacote 2", sessoes: "4 sessões", duracao: "60 minutos", de: 480, por: 420, economia: 60, featured: true },
  { id: "pac4", title: "Pacote 3", sessoes: "6 sessões", duracao: "60 minutos", de: 720, por: 570, economia: 150, featured: false },
  { id: "pac5", title: "Pacote 4", sessoes: "10 sessões", duracao: "60 minutos", de: 1200, por: 950, economia: 250, featured: false }
];

const produtosFallback = [
  { id: "p1", cat: "Sabonetes", title: "Sabonete Argila Rosa & Gerânio", descricao: "Limpeza suave que devolve o viço à pele. Feito pelo método cold process.", price: 32, bg: "bg-clay", icon: "icon-flower" },
  { id: "p2", cat: "Sabonetes", title: "Sabonete Alecrim & Menta", descricao: "Refrescante e revigorante. Perfeito para o banho matinal.", price: 28, bg: "bg-moss", icon: "icon-leaf" },
  { id: "p3", cat: "Banhos", title: "Sais de Banho Relaxantes", descricao: "Sal de Epsom, flores de lavanda e camomila. Acompanha saquinho de algodão.", price: 45, bg: "bg-honey", icon: "icon-droplet" },
  { id: "p4", cat: "Óleos", title: "Óleo Corporal Bifásico", descricao: "Nutrição profunda com toque seco. Mix de óleos de amêndoas e semente de uva.", price: 58, bg: "bg-espresso", icon: "icon-leaf" }
];

let massagens = [...massagensFallback];
let pacotes = [...pacotesFallback];
let produtos = [...produtosFallback];
let carrinho = JSON.parse(localStorage.getItem("afago_carrinho") || "[]");
let pedidoServicos = [];
let qtyServico = 1;

const dinheiro = valor => `R$ ${Number(valor || 0).toFixed(2).replace(".", ",")}`;
const esc = valor => String(valor ?? "").replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\"":"&quot;"}[c]));

function showToast(texto) {
  const toast = document.getElementById("toast");
  const target = document.getElementById("toastText");
  if (!toast || !target) return;
  target.textContent = texto;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 3000);
}

async function buscarTabela(nome, fallback) {
  if (!supabaseClient) return fallback;
  try {
    const { data, error } = await supabaseClient.from(nome).select("*").order("id");
    if (error) {
      console.error(`Erro ao carregar ${nome}:`, error);
      return fallback;
    }
    return Array.isArray(data) && data.length ? data : fallback;
  } catch (error) {
    console.error(`Erro ao carregar ${nome}:`, error);
    return fallback;
  }
}

async function carregarTudo() {
  [massagens, pacotes, produtos] = await Promise.all([
    buscarTabela("massagens", massagensFallback),
    buscarTabela("pacotes", pacotesFallback),
    buscarTabela("produtos", produtosFallback)
  ]);
  produtos = produtos.filter(p => p.oculto !== true && p.hidden !== true && p.visivel !== false);

  renderizarMassagens();
  renderizarPacotes();
  renderizarProdutos();
  configurarFiltros();
  atualizarCarrinho();
}

function configurarRealtime() {
  if (!supabaseClient) return;
  const tabelas = ["massagens", "pacotes", "produtos"];
  tabelas.forEach(tabela => {
    try {
      supabaseClient
        .channel(`public:${tabela}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: tabela },
          async () => {
            await carregarTudo();
          }
        )
        .subscribe();
    } catch (e) {
      console.warn(`Realtime não disponível para ${tabela}:`, e);
    }
  });
}

function renderizarMassagens(filtro = "todos") {
  const lista = filtro === "todos" ? massagens : massagens.filter(m => String(m.cat || "").toLowerCase() === filtro);
  const card = m => `
    <article class="card-massagem">
      <div class="card-top">
        <div class="card-icon"><svg class="icon"><use href="#${esc(m.icon || "icon-touch")}"></use></svg></div>
        <span class="duration-tag"><svg class="icon"><use href="#icon-clock"></use></svg>${esc(m.duration || "60 min")}</span>
      </div>
      <h3>${esc(m.title)}</h3>
      <p>${esc(m.descricao)}</p>
      <div class="card-bottom">
        <div class="price">${dinheiro(m.price)} <small>sessão</small></div>
        <button class="btn btn-primary btn-sm agendar-btn" data-service="${esc(m.title)}">Agendar</button>
      </div>
    </article>`;

  const full = document.getElementById("massagensGrid");
  const preview = document.getElementById("massagensPreview");
  if (full) full.innerHTML = lista.map(card).join("");
  if (preview) preview.innerHTML = massagens.slice(0, 3).map(card).join("");
  vincularAgendamentos();
}

function renderizarPacotes() {
  const container = document.getElementById("pacotesGrid");
  if (!container) return;
  container.innerHTML = pacotes.map(p => `
    <article class="pacote-card ${p.featured ? "destaque" : ""}">
      ${p.featured ? '<span class="pacote-badge">Mais escolhido</span>' : ""}
      ${p.icon ? `<div class="pacote-icon"><svg class="icon"><use href="#${esc(p.icon)}"></use></svg></div>` : ""}
      <h3>${esc(p.title)}</h3>
      <div class="sessoes">${esc(p.sessoes)} · ${esc(p.duracao)}</div>
      ${p.de != null ? `<div class="de">De ${dinheiro(p.de)}</div>` : ""}
      <div class="por">${dinheiro(p.por)}</div>
      ${p.economia != null ? `<div class="economia">Economia de ${dinheiro(p.economia)}</div>` : ""}
      <button class="btn btn-primary btn-sm agendar-btn" data-service="${esc(p.title)}">Agendar</button>
    </article>`).join("");
  vincularAgendamentos();
}

function produtoCard(p) {
  const foto = p.imagem || p.image_url;
  return `
    <article class="card-produto">
      <div class="produto-media ${esc(p.bg || "bg-clay")}${foto ? " has-photo" : ""}">
        ${foto
          ? `<img src="${esc(foto)}" alt="${esc(p.title)}" loading="lazy">`
          : `<svg class="icon"><use href="#${esc(p.icon || "icon-leaf")}"></use></svg>`}
      </div>
      <div class="produto-body">
        <span class="produto-cat">${esc(p.cat || "Produto")}</span>
        <h3>${esc(p.title)}</h3>
        <p>${esc(p.descricao)}</p>
        <div class="produto-footer">
          <div class="price">${dinheiro(p.price)}</div>
          <button class="add-btn" type="button" data-add-product="${esc(p.id)}" aria-label="Adicionar ${esc(p.title)}">
            <svg class="icon"><use href="#icon-plus"></use></svg>
          </button>
        </div>
      </div>
    </article>`;
}

function renderizarProdutos(filtro = "todos") {
  const lista = filtro === "todos" ? produtos : produtos.filter(p => String(p.cat || "").toLowerCase() === filtro);
  const full = document.getElementById("produtosGrid");
  const preview = document.getElementById("produtosPreview");
  if (full) full.innerHTML = lista.map(produtoCard).join("");
  if (preview) preview.innerHTML = produtos.slice(0, 4).map(produtoCard).join("");
  document.querySelectorAll("[data-add-product]").forEach(btn => {
    btn.addEventListener("click", () => adicionarAoCarrinho(btn.dataset.addProduct));
  });
}

function configurarFiltros() {
  const categoriasMassagem = [...new Set(massagens.map(m => m.cat).filter(Boolean))];
  const categoriasProduto = [...new Set(produtos.map(p => p.cat).filter(Boolean))];
  const nomes = { relax: "Relaxantes", terap: "Terapêuticas", dren: "Drenagem / Modeladora" };

  const montar = (id, categorias, callback, todosTexto = "Todos") => {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = [
      `<button class="chip is-active" data-filter="todos">${todosTexto}</button>`,
      ...categorias.map(cat => `<button class="chip" data-filter="${esc(String(cat).toLowerCase())}">${esc(nomes[cat] || cat)}</button>`)
    ].join("");
    el.querySelectorAll(".chip").forEach(btn => btn.addEventListener("click", () => {
      el.querySelectorAll(".chip").forEach(b => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      callback(btn.dataset.filter);
    }));
  };

  montar("massagensFilters", categoriasMassagem, renderizarMassagens);
  montar("produtosFilters", categoriasProduto, renderizarProdutos);
}

function catalogoServicos() {
  return [
    ...massagens.map(m => ({
      id: `massagem-${m.id}`,
      tipo: "massagem",
      title: m.title,
      price: Number(m.price || 0)
    })),
    ...pacotes.map(p => ({
      id: `pacote-${p.id}`,
      tipo: "pacote",
      title: p.title,
      price: Number(p.por || 0)
    }))
  ];
}

function acharServico(titulo) {
  return catalogoServicos().find(s => s.title === titulo) || null;
}

function totalPedidoServicos() {
  return pedidoServicos.reduce((s, i) => s + Number(i.price) * Number(i.quantidade), 0);
}

function textoPedidoServicos() {
  return pedidoServicos.map(i => `${i.title} x${i.quantidade}`).join(", ");
}

function renderizarPedidoServicos() {
  const lista = document.getElementById("bServiceList");
  const totalWrap = document.getElementById("bTotalWrap");
  const totalEl = document.getElementById("bTotal");
  if (!lista) return;
  lista.innerHTML = pedidoServicos.map((i, idx) => `
    <div class="pedido-item">
      <div>
        <strong>${esc(i.title)}</strong>
        <small>${i.tipo === "pacote" ? "Pacote" : "Massagem"} · ${i.quantidade}x · ${dinheiro(i.price * i.quantidade)}</small>
      </div>
      <button class="remove-link" type="button" data-remove-service="${idx}">Remover</button>
    </div>`).join("");
  lista.querySelectorAll("[data-remove-service]").forEach(btn => {
    btn.addEventListener("click", () => {
      pedidoServicos.splice(Number(btn.dataset.removeService), 1);
      renderizarPedidoServicos();
    });
  });
  if (totalWrap && totalEl) {
    totalWrap.hidden = !pedidoServicos.length;
    totalEl.textContent = dinheiro(totalPedidoServicos());
  }
}

function atualizarQtyServico(valor) {
  qtyServico = Math.max(1, Math.min(20, Number(valor) || 1));
  const el = document.getElementById("bQty");
  if (el) el.textContent = String(qtyServico);
}

function adicionarServicoPedido(titulo, quantidade = qtyServico) {
  const servico = acharServico(titulo);
  if (!servico) return;
  const qtd = Math.max(1, Number(quantidade) || 1);
  const existente = pedidoServicos.find(i => i.id === servico.id);
  if (existente) existente.quantidade += qtd;
  else pedidoServicos.push({ ...servico, quantidade: qtd });
  renderizarPedidoServicos();
}

function vincularAgendamentos() {
  document.querySelectorAll(".agendar-btn").forEach(btn => {
    btn.addEventListener("click", () => abrirAgendamento(btn.dataset.service || ""));
  });
}

function abrirAgendamento(servico = "") {
  const modal = document.getElementById("bookingModal");
  const select = document.getElementById("bService");
  if (!modal || !select) return;
  const catalogo = catalogoServicos();
  select.innerHTML = [
    `<option value="">Escolha um serviço</option>`,
    `<optgroup label="Massagens">${catalogo.filter(s => s.tipo === "massagem").map(s => `<option value="${esc(s.title)}">${esc(s.title)} — ${dinheiro(s.price)}</option>`).join("")}</optgroup>`,
    `<optgroup label="Pacotes">${catalogo.filter(s => s.tipo === "pacote").map(s => `<option value="${esc(s.title)}">${esc(s.title)} — ${dinheiro(s.price)}</option>`).join("")}</optgroup>`
  ].join("");
  pedidoServicos = [];
  atualizarQtyServico(1);
  if (servico) {
    select.value = servico;
    adicionarServicoPedido(servico, 1);
  } else {
    renderizarPedidoServicos();
  }
  const date = document.getElementById("bDate");
  if (date) date.min = new Date().toISOString().split("T")[0];
  preencherHorarios();
  document.getElementById("bookingFormWrap")?.style.setProperty("display", "block");
  document.getElementById("bookingSuccess")?.classList.remove("show");
  document.getElementById("bookingSuccess")?.style.setProperty("display", "none");
  modal.classList.add("is-open");
  document.getElementById("bookingOverlay")?.classList.add("is-open");
  document.body.style.overflow = "hidden";
}

function fecharAgendamento() {
  document.getElementById("bookingModal")?.classList.remove("is-open");
  document.getElementById("bookingOverlay")?.classList.remove("is-open");
  document.body.style.overflow = "";
}

function preencherHorarios() {
  const select = document.getElementById("bTime");
  if (!select) return;
  const horarios = [];
  for (let h = 9; h <= 18; h++) {
    for (const min of [0, 30]) {
      if (h === 18 && min > 0) continue;
      horarios.push(`${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`);
    }
  }
  select.innerHTML = horarios.map(h => `<option value="${h}">${h}</option>`).join("");
}

function colunaAusente(mensagem) {
  const match = String(mensagem || "").match(/Could not find the '([^']+)' column/i);
  return match ? match[1] : "";
}

async function salvarPedido(dados) {
  if (!supabaseClient) return false;
  let payload = { ...dados };
  for (let i = 0; i < 8; i++) {
    const { error } = await supabaseClient.from("agendamentos").insert([payload]);
    if (!error) return true;
    const coluna = colunaAusente(error.message);
    if (coluna && coluna in payload) {
      delete payload[coluna];
      continue;
    }
    payload = {
      servico: dados.servico,
      data: dados.data || "",
      horario: dados.horario || "",
      nome: dados.nome || "",
      whatsapp: dados.whatsapp || "",
      observacoes: dados.observacoes || "",
      status: dados.status || "pendente"
    };
    const { error: erroMinimo } = await supabaseClient.from("agendamentos").insert([payload]);
    if (!erroMinimo) return true;
    console.error("Erro ao salvar pedido:", erroMinimo);
    return false;
  }
  return false;
}

async function enviarAgendamento(e) {
  e.preventDefault();
  if (!pedidoServicos.length) {
    showToast("Adicione pelo menos um serviço para agendar.");
    return;
  }
  const nome = document.getElementById("bName")?.value || "";
  const whatsapp = document.getElementById("bPhone")?.value || "";
  const data = document.getElementById("bDate")?.value || "";
  const horario = document.getElementById("bTime")?.value || "";
  const observacoes = document.getElementById("bNotes")?.value || "";
  const total = totalPedidoServicos();
  const servico = textoPedidoServicos();
  const detalhes = pedidoServicos.map(i => `• ${i.title} (${i.tipo}) x${i.quantidade} — ${dinheiro(i.price * i.quantidade)}`).join("\n");
  const obsCompleta = [observacoes, detalhes, `Total: ${dinheiro(total)}`].filter(Boolean).join("\n");
  const dados = {
    tipo: "agendamento",
    servico,
    itens: JSON.stringify(pedidoServicos),
    total,
    data,
    horario,
    nome,
    whatsapp,
    observacoes: obsCompleta,
    status: "pendente"
  };
  const salvou = await salvarPedido(dados);
  if (!salvou) showToast("Não foi possível registrar o pedido no painel. O WhatsApp ainda vai abrir.");

  const texto = `Olá! Gostaria de agendar na Afago:\n\n${detalhes}\n\n*Total: ${dinheiro(total)}*\n\nNome: ${nome}\nWhatsApp: ${whatsapp}\nData: ${data}\nHorário: ${horario}${observacoes ? `\nObservações: ${observacoes}` : ""}`;
  const link = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(texto)}`;
  document.getElementById("bookingWhatsappLink").href = link;
  document.getElementById("bookingFormWrap")?.style.setProperty("display", "none");
  document.getElementById("bookingSuccess")?.classList.add("show");
  document.getElementById("bookingSuccess")?.style.setProperty("display", "flex");
}

function configurarContato() {
  const form = document.getElementById("contactForm");
  if (!form) return;
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const nome = document.getElementById("cName")?.value || "";
    const whatsapp = document.getElementById("cPhone")?.value || "";
    const mensagem = document.getElementById("cMsg")?.value || "";

    if (supabaseClient) {
      const { error } = await supabaseClient.from("contatos").insert([{ nome, whatsapp, mensagem }]);
      if (error) console.error("Erro ao salvar contato:", error);
    }

    const texto = `Olá! Sou ${nome}.\nWhatsApp: ${whatsapp}\n\n${mensagem}`;
    const link = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(texto)}`;
    const success = document.getElementById("contactSuccess");
    const wa = document.getElementById("contactWhatsappLink");
    if (wa) wa.href = link;
    if (success) success.style.display = "flex";
    form.style.display = "none";
  });
}

function configurarMenuScroll() {
  const nav = document.getElementById("siteNav");
  if (!nav) return;
  const atualizar = () => nav.classList.toggle("is-scrolled", window.scrollY > 8);
  atualizar();
  window.addEventListener("scroll", atualizar, { passive: true });
}

function configurarNavegacao() {
  const abrirView = view => {
    const destino = document.getElementById(`view-${view}`) || document.getElementById("view-inicio");
    document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
    destino.classList.add("active");
    document.querySelectorAll(".nav-link").forEach(a => a.classList.toggle("active", a.dataset.viewLink === view));
    document.getElementById("navLinks")?.classList.remove("is-open");
    document.getElementById("navScrim")?.classList.remove("is-open");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  document.querySelectorAll("[data-view-link]").forEach(link => {
    link.addEventListener("click", e => {
      e.preventDefault();
      abrirView(link.dataset.viewLink);
    });
  });

  document.querySelectorAll("[data-tab]").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-tab]").forEach(b => b.classList.remove("is-active"));
      document.querySelectorAll(".tab-content").forEach(c => c.style.display = "none");
      btn.classList.add("is-active");
      const alvo = document.getElementById(`tab-${btn.dataset.tab}`);
      if (alvo) alvo.style.display = "block";
    });
  });

  const burger = document.getElementById("navBurger");
  burger?.addEventListener("click", () => {
    document.getElementById("navLinks")?.classList.toggle("is-open");
    document.getElementById("navScrim")?.classList.toggle("is-open");
  });
}

function adicionarAoCarrinho(id) {
  const produto = produtos.find(p => String(p.id) === String(id));
  if (!produto) return;
  const item = carrinho.find(i => String(i.id) === String(id));
  if (item) item.quantidade += 1;
  else carrinho.push({ id: produto.id, title: produto.title, price: Number(produto.price || 0), bg: produto.bg, quantidade: 1 });
  persistirCarrinho();
  atualizarCarrinho();
  showToast(`${produto.title} adicionado ao carrinho`);
}

function persistirCarrinho() { localStorage.setItem("afago_carrinho", JSON.stringify(carrinho)); }

function atualizarCarrinho() {
  const badge = document.getElementById("cartBadge");
  const totalQtd = carrinho.reduce((s, i) => s + Number(i.quantidade || 0), 0);
  if (badge) { badge.textContent = totalQtd; badge.style.display = totalQtd ? "flex" : "none"; }
  renderizarCarrinho();
}

function renderizarCarrinho() {
  const body = document.getElementById("cartBody");
  const foot = document.getElementById("cartFoot");
  if (!body || !foot) return;
  if (!carrinho.length) {
    body.innerHTML = `<div class="cart-empty"><svg class="icon"><use href="#icon-bag"></use></svg><p>Seu carrinho está vazio.</p></div>`;
    foot.innerHTML = "";
    return;
  }
  body.innerHTML = carrinho.map(i => `
    <div class="cart-item">
      <div class="cart-item-media ${esc(i.bg || "bg-clay")}"><svg class="icon"><use href="#icon-leaf"></use></svg></div>
      <div class="cart-item-info">
        <h4>${esc(i.title)}</h4>
        <div class="price">${dinheiro(i.price)}</div>
        <div class="cart-item-actions">
          <div class="qty-stepper">
            <button data-cart-action="minus" data-id="${esc(i.id)}"><svg class="icon"><use href="#icon-minus"></use></svg></button>
            <span>${i.quantidade}</span>
            <button data-cart-action="plus" data-id="${esc(i.id)}"><svg class="icon"><use href="#icon-plus"></use></svg></button>
          </div>
          <button class="remove-link" data-cart-action="remove" data-id="${esc(i.id)}">Remover</button>
        </div>
      </div>
    </div>`).join("");

  const total = carrinho.reduce((s, i) => s + Number(i.price) * Number(i.quantidade), 0);
  foot.innerHTML = `<div class="cart-total-row"><span>Total</span><strong>${dinheiro(total)}</strong></div><button class="btn btn-primary btn-block" id="checkoutBtn">Finalizar pelo WhatsApp</button>`;
  body.querySelectorAll("[data-cart-action]").forEach(btn => btn.addEventListener("click", () => alterarCarrinho(btn.dataset.id, btn.dataset.cartAction)));
  document.getElementById("checkoutBtn")?.addEventListener("click", finalizarCarrinho);
}

function alterarCarrinho(id, acao) {
  const item = carrinho.find(i => String(i.id) === String(id));
  if (!item) return;
  if (acao === "plus") item.quantidade += 1;
  if (acao === "minus") item.quantidade -= 1;
  if (acao === "remove" || item.quantidade <= 0) carrinho = carrinho.filter(i => String(i.id) !== String(id));
  persistirCarrinho();
  atualizarCarrinho();
}

async function finalizarCarrinho() {
  if (!carrinho.length) return;
  const itens = carrinho.map(i => `• ${i.title} x${i.quantidade} — ${dinheiro(i.price * i.quantidade)}`).join("\n");
  const total = carrinho.reduce((s, i) => s + Number(i.price) * Number(i.quantidade), 0);
  const pedido = {
    tipo: "produto",
    servico: carrinho.map(i => `${i.title} x${i.quantidade}`).join(", "),
    itens: JSON.stringify(carrinho.map(i => ({ id: i.id, tipo: "produto", title: i.title, price: i.price, quantidade: i.quantidade }))),
    total,
    data: "",
    horario: "",
    nome: "",
    whatsapp: "",
    observacoes: `Pedido de produtos da loja\n${itens}\nTotal: ${dinheiro(total)}`,
    status: "pendente"
  };
  const salvou = await salvarPedido(pedido);
  if (!salvou) showToast("Não foi possível registrar o pedido no painel. O WhatsApp ainda vai abrir.");
  const texto = `Olá! Gostaria de fazer um pedido pela loja Afago:\n\n${itens}\n\n*Total: ${dinheiro(total)}*`;
  window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(texto)}`, "_blank", "noopener");
}

function configurarCarrinho() {
  const open = () => { document.getElementById("cartDrawer")?.classList.add("is-open"); document.getElementById("cartOverlay")?.classList.add("is-open"); };
  const close = () => { document.getElementById("cartDrawer")?.classList.remove("is-open"); document.getElementById("cartOverlay")?.classList.remove("is-open"); };
  document.getElementById("cartOpenBtn")?.addEventListener("click", open);
  document.getElementById("cartCloseBtn")?.addEventListener("click", close);
  document.getElementById("cartOverlay")?.addEventListener("click", close);
}

function configurarBooking() {
  document.getElementById("bookingForm")?.addEventListener("submit", enviarAgendamento);
  document.getElementById("bookingCloseBtn")?.addEventListener("click", fecharAgendamento);
  document.getElementById("bookingDoneBtn")?.addEventListener("click", fecharAgendamento);
  document.getElementById("bookingOverlay")?.addEventListener("click", fecharAgendamento);
  document.getElementById("bDate")?.addEventListener("change", preencherHorarios);
  document.getElementById("bQtyMinus")?.addEventListener("click", () => atualizarQtyServico(qtyServico - 1));
  document.getElementById("bQtyPlus")?.addEventListener("click", () => atualizarQtyServico(qtyServico + 1));
  document.getElementById("bAddService")?.addEventListener("click", () => {
    const titulo = document.getElementById("bService")?.value;
    if (!titulo) return showToast("Escolha um serviço antes de adicionar.");
    adicionarServicoPedido(titulo, qtyServico);
    atualizarQtyServico(1);
  });
}

function configurarWhatsApp() {
  const link = `https://wa.me/${WHATSAPP}`;
  document.getElementById("whatsappFloat")?.setAttribute("href", link);
  document.getElementById("whatsappContactLink")?.setAttribute("href", link);
}

function configurarRevelacoes() {
  const elementos = document.querySelectorAll(".reveal");
  if (!elementos.length) return;
  if (!("IntersectionObserver" in window)) {
    elementos.forEach(el => el.classList.add("is-visible"));
    return;
  }
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: "0px 0px -40px 0px" });
  elementos.forEach(el => observer.observe(el));
}

document.addEventListener("DOMContentLoaded", async () => {
  configurarNavegacao();
  configurarMenuScroll();
  configurarCarrinho();
  configurarBooking();
  configurarContato();
  configurarWhatsApp();
  configurarRevelacoes();
  await carregarTudo();
  configurarRealtime();
});
