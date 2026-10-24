const fs = require('fs');

let html = fs.readFileSync('template_crm.html', 'utf8');
html = html
  .replace('__LEADS_DATA__', '{leads:[]}')
  .replaceAll('__SUPABASE_URL__', '')
  .replaceAll('__SUPABASE_ANON_KEY__', '')
  .replaceAll('__AGENCIA__', '')
  .replaceAll('__SEGMENTO__', 'geral');

const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
  .map(match => match[1])
  .filter(Boolean);

scripts.forEach(source => new Function(source));
console.log(`${scripts.length} scripts inline válidos`);
