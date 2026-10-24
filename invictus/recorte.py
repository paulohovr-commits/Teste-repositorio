#!/usr/bin/env python3
"""
Recorte da prospecção: quem prospecta, o quê e onde.

Todos os scripts leem daqui, então trocar de nicho ou de região é editar
o `.env` (ou os valores padrão abaixo), sem mexer em cada fase.

Padrão atual: Cris Márcia prospectando advogados em todo o estado de SP.
"""
from __future__ import annotations

import os
from pathlib import Path

BASE = Path(__file__).parent


def _carregar_env() -> None:
    env_path = BASE / ".env"
    if not env_path.exists():
        return
    try:
        from dotenv import load_dotenv
        load_dotenv(env_path)
    except ImportError:
        for line in env_path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, _, v = line.partition("=")
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


_carregar_env()


def _lista(nome: str, padrao: list[str]) -> list[str]:
    bruto = os.getenv(nome, "").strip()
    if not bruto:
        return padrao
    return [x.strip() for x in bruto.split(",") if x.strip()]


AGENCIA = os.getenv("AGENCIA", "").strip() or "Cris Márcia"
SEGMENTO = os.getenv("SEGMENTO", "").strip() or "advogados"
UF = (os.getenv("UF", "").strip() or "SP").upper()
CIDADE = os.getenv("CIDADE", "").strip() or "Estado de São Paulo"
REGIAO_EVITAR = _lista("REGIAO_EVITAR", [])

# Quantos leads entram no CRM (em lotes de 10 para os subagentes).
LEADS_ALVO = int(os.getenv("LEADS_ALVO", "100"))
# Teto por cidade, para o estado inteiro aparecer e não só a capital.
MAX_POR_CIDADE = int(os.getenv("MAX_POR_CIDADE", "12"))
# Páginas de 20 resultados por busca no Google Places (1 a 3).
MAX_PAGINAS = max(1, min(3, int(os.getenv("MAX_PAGINAS", "1"))))

DDDS_POR_UF = {
    "SP": {"11", "12", "13", "14", "15", "16", "17", "18", "19"},
    "RJ": {"21", "22", "24"},
    "MG": {"31", "32", "33", "34", "35", "37", "38"},
    "PR": {"41", "42", "43", "44", "45", "46"},
}
NOME_UF = {"SP": "SÃO PAULO", "RJ": "RIO DE JANEIRO", "MG": "MINAS GERAIS", "PR": "PARANÁ"}
DDDS = DDDS_POR_UF.get(UF, set())

# Retângulo que contém o estado, usado para o Google não devolver
# escritórios de outros estados.
CAIXA_UF = {
    "SP": {"low": {"latitude": -25.35, "longitude": -53.15}, "high": {"latitude": -19.75, "longitude": -44.15}},
}

# Cidades varridas no modo estado inteiro: capital, Grande SP, litoral
# e as sedes regionais do interior.
CIDADES_SP = [
    "São Paulo", "Guarulhos", "Osasco", "Santo André", "São Bernardo do Campo",
    "São Caetano do Sul", "Diadema", "Mauá", "Barueri", "Cotia", "Mogi das Cruzes",
    "Suzano", "Taboão da Serra", "Carapicuíba", "Itapevi", "Itaquaquecetuba",
    "Campinas", "Jundiaí", "Sorocaba", "Piracicaba", "Limeira", "Americana",
    "Indaiatuba", "Sumaré", "Hortolândia", "Itu", "Bragança Paulista", "Atibaia",
    "Rio Claro", "São Carlos", "Araraquara", "Ribeirão Preto", "Franca",
    "Barretos", "Catanduva", "São José do Rio Preto", "Araçatuba", "Presidente Prudente",
    "Marília", "Bauru", "Jaú", "Botucatu", "Ourinhos", "Assis", "Avaré",
    "Itapetininga", "Registro", "Santos", "São Vicente", "Praia Grande", "Guarujá",
    "São José dos Campos", "Jacareí", "Taubaté", "Guaratinguetá",
]
CIDADES = _lista("CIDADES", CIDADES_SP if UF == "SP" else [CIDADE])

# Buscas por cidade. {cidade} e {uf} são trocados pelo extrator.
CONSULTAS = _lista("CONSULTAS", [
    "escritório de advocacia em {cidade} {uf}",
    "advogado em {cidade} {uf}",
])

# Termos que aparecem no nome ou na categoria de quem é do nicho.
NICHE_TERMS = _lista("NICHE_TERMS", [
    "advoga", "advogad", "advocacia", "advocatício", "advocaticio", "adv.",
    "jurídic", "juridic", "direito", "law", "sociedade de advogados",
    "oab", "trabalhista", "previdenci", "tributári", "criminalista",
])
# Termos que tiram o lugar da lista (órgãos públicos e afins).
BLACKLIST_TERMS = _lista("BLACKLIST_TERMS", [
    "defensoria", "fórum", "forum", "tribunal", "ministério público", "ministerio publico",
    "procon", "prefeitura", "receita federal", "cartório", "cartorio", "tabelionato",
    "subseção", "subsecao", "seccional", "faculdade", "universidade", "curso",
    "despachante", "contabilidade", "contábil",
])


def cidade_de(endereco: str) -> str:
    """'R. X, 10 - Centro, Campinas - SP, 13010-000, Brasil' -> 'Campinas'."""
    import re
    m = re.search(r"(?:^|,)\s*([^,]+?)\s*-\s*" + UF + r"\b", endereco or "")
    return m.group(1).strip() if m else ""


def bairro_de(endereco: str) -> str:
    """'R. X, 10 - Centro, Campinas - SP, ...' -> 'Centro'."""
    import re
    m = re.search(r"-\s*([^,-]+?),\s*[^,]+?\s*-\s*" + UF + r"\b", endereco or "")
    return m.group(1).strip() if m else ""
