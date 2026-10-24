from __future__ import annotations

import unittest

import recorte
from extrator import calcular_nrl, telefone_para_whatsapp


class RecorteTests(unittest.TestCase):
    def test_cidade_e_bairro_do_endereco_google(self):
        end = "R. Barão de Jaguara, 1481 - Centro, Campinas - SP, 13015-002, Brasil"
        self.assertEqual(recorte.cidade_de(end), "Campinas")
        self.assertEqual(recorte.bairro_de(end), "Centro")

    def test_endereco_de_outro_estado_nao_vira_cidade(self):
        self.assertEqual(recorte.cidade_de("Rua B - Centro, Rio de Janeiro - RJ"), "")

    def test_celular_vira_whatsapp_e_fixo_nao(self):
        self.assertEqual(telefone_para_whatsapp("(11) 98765-4321"), ("5511987654321", True))
        self.assertEqual(telefone_para_whatsapp("(11) 3333-4444"), ("", False))

    def test_nrl_sem_presenca_e_zero(self):
        self.assertEqual(calcular_nrl("", 0, 0, None), 0)


if __name__ == "__main__":
    unittest.main()
