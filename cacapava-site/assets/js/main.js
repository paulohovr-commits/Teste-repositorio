/* Caçapava Locações e Vendas — interações e animações
   Bibliotecas: GSAP + ScrollTrigger (animações), Lenis (rolagem suave).
   Tudo funciona sem as bibliotecas (o conteúdo nunca fica escondido). */
(function () {
  'use strict';
  var doc = document.documentElement;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  var hasGsap = !!(window.gsap && window.ScrollTrigger);
  var animate = hasGsap && !reduce;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  if (!animate) doc.classList.remove('anim');
  if (hasGsap) gsap.registerPlugin(ScrollTrigger);

  /* ---------- ano no rodapé */
  $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* ---------- rolagem suave */
  var lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new Lenis({ duration: 1.15, easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); } });
    if (hasGsap) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
      gsap.ticker.lagSmoothing(0);
    } else {
      var raf = function (t) { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
    $$('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (ev) {
        var id = a.getAttribute('href');
        if (id.length > 1 && $(id)) { ev.preventDefault(); lenis.scrollTo(id, { offset: -90 }); }
      });
    });
  }

  /* ---------- cabeçalho: muda ao rolar e se esconde ao descer */
  var header = $('[data-header]');
  var lastY = 0;
  function onScroll() {
    var y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 40);
    var menuOpen = document.body.classList.contains('menu-open');
    header.classList.toggle('is-hidden', !menuOpen && y > 400 && y > lastY + 4);
    if (y < lastY - 4 || y < 400) header.classList.remove('is-hidden');
    lastY = y;
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- menu móvel */
  var burger = $('[data-burger]');
  function setMenu(open) {
    document.body.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    if (lenis) open ? lenis.stop() : lenis.start();
    if (open && animate) {
      gsap.fromTo('.mobile-menu nav > *', { y: 30, opacity: 0 }, { y: 0, opacity: 1, stagger: .05, duration: .7, delay: .2, ease: 'expo.out' });
    }
  }
  burger.addEventListener('click', function () { setMenu(!document.body.classList.contains('menu-open')); });
  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') setMenu(false); });
  $$('.mobile-menu a').forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });

  /* ---------- carrossel do topo (fotos da loja) */
  var slides = $$('.hero-slide');
  var dots = $$('[data-hero-dots] button');
  if (slides.length > 1) {
    var cur = 0, timer;
    var go = function (n) {
      slides[cur].classList.remove('is-active'); if (dots[cur]) dots[cur].classList.remove('is-active');
      cur = (n + slides.length) % slides.length;
      var img = $('img', slides[cur]); if (img) img.loading = 'eager';
      slides[cur].classList.add('is-active'); if (dots[cur]) dots[cur].classList.add('is-active');
    };
    var play = function () { clearInterval(timer); timer = setInterval(function () { go(cur + 1); }, 5500); };
    dots.forEach(function (d, i) { d.addEventListener('click', function () { go(i); play(); }); });
    if (!reduce) play();
  }

  /* ---------- vídeos do YouTube (carregam só ao clicar) */
  $$('[data-yt]').forEach(function (b) {
    b.addEventListener('click', function () {
      var f = document.createElement('iframe');
      f.src = 'https://www.youtube-nocookie.com/embed/' + b.dataset.yt + '?autoplay=1&rel=0';
      f.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen';
      f.allowFullscreen = true;
      f.title = 'Vídeo';
      b.innerHTML = ''; b.appendChild(f); b.style.cursor = 'default';
    }, { once: true });
  });

  /* ---------- filtro e busca de produtos */
  var grid = $('[data-grid]');
  if (grid && $('[data-search]')) {
    var cards = $$('[data-card]', grid);
    var input = $('[data-search]');
    var chipBtns = $$('[data-filter]');
    var empty = $('[data-empty]');
    var tag = '*';
    var norm = function (s) { return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); };
    var apply = function () {
      var q = norm(input.value.trim()), shown = 0;
      cards.forEach(function (c) {
        var ok = (tag === '*' || (' ' + c.dataset.tags + ' ').indexOf(' ' + tag + ' ') > -1) && (!q || norm(c.dataset.name).indexOf(q) > -1);
        c.hidden = !ok; if (ok) shown++;
      });
      empty.hidden = shown > 0;
      if (animate) {
        gsap.fromTo(cards.filter(function (c) { return !c.hidden; }), { opacity: 0, y: 24 }, { opacity: 1, y: 0, stagger: .03, duration: .5, ease: 'power3.out', overwrite: true });
        ScrollTrigger.refresh();
      }
    };
    input.addEventListener('input', apply);
    chipBtns.forEach(function (b) {
      b.addEventListener('click', function () {
        chipBtns.forEach(function (x) { x.classList.toggle('is-active', x === b); });
        tag = b.dataset.filter; apply();
      });
    });
  }

  /* ---------- formulário de contato → WhatsApp ou e-mail */
  var form = $('[data-form]');
  if (form) {
    var via = 'whats';
    $$('button[type="submit"]', form).forEach(function (b) { b.addEventListener('click', function () { via = b.dataset.via || 'whats'; }); });
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var d = new FormData(form);
      var linhas = [
        'Olá, vim do site e gostaria de um orçamento.',
        '',
        '*Nome:* ' + d.get('nome'),
        d.get('email') ? '*E-mail:* ' + d.get('email') : '',
        d.get('telefone') ? '*Telefone:* ' + d.get('telefone') : '',
        '*Serviço:* ' + d.get('servico'),
        '',
        d.get('mensagem')
      ].filter(function (l, i) { return l !== '' || i === 1 || i === 6; });
      var txt = linhas.join('\n');
      if (via === 'email') {
        location.href = 'mailto:' + form.dataset.email + '?subject=' + encodeURIComponent('Orçamento pelo site – ' + d.get('servico')) + '&body=' + encodeURIComponent(txt.replace(/\*/g, ''));
      } else {
        window.open('https://wa.me/' + form.dataset.whats + '?text=' + encodeURIComponent(txt), '_blank', 'noopener');
      }
    });
  }

  /* ---------- brilho que segue o mouse nos cartões de categoria */
  if (finePointer) {
    $$('.cat, .cat-card').forEach(function (el) {
      el.addEventListener('pointermove', function (ev) {
        var r = el.getBoundingClientRect();
        el.style.setProperty('--mx', (ev.clientX - r.left) + 'px');
        el.style.setProperty('--my', (ev.clientY - r.top) + 'px');
      });
    });
  }

  /* ---------- fim do carregamento */
  function loaded() {
    doc.classList.add('is-loaded');
    document.body.classList.add('is-loaded');
    if (animate) intro();
  }
  if (document.readyState === 'complete') setTimeout(loaded, 300);
  else window.addEventListener('load', function () { setTimeout(loaded, 300); });
  setTimeout(function () { if (!doc.classList.contains('is-loaded')) loaded(); }, 2500);

  if (!animate) { countersStatic(); return; }

  /* ======================================================================
     A partir daqui: animações com GSAP
     ====================================================================== */

  /* divide títulos em palavras */
  $$('[data-split]').forEach(function (el) {
    var walk = function (node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            var w = document.createElement('span'); w.className = 'word';
            var i = document.createElement('span'); i.textContent = part;
            w.appendChild(i); frag.appendChild(w);
          });
          n.parentNode.replaceChild(frag, n);
        } else if (n.nodeType === 1) walk(n);
      });
    };
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    walk(el);
    $$('.word', el).forEach(function (w) { w.setAttribute('aria-hidden', 'true'); });
    el.classList.add('split-ready');
  });

  var heroSplit = $('.hero [data-split], .page-hero [data-split]');

  function intro() {
    var tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.from('.nav-in', { y: -30, opacity: 0, duration: 1 }, 0);
    if (heroSplit) tl.from($$('.word > span', heroSplit), { yPercent: 110, rotate: 4, duration: 1.2, stagger: .06 }, .1);
    var heroBits = $$('.hero [data-reveal], .page-hero [data-reveal]');
    if (heroBits.length) tl.to(heroBits, { opacity: 1, y: 0, duration: 1, stagger: .08, startAt: { y: 24 } }, .35);
    var heroStag = $$('.hero [data-stagger] > *');
    if (heroStag.length) tl.to(heroStag, { opacity: 1, y: 0, duration: 1, stagger: .1, startAt: { y: 40 }, clearProps: 'transform' }, .55);
    if ($('.hero-media')) tl.from('.hero-media', { scale: 1.15, duration: 2.2, ease: 'power3.out' }, 0);
  }

  /* títulos ao rolar */
  $$('[data-split]').forEach(function (el) {
    if (el === heroSplit) return;
    gsap.from($$('.word > span', el), {
      yPercent: 110, rotate: 3, duration: 1.1, ease: 'expo.out', stagger: .05,
      scrollTrigger: { trigger: el, start: 'top 88%', once: true }
    });
  });

  /* elementos que aparecem */
  ScrollTrigger.batch($$('[data-reveal]').filter(function (el) { return !el.closest('.hero, .page-hero'); }), {
    start: 'top 90%', once: true,
    onEnter: function (els) { gsap.fromTo(els, { opacity: 0, y: 36 }, { opacity: 1, y: 0, duration: 1, stagger: .1, ease: 'expo.out' }); }
  });

  /* grupos em cascata */
  $$('[data-stagger]').forEach(function (g) {
    if (g.closest('.hero')) return;
    gsap.fromTo(g.children, { opacity: 0, y: 50, scale: .97 }, {
      opacity: 1, y: 0, scale: 1, duration: 1, stagger: .07, ease: 'expo.out',
      scrollTrigger: { trigger: g, start: 'top 88%', once: true }
    });
  });

  /* grade de produtos: cada cartão entra ao aparecer */
  gsap.set('[data-card]', { opacity: 0 });
  ScrollTrigger.batch('[data-card]', {
    start: 'top 92%', once: true,
    onEnter: function (els) { gsap.fromTo(els, { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: .9, stagger: .08, ease: 'expo.out' }); }
  });

  /* parallax */
  $$('[data-parallax]').forEach(function (el) {
    var amt = parseFloat(el.dataset.parallax) || 10;
    gsap.fromTo(el, { yPercent: -amt / 2 }, {
      yPercent: amt / 2, ease: 'none',
      scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true }
    });
  });

  /* texto que "acende" palavra por palavra */
  $$('[data-highlight]').forEach(function (el) {
    var words = el.textContent.trim().split(/\s+/);
    el.innerHTML = words.map(function (w) { return '<span class="w">' + w + '</span>'; }).join(' ');
    gsap.to($$('.w', el), {
      opacity: 1, stagger: .1, ease: 'none',
      scrollTrigger: { trigger: el, start: 'top 80%', end: 'bottom 45%', scrub: true }
    });
  });

  /* contadores */
  $$('[data-count]').forEach(function (el) {
    var end = parseFloat(el.dataset.count), suf = el.dataset.suffix || '', obj = { v: 0 };
    el.textContent = '0' + suf;
    gsap.to(obj, {
      v: end, duration: 2.2, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 90%', once: true },
      onUpdate: function () { el.textContent = Math.round(obj.v).toLocaleString('pt-BR') + suf; }
    });
  });

  /* "Mais procurados": rolagem horizontal fixada (desktop) */
  var mm = gsap.matchMedia();
  mm.add('(min-width: 1024px)', function () {
    var sec = $('[data-hscroll]'), track = $('[data-hscroll-track]');
    if (!sec || !track) return;
    var dist = function () { return Math.max(0, track.scrollWidth - window.innerWidth + 120); };
    if (dist() < 40) return;
    sec.classList.add('is-hscroll');
    gsap.to(track, {
      x: function () { return -dist(); }, ease: 'none',
      scrollTrigger: { trigger: sec, start: 'top top', end: function () { return '+=' + dist(); }, scrub: 1, pin: true, invalidateOnRefresh: true }
    });
    return function () { sec.classList.remove('is-hscroll'); };
  });

  /* faixa amarela acelera com a rolagem */
  var mq = $('.marquee-track');
  if (mq) {
    gsap.to('.marquee', {
      xPercent: -6, ease: 'none',
      scrollTrigger: { trigger: '.marquee', start: 'top bottom', end: 'bottom top', scrub: true }
    });
  }

  /* botões magnéticos e cartões com inclinação 3D (só com mouse) */
  if (finePointer) {
    $$('[data-magnetic]').forEach(function (el) {
      el.addEventListener('pointermove', function (ev) {
        var r = el.getBoundingClientRect();
        el.style.setProperty('--bx', ((ev.clientX - r.left - r.width / 2) * .25) + 'px');
        el.style.setProperty('--by', ((ev.clientY - r.top - r.height / 2) * .35) + 'px');
      });
      el.addEventListener('pointerleave', function () { el.style.setProperty('--bx', '0px'); el.style.setProperty('--by', '0px'); });
      el.style.transition += ', transform .4s cubic-bezier(.22,1,.36,1)';
    });
    $$('[data-tilt]').forEach(function (el) {
      var rx = gsap.quickTo(el, 'rotationX', { duration: .6, ease: 'power3' });
      var ry = gsap.quickTo(el, 'rotationY', { duration: .6, ease: 'power3' });
      gsap.set(el, { transformPerspective: 900 });
      el.addEventListener('pointermove', function (ev) {
        var r = el.getBoundingClientRect();
        ry(((ev.clientX - r.left) / r.width - .5) * 8);
        rx(-((ev.clientY - r.top) / r.height - .5) * 8);
      });
      el.addEventListener('pointerleave', function () { rx(0); ry(0); });
    });
  }

  window.addEventListener('load', function () { ScrollTrigger.refresh(); });

  function countersStatic() { /* sem animação: números já estão no HTML */ }
})();
