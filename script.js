const WHATSAPP_NUMBER = "5511920113729";
const massagensData = [
  { id: 'm1', cat: 'relax', title: 'Quick Massage', duration: '15 a 20 min', price: 35, desc: 'Alívio rápido da tensão e cansaço do dia a dia.', icon: 'icon-touch' },
  { id: 'm2', cat: 'relax', title: 'Massagem Relaxante', duration: '60 min', price: 130, desc: 'Relaxamento profundo, reduz o estresse e a ansiedade.', icon: 'icon-flower' },
  { id: 'm3', cat: 'terap', title: 'Massagem Tui Ná', duration: '60 min', price: 150, desc: 'Técnica terapêutica que trabalha o equilíbrio e o bem-estar.', icon: 'icon-touch' },
  { id: 'm4', cat: 'dren', title: 'Drenagem Linfática', duration: '60 min', price: 120, desc: 'Estimula a circulação, reduz inchaços e promove leveza.', icon: 'icon-leaf' },
  { id: 'm5', cat: 'dren', title: 'Massagem Modeladora', duration: '60 min', price: 120, desc: 'Auxilia na modelagem do corpo, melhora o contorno e a firmeza.', icon: 'icon-droplet' }
];
const pacotesData = [
  { id: 'pac1', title: 'Sessão Avulsa', sessoes: '1 sessão', duracao: '60 minutos', de: null, por: 120, economia: null, icon: 'icon-flower', featured: false },
  { id: 'pac2', title: 'Pacote 1', sessoes: '2 sessões', duracao: '60 minutos', de: 240, por: 220, economia: 20, icon: 'icon-leaf', featured: false },
  { id: 'pac3', title: 'Pacote 2', sessoes: '4 sessões', duracao: '60 minutos', de: 480, por: 420, economia: 60, icon: 'icon-flower', featured: true },
  { id: 'pac4', title: 'Pacote 3', sessoes: '6 sessões', duracao: '60 minutos', de: 720, por: 570, economia: 150, icon: 'icon-heart', featured: false },
  { id: 'pac5', title: 'Pacote 4', sessoes: '10 sessões', duracao: '60 minutos', de: 1200, por: 950, economia: 250, icon: 'icon-star', featured: false }
];
const produtosData = [
  { id: 'p1', cat: 'Sabonetes', title: 'Sabonete Argila Rosa & Gerânio', desc: 'Limpeza suave que devolve o viço à pele. Feito pelo método cold process.', price: 32, bg: 'bg-clay', icon: 'icon-flower' },
  { id: 'p2', cat: 'Sabonetes', title: 'Sabonete Alecrim & Menta', desc: 'Refrescante e revigorante. Perfeito para o banho matinal.', price: 28, bg: 'bg-moss', icon: 'icon-leaf' },
  { id: 'p3', cat: 'Banhos', title: 'Sais de Banho Relaxantes', desc: 'Sal de Epsom, flores de lavanda e camomila. Acompanha saquinho de algodão.', price: 45, bg: 'bg-honey', icon: 'icon-droplet' },
  { id: 'p4', cat: 'Óleos', title: 'Óleo Corporal Bifásico', desc: 'Nutrição profunda com toque seco. Mix de óleos de amêndoas e semente de uva.', price: 58, bg: 'bg-espresso', icon: 'icon-touch' }
];
let cart = [];
const toBRL = (val) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
function renderMassagens(data, containerId) {
  const container = document.getElementById(containerId);
  if(!container) return;
  container.innerHTML = data.map(item => `
    <div class="card-massagem">
      <div class="card-top">
        <div class="card-icon"><svg class="icon"><use href="#${item.icon}"/></svg></div>
        <div class="duration-tag"><svg class="icon"><use href="#icon-clock"/></svg> ${item.duration}</div>
      </div>
      <h3>${item.title}</h3>
      <p>${item.desc}</p>
      <div class="card-bottom">
        <div class="price"><small>R$</small>${item.price.toFixed(2).replace('.',',')}</div>
        <button class="btn btn-primary btn-sm" onclick="openBooking('${item.title}')">Agendar</button>
      </div>
    </div>
  `).join('');
}
function renderPacotes(data, containerId) {
  const container = document.getElementById(containerId);
  if(!container) return;
  container.innerHTML = data.map(item => `
    <div class="pacote-card ${item.featured ? 'featured' : ''}">
      ${item.featured ? '<div class="pacote-badge">Mais escolhido</div>' : ''}
      <div class="pacote-icon"><svg class="icon"><use href="#${item.icon}"/></svg></div>
      <div class="pacote-sessoes">${item.sessoes}</div>
      <div class="pacote-duracao">${item.duracao}</div>
      ${item.de ? `<div class="pacote-de">De R$ ${item.de.toFixed(2).replace('.',',')}</div>` : ''}
      <div class="pacote-por">${item.de ? 'por' : 'Valor da sessão'}</div>
      <div class="pacote-preco"><small>R$</small>${item.por.toFixed(2).replace('.',',')}</div>
      ${item.economia ? `<div class="pacote-economia">Economia de R$ ${item.economia}</div>` : ''}
      <button class="btn btn-primary btn-sm" style="margin-top:16px;width:100%;justify-content:center;" onclick="openBooking('${item.title} — ${item.sessoes}')">
        <svg class="icon"><use href="#icon-calendar"/></svg> Agendar
      </button>
    </div>
  `).join('');
}
function renderProdutos(data, containerId) {
  const container = document.getElementById(containerId);
  if(!container) return;
  container.innerHTML = data.map(item => `
    <div class="card-produto">
      <div class="produto-media ${item.bg}">
        <svg class="icon"><use href="#${item.icon}"/></svg>
      </div>
      <div class="produto-body">
        <span class="produto-cat">${item.cat}</span>
        <h3>${item.title}</h3>
        <p>${item.desc}</p>
        <div class="produto-footer">
          <div class="price"><small>R$</small>${item.price.toFixed(2).replace('.',',')}</div>
          <button class="add-btn" onclick="addToCart('${item.id}')" aria-label="Adicionar ao carrinho">
            <svg class="icon"><use href="#icon-plus"/></svg>
          </button>
        </div>
      </div>
    </div>
  `).join('');
}
const massagemFilterBtns = [
  { id: 'all', label: 'Todas' },
  { id: 'relax', label: 'Relaxamento' },
  { id: 'terap', label: 'Terapêuticas' },
  { id: 'dren', label: 'Drenagem & Modeladora' }
];
const produtoFilterBtns = [
  { id: 'all', label: 'Todos' },
  { id: 'Sabonetes', label: 'Sabonetes' },
  { id: 'Banhos', label: 'Banhos' },
  { id: 'Óleos', label: 'Óleos' }
];
function renderFilters(filters, containerId, target) {
  const container = document.getElementById(containerId);
  if(!container) return;
  container.innerHTML = filters.map(f => `
    <button class="chip ${f.id === 'all' ? 'is-active' : ''}" data-filter="${f.id}" data-target="${target}">
      ${f.label}
    </button>
  `).join('');
}
function initFilters() {
  document.querySelectorAll('.filter-row').forEach(row => {
    row.addEventListener('click', (e) => {
      if(e.target.classList.contains('chip')) {
        const rowBtns = row.querySelectorAll('.chip');
        rowBtns.forEach(b => b.classList.remove('is-active'));
        e.target.classList.add('is-active');
        const filterVal = e.target.getAttribute('data-filter');
        const target = e.target.getAttribute('data-target');
        if(target === 'massagens') {
          const filtered = filterVal === 'all' ? massagensData : massagensData.filter(m => m.cat === filterVal);
          renderMassagens(filtered, 'massagensGrid');
        } else if(target === 'produtos') {
          const filtered = filterVal === 'all' ? produtosData : produtosData.filter(p => p.cat === filterVal);
          renderProdutos(filtered, 'produtosGrid');
        }
      }
    });
  });
}
function initTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      const tabId = btn.getAttribute('data-tab');
      document.querySelectorAll('.tab-content').forEach(content => {
        content.style.display = 'none';
      });
      const activeContent = document.getElementById(`tab-${tabId}`);
      if(activeContent) activeContent.style.display = 'block';
    });
  });
}
function switchView(viewId) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  const viewEl = document.getElementById(`view-${viewId}`);
  if(viewEl) {
    viewEl.classList.add('active');
    document.querySelectorAll(`.nav-link[data-view-link="${viewId}"]`).forEach(l => l.classList.add('active'));
    window.scrollTo(0, 0);
    closeNav();
    setTimeout(checkReveal, 50);
  }
}
document.querySelectorAll('[data-view-link]').forEach(el => {
  el.addEventListener('click', (e) => {
    e.preventDefault();
    switchView(el.getAttribute('data-view-link'));
  });
});
const nav = document.getElementById('siteNav');
window.addEventListener('scroll', () => {
  if (window.scrollY > 50) nav.classList.add('is-scrolled');
  else nav.classList.remove('is-scrolled');
});
const navBurger = document.getElementById('navBurger');
const navLinks = document.getElementById('navLinks');
const navScrim = document.getElementById('navScrim');
function openNav() { navLinks.classList.add('is-open'); navScrim.classList.add('is-open'); }
function closeNav() { navLinks.classList.remove('is-open'); navScrim.classList.remove('is-open'); }
navBurger.addEventListener('click', openNav);
navScrim.addEventListener('click', closeNav);
const bookingOverlay = document.getElementById('bookingOverlay');
const bookingModal = document.getElementById('bookingModal');
const bookingCloseBtn = document.getElementById('bookingCloseBtn');
const bServiceSelect = document.getElementById('bService');
function openBooking(preselectedService = '') {
  const allServices = [
    ...massagensData.map(m => ({ title: m.title, price: m.price })),
    ...pacotesData.map(p => ({ title: `${p.title} — ${p.sessoes}`, price: p.por }))
  ];
  bServiceSelect.innerHTML = '<option value="" disabled selected>Selecione um serviço</option>' +
    allServices.map(s => `<option value="${s.title}">${s.title} — ${toBRL(s.price)}</option>`).join('');
  if(preselectedService) {
    const opts = Array.from(bServiceSelect.options);
    const match = opts.find(o => o.value === preselectedService);
    if(match) match.selected = true;
  }
  const timeSelect = document.getElementById('bTime');
  if(timeSelect.options.length === 0) {
    const times = ['09:00','10:30','13:30','15:00','16:30','18:00'];
    timeSelect.innerHTML = '<option value="" disabled selected>Escolha um horário</option>' +
      times.map(t => `<option value="${t}">${t}</option>`).join('');
  }
  const dateInput = document.getElementById('bDate');
  const today = new Date();
  const localToday = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().split('T')[0];
  dateInput.min = localToday;
  document.getElementById('bookingFormWrap').style.display = 'block';
  document.getElementById('bookingSuccess').classList.remove('show');
  bookingOverlay.classList.add('is-open');
  bookingModal.classList.add('is-open');
}
function closeBooking() {
  bookingOverlay.classList.remove('is-open');
  bookingModal.classList.remove('is-open');
}
bookingCloseBtn.addEventListener('click', closeBooking);
bookingOverlay.addEventListener('click', closeBooking);
document.getElementById('bookingDoneBtn').addEventListener('click', closeBooking);
document.getElementById('bookingForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const service = document.getElementById('bService').value;
  const date = document.getElementById('bDate').value;
  const time = document.getElementById('bTime').value;
  const name = document.getElementById('bName').value;
  const notes = document.getElementById('bNotes').value;
  const [y,m,d] = date.split('-');
  const formattedDate = `${d}/${m}/${y}`;
  let text = `Olá! Gostaria de agendar um atendimento.\n\n*Serviço:* ${service}\n*Data:* ${formattedDate} às ${time}\n*Nome:* ${name}`;
  if(notes) text += `\n*Obs:* ${notes}`;
  const encoded = encodeURIComponent(text);
  document.getElementById('bookingWhatsappLink').href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encoded}`;
  document.getElementById('bookingFormWrap').style.display = 'none';
  document.getElementById('bookingSuccess').classList.add('show');
  document.getElementById('bookingForm').reset();
});
document.getElementById('contactForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = document.getElementById('cName').value.trim();
  const phone = document.getElementById('cPhone').value.trim();
  const message = document.getElementById('cMsg').value.trim();
  const text = `Olá! Vim pelo site da Afago Bem-Estar.\n\n*Nome:* ${name}\n*WhatsApp:* ${phone}\n*Mensagem:* ${message}`;
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
  document.getElementById('contactWhatsappLink').href = url;
  e.target.style.display = 'none';
  document.getElementById('contactSuccess').classList.add('show');
});
function showToast(msg) {
  const t = document.getElementById('toast');
  document.getElementById('toastText').textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}
const cartOverlay = document.getElementById('cartOverlay');
const cartDrawer = document.getElementById('cartDrawer');
const cartCloseBtn = document.getElementById('cartCloseBtn');
function openCart() { updateCartUI(); cartOverlay.classList.add('is-open'); cartDrawer.classList.add('is-open'); }
function closeCart() { cartOverlay.classList.remove('is-open'); cartDrawer.classList.remove('is-open'); }
document.getElementById('cartOpenBtn').addEventListener('click', openCart);
cartCloseBtn.addEventListener('click', closeCart);
cartOverlay.addEventListener('click', closeCart);
window.addToCart = function(productId) {
  const prod = produtosData.find(p => p.id === productId);
  if(!prod) return;
  const existing = cart.find(item => item.id === productId);
  if(existing) existing.qty += 1;
  else cart.push({ ...prod, qty: 1 });
  updateCartBadge();
  showToast(`${prod.title} adicionado!`);
}
window.updateQty = function(productId, delta) {
  const item = cart.find(i => i.id === productId);
  if(!item) return;
  item.qty += delta;
  if(item.qty <= 0) cart = cart.filter(i => i.id !== productId);
  updateCartBadge();
  updateCartUI();
}
window.removeFromCart = function(productId) {
  cart = cart.filter(i => i.id !== productId);
  updateCartBadge();
  updateCartUI();
}
function updateCartBadge() {
  const badge = document.getElementById('cartBadge');
  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
  if(totalItems > 0) { badge.textContent = totalItems; badge.style.display = 'flex'; }
  else badge.style.display = 'none';
}
function updateCartUI() {
  const body = document.getElementById('cartBody');
  const foot = document.getElementById('cartFoot');
  if(cart.length === 0) {
    body.innerHTML = `
      <div class="cart-empty">
        <svg class="icon"><use href="#icon-bag"/></svg>
        <p>Seu carrinho está vazio.</p>
        <button class="btn btn-outline btn-sm" style="margin-top:24px" onclick="closeCart(); switchView('produtos')">Ver loja</button>
      </div>`;
    foot.innerHTML = '';
    return;
  }
  body.innerHTML = cart.map(item => `
    <div class="cart-item">
      <div class="cart-item-media ${item.bg}"><svg class="icon"><use href="#${item.icon}"/></svg></div>
      <div class="cart-item-info">
        <h4>${item.title}</h4>
        <div class="price">${toBRL(item.price)}</div>
        <div class="cart-item-actions">
          <div class="qty-stepper">
            <button onclick="updateQty('${item.id}', -1)" aria-label="Diminuir"><svg class="icon"><use href="#icon-minus"/></svg></button>
            <span>${item.qty}</span>
            <button onclick="updateQty('${item.id}', 1)" aria-label="Aumentar"><svg class="icon"><use href="#icon-plus"/></svg></button>
          </div>
          <button class="remove-link" onclick="removeFromCart('${item.id}')">
            <svg class="icon"><use href="#icon-trash"/></svg> Remover
          </button>
        </div>
      </div>
    </div>
  `).join('');
  const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  let wppText = "Olá! Gostaria de fazer um pedido dos seguintes produtos:\n\n";
  cart.forEach(item => { wppText += `- ${item.qty}x ${item.title} (${toBRL(item.price)})\n`; });
  wppText += `\n*Total: ${toBRL(total)}*`;
  const encodedUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(wppText)}`;
  foot.innerHTML = `
    <div class="cart-total-row"><span>Total</span><span class="price" style="color:var(--ink)">${toBRL(total)}</span></div>
    <a href="${encodedUrl}" target="_blank" rel="noopener" class="btn btn-primary btn-block">
      <svg class="icon"><use href="#icon-whatsapp"/></svg> Finalizar no WhatsApp
    </a>`;
}
function checkReveal() {
  const reveals = document.querySelectorAll('.reveal');
  const windowHeight = window.innerHeight;
  reveals.forEach(rev => {
    const revTop = rev.getBoundingClientRect().top;
    if (revTop < windowHeight - 100) rev.classList.add('is-visible');
  });
}
window.addEventListener('scroll', checkReveal);
document.addEventListener('DOMContentLoaded', () => {
  renderMassagens(massagensData.slice(0, 3), 'massagensPreview');
  renderProdutos(produtosData.slice(0, 4), 'produtosPreview');
  renderFilters(massagemFilterBtns, 'massagensFilters', 'massagens');
  renderMassagens(massagensData, 'massagensGrid');
  renderPacotes(pacotesData, 'pacotesGrid');
  renderFilters(produtoFilterBtns, 'produtosFilters', 'produtos');
  renderProdutos(produtosData, 'produtosGrid');
  initFilters();
  initTabs();
  document.getElementById('whatsappFloat').href = `https://wa.me/${WHATSAPP_NUMBER}?text=Olá! Vim pelo site da Afago Bem-Estar.`;
  setTimeout(checkReveal, 100);
});
