const WHATSAPP = '5519999941805';
let PRODUCTS = [];
const SIZES = ['P','M','G','GG','Extra'];
const ALLOWED_SIZES = [...SIZES,'2','4','6','8','10','12','14','16'];
const escapeHTML=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let illustrative=false;
let activeCategory='all';
const money = cents => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(cents/100);
const $ = s => document.querySelector(s);
let cart = [], currentProduct = null, lastOrder = '', toastTimer;
const total = () => cart.reduce((sum,line)=>sum + PRODUCTS.find(p=>p.id===line.id).price * line.quantity,0);
function notify(text){$('#toast').textContent=text;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),3000);}
function renderProducts(category='all'){
  const visible=PRODUCTS.filter(p=>category==='all'||p.category===category);
  activeCategory=category;
  $('#products').classList.toggle('many-products',visible.length>=4);
  document.querySelectorAll('[data-category]').forEach(b=>{const active=b.dataset.category===category;b.classList.toggle('active',active);if(b.tagName==='BUTTON')b.setAttribute('aria-pressed',String(active));});
  $('#products').innerHTML=visible.map(p=>`<article class="product-card"><button class="product-photo" data-product="${p.id}" aria-label="Ver ${escapeHTML(p.name)}"><img src="${p.image}" alt="${escapeHTML(p.alt)}" width="900" height="1200" loading="lazy"><span class="product-badge">${escapeHTML(p.category)}</span></button><div class="product-meta"><h3>${escapeHTML(p.name)}</h3><strong>${money(p.price)}</strong></div><p class="product-category">${escapeHTML(p.color)} · ${(p.sizes||SIZES).map(escapeHTML).join(' / ')}</p><button class="button outline" data-product="${p.id}">Escolher tamanho</button></article>`).join('');
  $('#empty-category').hidden=visible.length>0;
  if(!visible.length){$('#empty-category h3').textContent=category==='Infantil'?'Peças infantis em breve':'Nenhuma peça nesta categoria';$('#empty-category p').textContent='Converse com a loja para consultar modelos e tamanhos disponíveis.';const link=$('#empty-category a');link.textContent='Consultar a loja';link.href='https://wa.me/5519999941805?text='+encodeURIComponent('Olá, Intense Moda! Gostaria de consultar roupas da categoria '+(category==='all'?'Todas':category)+'.');}
}
function openProduct(id){
  currentProduct=PRODUCTS.find(p=>p.id===id);if(!currentProduct)return;
  $('#product-title').textContent=currentProduct.name;$('#product-description').textContent=currentProduct.description||'';$('#product-description').hidden=!currentProduct.description;
  $('#product-category').textContent=currentProduct.category+' / '+currentProduct.color;
  $('#product-price').textContent=money(currentProduct.price);
  $('#product-image').src=currentProduct.image;$('#product-image').alt=currentProduct.alt;
  $('#product-dialog .muted').textContent=illustrative?'Produto ilustrativo. Disponibilidade a confirmar com a loja.':'Disponibilidade e medidas a confirmar com a loja.';
  $('#sizes').innerHTML=(currentProduct.sizes||SIZES).map(size=>`<label class="size-option"><input type="radio" name="size" value="${size}" required><span>${size}</span></label>`).join('');
  $('#product-quantity').value=1;$('#product-dialog').showModal();
}
function renderCart(){
  const count=cart.reduce((sum,line)=>sum+line.quantity,0);
  $('#bag-count').textContent=count;$('#open-cart').setAttribute('aria-label',`Abrir sacola, ${count} ${count===1?'item':'itens'}`);
  $('#cart-empty').hidden=cart.length>0;$('#cart-order').hidden=cart.length===0;
  $('#cart-total').textContent=money(total());
  $('#cart-items').innerHTML=cart.map((line,index)=>{
    const p=PRODUCTS.find(p=>p.id===line.id);
    return `<article class="cart-line"><img src="${p.image}" alt="${escapeHTML(p.name)}" width="72" height="96"><div><div class="cart-line-head"><h3>${escapeHTML(p.name)}</h3><button class="remove" data-remove="${index}" aria-label="Remover ${escapeHTML(p.name)}, tamanho ${line.size}">×</button></div><p>${escapeHTML(p.color)} · Tamanho ${line.size}</p><div class="cart-line-bottom"><div class="quantity-control"><button type="button" data-change="${index}" data-delta="-1" aria-label="Diminuir quantidade de ${escapeHTML(p.name)}" ${line.quantity<=1?'disabled':''}>−</button><span>${line.quantity}</span><button type="button" data-change="${index}" data-delta="1" aria-label="Aumentar quantidade de ${escapeHTML(p.name)}" ${line.quantity>=99?'disabled':''}>+</button></div><strong>${money(p.price*line.quantity)}</strong></div></div></article>`;
  }).join('');
  $('#order-status').hidden=true;
}
document.addEventListener('click',event=>{
  const product=event.target.closest('[data-product]');if(product){openProduct(product.dataset.product);return;}
  const close=event.target.closest('[data-close]');if(close){close.closest('dialog').close();return;}
  const category=event.target.closest('[data-category]');if(category){renderProducts(category.dataset.category);if(category.dataset.scroll==='true')$('#colecao').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth',block:'start'});return;}
  const remove=event.target.closest('[data-remove]');if(remove){cart.splice(Number(remove.dataset.remove),1);renderCart();notify('Peça removida da sacola.');return;}
  const change=event.target.closest('[data-change]');if(change){const line=cart[Number(change.dataset.change)];if(line){line.quantity=Math.max(1,Math.min(99,line.quantity+Number(change.dataset.delta)));renderCart();}return;}
});
$('#open-cart').addEventListener('click',()=>{$('#cart-dialog').showModal();});
document.querySelectorAll('dialog').forEach(dialog=>dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}}));
function adjustProductQuantity(delta){const el=$('#product-quantity');el.value=Math.max(1,Math.min(99,(Number(el.value)||1)+delta));}
$('#product-minus').addEventListener('click',()=>adjustProductQuantity(-1));$('#product-plus').addEventListener('click',()=>adjustProductQuantity(1));
$('#product-form').addEventListener('submit',event=>{
  event.preventDefault();const size=new FormData(event.target).get('size');const quantity=Number($('#product-quantity').value);
  if(!currentProduct||!ALLOWED_SIZES.includes(size)||!(currentProduct.sizes||SIZES).includes(size)||!Number.isInteger(quantity)||quantity<1||quantity>99)return;
  const existing=cart.find(line=>line.id===currentProduct.id&&line.size===size);
  if(existing&&existing.quantity+quantity>99){notify('Limite de 99 unidades por peça e tamanho.');return;}
  if(existing)existing.quantity+=quantity;else cart.push({id:currentProduct.id,size,quantity});
  renderCart();$('#product-dialog').close();notify(`${currentProduct.name} · ${size} adicionada à sacola`);
});
$('#payment-method').addEventListener('change',()=>{const credit=$('#payment-method').value==='Cartão de crédito';$('#installments-field').hidden=!credit;$('#payment-installments').disabled=!credit;if(!credit)$('#payment-installments').value='1';});
$('#order-form').addEventListener('submit',event=>{
  event.preventDefault();if(!cart.length)return;
  const data=new FormData(event.target);const name=String(data.get('name')).trim();const phone=String(data.get('phone')).trim();
  if(!name||phone.replace(/\D/g,'').length<10){notify('Confira seu nome e WhatsApp.');return;}
  const payment=String(data.get('payment')||'');const installments=Number(data.get('installments')||1);
  if(!['Pix','Cartão de débito','Cartão de crédito'].includes(payment)||!Number.isInteger(installments)||installments<1||installments>6){notify('Confira a forma de pagamento.');return;}
  const paymentSummary=payment==='Cartão de crédito'?`${payment} · ${installments===1?'à vista':installments+' vezes'} (juros e valores a confirmar com a loja)`:payment;
  const lines=cart.map(line=>{const p=PRODUCTS.find(p=>p.id===line.id);return `${line.quantity}x ${p.name} (${p.color})\nTamanho: ${line.size} · Unitário: ${money(p.price)} · Total: ${money(p.price*line.quantity)}`;});
  lastOrder=['Olá, Intense Moda! Gostaria de consultar este pedido.',...(illustrative?['PRÉVIA — produtos e valores ilustrativos.']:[]),'',...lines,'',`Subtotal dos produtos: ${money(total())}`,`Forma de pagamento escolhida: ${paymentSummary}`,'Retirada na loja. Não fazemos entrega.','Condições de pagamento e horário de retirada: a confirmar com a loja.','',`Nome: ${name}`,`WhatsApp: ${phone}`,'','Aguardo a confirmação de produtos, tamanhos, valores e disponibilidade.'].join('\n');
  window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(lastOrder)}`,'_blank','noopener');
  $('#order-status').hidden=false;
});
$('#copy-order').addEventListener('click',async()=>{if(!lastOrder)return;try{await navigator.clipboard.writeText(lastOrder);notify('Resumo do pedido copiado.');}catch{const area=document.createElement('textarea');area.value=lastOrder;$('#order-status').append(area);area.select();notify('Selecione e copie o resumo exibido.');}});
renderProducts();renderCart();
let catalogRevision=null, catalogLoading=false, lastCheck=0;
async function loadCatalog(){
  if(catalogLoading)return;
  catalogLoading=true;lastCheck=Date.now();
  try{
    const response=await fetch('/api/products',{cache:'no-store'});if(!response.ok)throw new Error('Catálogo indisponível');
    const data=await response.json();if(!Array.isArray(data.products))throw new Error('Catálogo inválido');
    const changed=catalogRevision!==data.revision;
    if(changed){
      const previous=PRODUCTS,hadCart=cart.length>0;
      PRODUCTS=data.products;catalogRevision=data.revision;illustrative=false;
      cart=cart.filter(line=>{const p=PRODUCTS.find(p=>p.id===line.id);return p&&(p.sizes||SIZES).includes(line.size);});
      renderProducts(activeCategory);renderCart();
      if(currentProduct&&$('#product-dialog').open){
        const p=PRODUCTS.find(p=>p.id===currentProduct.id);
        if(!p){$('#product-dialog').close();currentProduct=null;}
        else{const chosen=$('#sizes input:checked')?.value,quantity=$('#product-quantity').value;openProduct(p.id);$('#product-quantity').value=quantity;if(chosen){const input=Array.from($('#sizes').querySelectorAll('input')).find(i=>i.value===chosen);if(input)input.checked=true;}}
      }
      if(hadCart&&JSON.stringify(previous)!==JSON.stringify(PRODUCTS))notify('O catálogo foi atualizado. Confira os itens e valores da sacola.');
    }
    $('.preview-note').hidden=true;$('.small-note').textContent='';$('.preview-warning').textContent='Nenhum pagamento é realizado no site.';
  }catch{
    const note=$('.preview-note');note.hidden=false;note.textContent=catalogRevision===null?'Não foi possível carregar as roupas. Tente recarregar a página ou fale com a loja.':'Não foi possível atualizar o catálogo agora. Os dados exibidos são da última consulta.';
  }finally{catalogLoading=false;}
}
$('.preview-note').hidden=true;$('.small-note').textContent='';
loadCatalog();
// Check at most once per minute while the customer is active, to limit usage.
let lastActivity=Date.now();
for(const name of ['pointerdown','keydown','scroll'])window.addEventListener(name,()=>{lastActivity=Date.now();},{passive:true});
setInterval(()=>{if(!document.hidden&&Date.now()-lastActivity<5*60*1000)loadCatalog();},60000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden){lastActivity=Date.now();if(Date.now()-lastCheck>10000)loadCatalog();}});
window.addEventListener('focus',()=>{lastActivity=Date.now();if(Date.now()-lastCheck>10000)loadCatalog();});
