const WHATSAPP_NUMBER = "5511999999999";

const massagensData = [
  { id: 'm1', cat: 'relax', title: 'Massagem Relaxante', duration: '60 min', price: 120, desc: 'Movimentos suaves e contínuos com óleo essencial de lavanda. Ideal para alívio do estresse.', icon: 'icon-flower' },
  { id: 'm2', cat: 'relax', title: 'Relaxante c/ Pedras Quentes', duration: '90 min', price: 180, desc: 'O calor das pedras vulcânicas potencializa o relaxamento muscular profundo.', icon: 'icon-flame' },
  { id: 'm3', cat: 'terap', title: 'Massagem Terapêutica', duration: '60 min', price: 140, desc: 'Foco em pontos de tensão específicos. Mistura técnicas de liberação miofascial.', icon: 'icon-touch' },
  { id: 'm4', cat: 'terap', title: 'Reflexologia Podal', duration: '40 min', price: 90, desc: 'Pressão em pontos reflexos dos pés para reequilíbrio energético de todo o corpo.', icon: 'icon-droplet' },
  { id: 'm5', cat: 'dren', title: 'Drenagem Linfática', duration: '60 min', price: 130, desc: 'Ritmo lento e suave para reduzir retenção de líquidos e eliminar toxinas.', icon: 'icon-leaf' }
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
  { id: 'dren', label: 'Drenagem' }
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
  if (window.scrollY > 50) {
    nav.classList.add('is-scrolled');
  } else {
    nav.classList.remove('is-scrolled');
  }
});

const navBurger = document.getElementById('navBurger');
const navLinks = document.getElementById('navLinks');
const navScrim = document.getElementById('navScrim');

function openNav() {
  navLinks.classList.add('is-open');
  navScrim.classList.add('is-open');
}
function closeNav() {
  navLinks.classList.remove('is-open');
  navScrim.classList.remove('is-open');
}

navBurger.addEventListener('click', openNav);
navScrim.addEventListener('click', closeNav);

const bookingOverlay = document.getElementById('bookingOverlay');
const bookingModal = document.getElementById('bookingModal');
const bookingCloseBtn = document.getElementById('bookingCloseBtn');
const bServiceSelect = document.getElementById('bService');

function openBooking(preselectedService = '') {
  bServiceSelect.innerHTML = '<option value="" disabled selected>Selecione uma massagem</option>' +
    massagensData.map(m => `<option value="${m.title}">${m.title} — ${toBRL(m.price)}</option>`).join('');

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

  let text = `Olá! Gostaria de agendar uma massagem.\n\n*Serviço:* ${service}\n*Data:* ${formattedDate} às ${time}\n*Nome:* ${name}`;
  if(notes) text += `\n*Obs:* ${notes}`;

  const encoded = encodeURIComponent(text);
  document.getElementById('bookingWhatsappLink').href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encoded}`;

  document.getElementById('bookingFormWrap').style.display = 'none';
  document.getElementById('bookingSuccess').classList.add('show');
  document.getElementById('bookingForm').reset();
});

document.getElementById('contactForm').addEventListener('submit', (e) => {
  e.preventDefault();
  e.target.style.display = 'none';
  document.getElementById('contactSuccess').classList.add('show');
  e.target.reset();
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

function openCart() {
  updateCartUI();
  cartOverlay.classList.add('is-open');
  cartDrawer.classList.add('is-open');
}
function closeCart() {
  cartOverlay.classList.remove('is-open');
  cartDrawer.classList.remove('is-open');
}

document.getElementById('cartOpenBtn').addEventListener('click', openCart);
cartCloseBtn.addEventListener('click', closeCart);
cartOverlay.addEventListener('click', closeCart);

window.addToCart = function(productId) {
  const prod = produtosData.find(p => p.id === productId);
  if(!prod) return;

  const existing = cart.find(item => item.id === productId);
  if(existing) {
    existing.qty += 1;
  } else {
    cart.push({ ...prod, qty: 1 });
  }
  updateCartBadge();
  showToast(`${prod.title} adicionado!`);
}

window.updateQty = function(productId, delta) {
  const item = cart.find(i => i.id === productId);
  if(!item) return;
  item.qty += delta;
  if(item.qty <= 0) {
    cart = cart.filter(i => i.id !== productId);
  }
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
  if(totalItems > 0) {
    badge.textContent = totalItems;
    badge.style.display = 'flex';
  } else {
    badge.style.display = 'none';
  }
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
      </div>
    `;
    foot.innerHTML = '';
    return;
  }

  body.innerHTML = cart.map(item => `
    <div class="cart-item">
      <div class="cart-item-media ${item.bg}">
        <svg class="icon"><use href="#${item.icon}"/></svg>
      </div>
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
    <div class="cart-total-row">
      <span>Total</span>
      <span class="price" style="color:var(--ink)">${toBRL(total)}</span>
    </div>
    <a href="${encodedUrl}" target="_blank" rel="noopener" class="btn btn-primary btn-block">
      <svg class="icon"><use href="#icon-whatsapp"/></svg> Finalizar no WhatsApp
    </a>
  `;
}

function checkReveal() {
  const reveals = document.querySelectorAll('.reveal');
  const windowHeight = window.innerHeight;
  const revealPoint = 100;

  reveals.forEach(rev => {
    const revTop = rev.getBoundingClientRect().top;
    if (revTop < windowHeight - revealPoint) {
      rev.classList.add('is-visible');
    }
  });
}
window.addEventListener('scroll', checkReveal);

document.addEventListener('DOMContentLoaded', () => {
  renderMassagens(massagensData.slice(0, 3), 'massagensPreview');
  renderProdutos(produtosData.slice(0, 4), 'produtosPreview');

  renderFilters(massagemFilterBtns, 'massagensFilters', 'massagens');
  renderMassagens(massagensData, 'massagensGrid');

  renderFilters(produtoFilterBtns, 'produtosFilters', 'produtos');
  renderProdutos(produtosData, 'produtosGrid');

  initFilters();

  document.getElementById('whatsappContactLink').href = `https://wa.me/${WHATSAPP_NUMBER}?text=Olá! Gostaria de mais informações.`;
  document.getElementById('whatsappFloat').href = `https://wa.me/${WHATSAPP_NUMBER}?text=Olá!`;

  setTimeout(checkReveal, 100);
});