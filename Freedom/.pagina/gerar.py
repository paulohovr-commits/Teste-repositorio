"""Monta a página de leitura do caderno (Freedom/.pagina/caderno.html) a partir do CADERNO-DE-DESABAFOS.md.

Uso: python3 Freedom/.pagina/gerar.py
Depois, publique Freedom/.pagina/caderno.html no mesmo endereço do Claude (ver Freedom/CLAUDE.md).
"""
import datetime
import pathlib

pasta = pathlib.Path(__file__).resolve().parent
md = (pasta.parent / "CADERNO-DE-DESABAFOS.md").read_text(encoding="utf-8")
md = md.replace("</script", "<\\/script")  # não deixa o texto fechar a tag por engano
html = (pasta / "modelo.html").read_text(encoding="utf-8")
html = html.replace("<!--CADERNO-->", md).replace("<!--DATA-->", datetime.date.today().strftime("%d/%m/%Y"))
(pasta / "caderno.html").write_text(html, encoding="utf-8")
print("ok:", pasta / "caderno.html")
