# Caçapava Locações e Vendas: novo site

Nova versão do site institucional **cacapavalocacoesevendas.com.br**, refeita fora do WordPress/Elementor.
O conteúdo é o mesmo do site atual: textos, fotos, produtos, vídeos, fichas técnicas em PDF, WhatsApp, Instagram e mapa.
O que mudou é o visual, agora mais moderno e com efeitos de movimento.

## O que tem no site

| Página | Endereço (igual ao site antigo) |
|---|---|
| Início | `/` |
| Locação (10 categorias) | `/locacao/` |
| Concretagem, Compactação, Furação e Demolição, Acesso e Elevação, Andaimes, Ferramentas Elétricas, Motores, Jardinagem, Limpeza, Outros | `/concretagem/`, `/compactacao/`, `/furacao-e-demolicao/`, `/acesso-a-elevacao/`, `/andaimes-2/`, `/ferramentas-eletricas/`, `/motores/`, `/jardinagem/`, `/limpeza/`, `/outros/` |
| Vendas (37 produtos, com busca e filtros) | `/vendas/` |
| Manutenção | `/manutencao/` |
| Contato | `/contato/` |
| Política de Privacidade | `/politica-de-privacidade/` |

Os endereços são **os mesmos do WordPress**. Assim os links que o Google já conhece continuam funcionando.

### Efeitos e recursos modernos
- Tela de carregamento com o logotipo.
- Rolagem suave (Lenis).
- Títulos que entram palavra por palavra, e blocos que surgem ao rolar a página (GSAP + ScrollTrigger).
- Topo em tela cheia com fotos da loja em transição lenta (efeito Ken Burns), mais os 3 atalhos: Vendas, Locação e Manutenção.
- Faixa amarela animada e carrossel infinito com as marcas parceiras.
- Fundo com parallax, contadores animados (5+, 3.000+, 500+) e um texto que se ilumina conforme a rolagem.
- "Mais procurados" com rolagem horizontal fixada no computador.
- Cartões com inclinação 3D e brilho que segue o mouse. Botões "magnéticos".
- Cabeçalho de vidro fosco que se esconde ao descer a página e volta ao subir. Menu de celular em tela cheia.
- Botão flutuante do WhatsApp.
- Quem configurou o aparelho para **reduzir movimento** vê o site sem animações (acessibilidade).

### Integrações
- **WhatsApp**: cada botão "Alugar", "Comprar" ou "Consultar" abre a conversa com a mensagem pronta, já com o nome do produto. Exemplo: *"Olá, vim do site e gostaria de alugar: Betoneira 400 Litros."*
- **Formulário de contato**: monta a mensagem e envia pelo WhatsApp ou por e-mail (`contato@cacapavalocacoes.com.br`). Não precisa de servidor nem de plugin.
- **Google Maps** com o endereço da loja.
- **YouTube**: os 7 vídeos do site antigo. Cada vídeo só carrega quando a pessoa clica, o que deixa o site mais rápido.
- **Fichas técnicas em PDF** dos produtos à venda, salvas dentro do próprio site.
- **Instagram**, telefone fixo e e-mail.
- **SEO**: título e descrição em cada página, Open Graph (prévia bonita quando o link é compartilhado no WhatsApp) e dados estruturados de empresa local (Schema.org).

## Como publicar

O site é estático: só HTML, CSS, JS e imagens. Não precisa de WordPress, PHP nem banco de dados.

1. **Hospedagem atual (cPanel, Hostinger etc.)**: envie todo o conteúdo da pasta `cacapava-site/` para a `public_html`, menos a pasta `_fonte/`. Faça um backup do WordPress antes.
2. **Netlify / Vercel / Cloudflare Pages (grátis)**: arraste a pasta `cacapava-site/` para o painel e depois aponte o domínio.

Para testar no computador antes de publicar:

```bash
cd cacapava-site
```

```bash
python3 -m http.server 8000
```

Depois abra http://localhost:8000.

## Como editar produtos e textos

Todo o conteúdo fica em `_fonte/catalogo.json`: categorias, produtos, descrições, fotos e PDFs.
Os textos fixos (telefones, endereço, depoimentos, "Quem somos") ficam no topo de `_fonte/gerar.py`.
Depois de editar, gere as páginas de novo:

```bash
python3 _fonte/gerar.py
```

Para adicionar um produto, copie um bloco existente em `catalogo.json`, troque `title`, `desc` e `cta` (`Alugar`, `Comprar` ou `Contato`), coloque a foto em `assets/img/` e aponte o campo `img` para ela.

## Observações sobre o site antigo
- Na página **Vendas** do site antigo, as fotos da "Motosserra 61" e da "Motosserra 120" estavam trocadas. Aqui elas foram corrigidas.
- A **Política de Privacidade** do WordPress tinha a palavra "166bet" (um site de apostas) no meio do texto. Isso costuma ser sinal de spam injetado no WordPress, então vale verificar a segurança da instalação antiga. Nesta versão o texto foi corrigido. Também saíram as menções ao Google AdSense, que o site não usa, e entrou uma explicação de como funcionam o formulário e os vídeos.
- O e-mail de contato (`@cacapavalocacoes.com.br`) usa um domínio diferente do site (`cacapavalocacoesevendas.com.br`). Foi mantido igual ao original, mas confirme se ele está ativo.
