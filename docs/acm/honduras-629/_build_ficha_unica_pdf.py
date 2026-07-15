# -*- coding: utf-8 -*-
"""Gera FICHA-UNICA-HONDURAS-629-EXPORT-20260713.pdf com marca Grok."""
from pathlib import Path

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor, white
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    HRFlowable,
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent / "FICHA-UNICA-HONDURAS-629-EXPORT-20260713.pdf"

pdfmetrics.registerFont(TTFont("Arial", r"C:\Windows\Fonts\arial.ttf"))
pdfmetrics.registerFont(TTFont("ArialBold", r"C:\Windows\Fonts\arialbd.ttf"))

# Grok / xAI-inspired palette
GROK_BG = HexColor("#0B0F14")
GROK_ACCENT = HexColor("#1A9FFF")
GROK_MUTED = HexColor("#8B95A5")
GROK_LINE = HexColor("#2A3340")
GROK_SOFT = HexColor("#F4F6F8")
GROK_WARN_BG = HexColor("#FEF2F2")
GROK_WARN = HexColor("#B91C1C")
TEXT = HexColor("#111827")
TEXT2 = HexColor("#374151")

PAGE_W, PAGE_H = A4
MARGIN_L = 16 * mm
MARGIN_R = 16 * mm
MARGIN_T = 22 * mm
MARGIN_B = 18 * mm


def draw_header_footer(c: canvas.Canvas, doc):
    c.saveState()
    c.setFillColor(GROK_BG)
    c.rect(0, PAGE_H - 14 * mm, PAGE_W, 14 * mm, fill=1, stroke=0)
    c.setFillColor(white)
    c.setFont("ArialBold", 11)
    c.drawString(MARGIN_L, PAGE_H - 9 * mm, "Grok")
    c.setFont("Arial", 7)
    c.setFillColor(GROK_ACCENT)
    c.drawString(MARGIN_L + 28, PAGE_H - 9 * mm, "xAI")
    c.setFillColor(GROK_MUTED)
    c.setFont("Arial", 7)
    c.drawRightString(
        PAGE_W - MARGIN_R,
        PAGE_H - 9 * mm,
        "Ficha unica · Honduras 629 · material interno",
    )
    c.setStrokeColor(GROK_ACCENT)
    c.setLineWidth(1.2)
    c.line(0, PAGE_H - 14 * mm, PAGE_W, PAGE_H - 14 * mm)
    c.setStrokeColor(GROK_LINE)
    c.setLineWidth(0.4)
    c.line(MARGIN_L, 12 * mm, PAGE_W - MARGIN_R, 12 * mm)
    c.setFont("Arial", 7)
    c.setFillColor(GROK_MUTED)
    c.drawString(
        MARGIN_L,
        7 * mm,
        "Gerado com Grok · 13/07/2026 · nao e parecer juridico nem laudo de avaliacao",
    )
    c.drawRightString(PAGE_W - MARGIN_R, 7 * mm, str(doc.page))
    c.restoreState()


def S(name, **kw):
    base = dict(fontName="Arial", fontSize=9, leading=12, textColor=TEXT)
    base.update(kw)
    return ParagraphStyle(name, **base)


st_title = S(
    "t",
    fontName="ArialBold",
    fontSize=16,
    leading=20,
    textColor=GROK_BG,
    spaceAfter=4,
)
st_sub = S("sub", fontSize=8.5, leading=11, textColor=TEXT2, spaceAfter=8)
st_h1 = S(
    "h1",
    fontName="ArialBold",
    fontSize=11,
    leading=14,
    textColor=GROK_BG,
    spaceBefore=10,
    spaceAfter=5,
)
st_h2 = S(
    "h2",
    fontName="ArialBold",
    fontSize=9.5,
    leading=12,
    textColor=GROK_ACCENT,
    spaceBefore=7,
    spaceAfter=3,
)
st_body = S("b", fontSize=8.5, leading=11.5, textColor=TEXT2, spaceAfter=4)
st_cell = S("cell", fontSize=7.5, leading=9.5, textColor=TEXT)
st_cell_b = S("cellb", fontName="ArialBold", fontSize=7.5, leading=9.5, textColor=TEXT)
st_warn = S("warn", fontSize=8, leading=11, textColor=GROK_WARN, fontName="ArialBold")
st_quote = S("q", fontSize=8, leading=11, textColor=TEXT2, leftIndent=6, rightIndent=6)


def P(text, style=st_body):
    return Paragraph(text.replace("\n", "<br/>"), style)


def kv_table(rows, col1=42 * mm):
    col2 = PAGE_W - MARGIN_L - MARGIN_R - col1
    data = [
        [Paragraph(str(k), st_cell_b), Paragraph(str(v), st_cell)] for k, v in rows
    ]
    t = Table(data, colWidths=[col1, col2])
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, -1), GROK_SOFT),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                ("GRID", (0, 0), (-1, -1), 0.3, GROK_LINE),
                ("BOX", (0, 0), (-1, -1), 0.6, GROK_LINE),
            ]
        )
    )
    return t


def grid_table(headers, rows, col_widths):
    head = [
        Paragraph(f'<font color="white"><b>{h}</b></font>', st_cell) for h in headers
    ]
    body = [[Paragraph(str(c), st_cell) for c in r] for r in rows]
    data = [head] + body
    t = Table(data, colWidths=col_widths, repeatRows=1)
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), GROK_BG),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 4),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                ("GRID", (0, 0), (-1, -1), 0.3, GROK_LINE),
                ("BOX", (0, 0), (-1, -1), 0.6, GROK_LINE),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [white, GROK_SOFT]),
            ]
        )
    )
    return t


def banner(text, bg=GROK_WARN_BG, fg=GROK_WARN):
    p = Paragraph(
        text,
        ParagraphStyle(
            "ban",
            fontName="ArialBold",
            fontSize=8,
            leading=10.5,
            textColor=fg,
            alignment=TA_CENTER,
        ),
    )
    t = Table([[p]], colWidths=[PAGE_W - MARGIN_L - MARGIN_R])
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), bg),
                ("BOX", (0, 0), (-1, -1), 1, fg),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    return t


def section_rule():
    return HRFlowable(
        width="100%", thickness=0.6, color=GROK_LINE, spaceBefore=2, spaceAfter=4
    )


def main():
    usable = PAGE_W - MARGIN_L - MARGIN_R
    story = []

    story.append(P("FICHA UNICA — Rua Honduras, 629", st_title))
    story.append(
        P(
            "Jardins / Sao Paulo · Matricula 116.360 (4o RI-SP) · RE/MAX Galeria",
            st_sub,
        )
    )
    story.append(
        banner(
            "MATERIAL INTERNO — validar com supervisao RE/MAX e advogado antes do cliente. "
            "Nao e parecer juridico nem laudo de avaliacao. Confirmacoes pendentes em certidao 2026."
        )
    )
    story.append(Spacer(1, 4 * mm))

    story.append(
        kv_table(
            [
                ("Caso", "Honduras 629"),
                ("Consultora", "Luciana Borba · RE/MAX Galeria · CRECI 045063-J"),
                ("Emissao da ficha", "13/07/2026"),
                (
                    "Interlocutora comercial",
                    "Clarisia Ramos (herdeira — nao proprietaria exclusiva)",
                ),
                ("Gerado com", "<b>Grok (xAI)</b> · auditoria e consolidacao operacional"),
            ],
            38 * mm,
        )
    )

    # §1
    story.append(P("1. Identificacao do imovel", st_h1))
    story.append(section_rule())
    story.append(
        kv_table(
            [
                (
                    "Endereco",
                    "Rua Honduras, n&ordm; <b>629</b> — Jardim Paulista / Jardim America (fronteira), Sao Paulo–SP",
                ),
                (
                    "Matricula",
                    "<b>116.360</b> — 4&ordm; Oficial de Registro de Imoveis de SP",
                ),
                ("SQL / contribuinte", "<b>014.071.0030-0</b>"),
                (
                    "Terreno",
                    "<b>1.050 m&sup2;</b> (21,00 m frente &times; 50,00 m fundos)",
                ),
                ("Lote / quadra", "Lote <b>13</b>, quadra <b>11</b>"),
                ("Loteamento (planta)", "Companhia de Imoveis e Construcoes"),
                (
                    "Area construida averbada",
                    "<b>441,00 m&sup2;</b> (Av.03 de 31/10/1996)",
                ),
                ("Area anunciada (sem suporte oficial)", "800 m&sup2;"),
                (
                    "Area fisica estimada (satelite — NAO oficial)",
                    "~736 m&sup2; (ha divergencia de medicao; reabrir com RT)",
                ),
                (
                    "Cadastro fiscal GeoSampa (13/07/2026)",
                    "Terreno <b>1.050 m&sup2;</b> · Construida <b>441 m&sup2;</b> · ATIVO · Residencial",
                ),
                (
                    "Certidao de matricula em maos",
                    "Expedida <b>01/02/2023</b> · situacao ate <b>30/01/2023</b> · <b>vencida</b> para escritura",
                ),
            ],
            48 * mm,
        )
    )
    story.append(Spacer(1, 3 * mm))
    story.append(P("Historico registral de area", st_h2))
    story.append(
        grid_table(
            ["Ato", "Data", "Conteudo"],
            [
                ["Av.02", "31/10/1996", "Demolicao da casa de <b>508,30 m&sup2;</b>"],
                [
                    "Av.03",
                    "31/10/1996",
                    "Construcao averbada de <b>441,00 m&sup2;</b>",
                ],
                ["Depois", "ate 30/01/2023", "<b>Nenhuma</b> averbacao de ampliacao"],
            ],
            [22 * mm, 28 * mm, usable - 50 * mm],
        )
    )

    # §2
    story.append(P("2. Pessoas e sucessao", st_h1))
    story.append(section_rule())
    story.append(P("2.1 Na matricula (ate 30/01/2023)", st_h2))
    story.append(
        kv_table(
            [
                (
                    "Titulares (R.08 / Av.09)",
                    "<b>Dennis D'Araujo Moniz Ramos</b> + <b>Ermantina Viscardi Moniz Ramos</b>",
                ),
                (
                    "Regime de bens",
                    "<b>Comunhao universal</b> (pre-Lei 6.515/77)",
                ),
                (
                    "Aquisicao",
                    "R$ 1.000.000 (escritura 07/06/2006, registrada 28/10/2011)",
                ),
            ],
            42 * mm,
        )
    )
    story.append(P("2.2 Situacao familiar informada (operador — documentar)", st_h2))
    story.append(
        grid_table(
            ["Pessoa", "Situacao", "Papel"],
            [
                [
                    "<b>Ermantina Viscardi Moniz Ramos</b>",
                    "Falecida ha ~<b>8 anos</b> (~2018)",
                    "Ex-titular; obito a averbar",
                ],
                [
                    "<b>Dennis D'Araujo Moniz Ramos</b>",
                    "<b>Vivo</b> (confirmado)",
                    "Meeiro / titular remanescente · fiduciante · penhora",
                ],
                [
                    "<b>Clarisia Ramos</b>",
                    "Filha · <b>solteira</b>",
                    "Herdeira · <b>interlocutora da captacao</b> (nao proprietaria exclusiva)",
                ],
                [
                    "Irmao de Clarisia",
                    "Homem · casado · com filhos",
                    "Herdeiro (+ anuencia do conjuge se regime exigir)",
                ],
                [
                    "Irma de Clarisia",
                    "Mulher · casada · com filhos",
                    "Herdeira (+ anuencia do conjuge se regime exigir)",
                ],
            ],
            [55 * mm, 45 * mm, usable - 100 * mm],
        )
    )
    story.append(
        P("2.3 Quadro provavel de direitos (CONFIRMAR COM ADVOGADO)", st_h2)
    )
    story.append(
        P(
            "Comunhao universal + falecimento de um conjuge + 3 filhos vivos (regra geral, CC): "
            "o sobrevivente fica com a <b>meacao (50%)</b>; os 3 filhos herdam os outros 50% "
            "(~16,67% cada), pendente de inventario e partilha.",
            st_body,
        )
    )
    story.append(
        grid_table(
            ["Pessoa", "Fracao provavel", "Observacao"],
            [
                ["Dennis", "<b>50%</b> (meacao)", "Assinatura <b>indispensavel</b>"],
                ["Clarisia", "~16,67%", "Heranca — pendente inventario/partilha"],
                ["Irmao", "~16,67%", "Idem; conjuge pode anuir"],
                ["Irma", "~16,67%", "Idem; conjuge pode anuir"],
            ],
            [40 * mm, 40 * mm, usable - 80 * mm],
        )
    )
    story.append(Spacer(1, 2 * mm))
    story.append(
        banner(
            "PONTO CRITICO: ate 30/01/2023 nao ha averbacao de inventario/partilha. "
            "Sem inventario concluido e partilha averbada, em regra nao ha escritura de venda. "
            "Passivo sucessorio a estimar: ITCMD-SP + multa/juros por atraso (~8 anos)."
        )
    )

    # §3
    story.append(P("3. Quem assina o que", st_h1))
    story.append(section_rule())
    story.append(
        P("3.1 Contrato de representacao / intermediacao RE/MAX", st_h2)
    )
    story.append(
        grid_table(
            ["Configuracao", "Como funciona"],
            [
                [
                    "<b>A — Completa (preferivel)</b>",
                    "Assinam <b>Dennis + Clarisia + 2 irmaos</b> (+ conjuges dos casados, se regime exigir)",
                ],
                [
                    "<b>B — Inventariante</b>",
                    "Se inventario aberto: inventariante com poderes expressos (+ meacao do Dennis)",
                ],
                [
                    "<b>C — Procuracoes</b>",
                    "Procuracoes <b>publicas</b> com poderes: vender, anunciar, regularizar, assinar perante PMSP/cartorio",
                ],
            ],
            [48 * mm, usable - 48 * mm],
        )
    )
    story.append(
        P("<b>Nao basta:</b> assinatura somente da Clarisia.", st_warn)
    )
    story.append(
        P(
            "<b>Protecao da corretora:</b> o contrato deve declarar (i) obito sem partilha averbada, "
            "(ii) lista de signatarios, (iii) venda condicionada a inventario + baixa de onus.",
            st_body,
        )
    )
    story.append(
        P("Rascunho de clausula (revisar com juridico da franquia):", st_h2)
    )
    story.append(
        P(
            "Os outorgantes declaram ser meeiro e/ou herdeiros do imovel da matricula 116.360 do 4&ordm; RI-SP "
            "(Rua Honduras, 629), comprometendo-se a apresentar certidao de matricula atualizada e documentacao "
            "da sucessao de Ermantina Viscardi Moniz Ramos, bem como as anuencias/procuracoes dos demais herdeiros "
            "e conjuges necessarios a validade deste instrumento e de eventual alienacao ou regularizacao.",
            st_quote,
        )
    )
    story.append(
        P(
            "3.2 Anistia / regularizacao (prazo protocolo <b>30/08/2026</b>)",
            st_h2,
        )
    )
    story.append(
        P(
            "• Definir <b>ja</b> quem assina o requerimento (herdeiro na posse / inventariante / todos).<br/>"
            "• Falecimento <b>nao</b> impede o protocolo, mas legitimidade deve estar clara.<br/>"
            "• Anuencia <b>CONPRESP/CONDEPHAAT</b> (lote em perimetro tombado dos Jardins) e gate a parte.<br/>"
            "• Restricoes convencionais do loteamento (art. 3&ordm; da Lei 17.202/2019) = item n&ordm; 1 do estudo de viabilidade.",
            st_body,
        )
    )
    story.append(P("3.3 Escritura de venda — ordem tipica", st_h2))
    story.append(
        P(
            "1) Representacao definida + inventario/partilha averbada · "
            "2) Certidao atualizada + baixa fiduciaria + levantamento da penhora · "
            "3) Anistia/regularizacao (se cenario C) em paralelo · "
            "4) Escritura",
            st_body,
        )
    )

    # §4
    story.append(P("4. Onus (estado na certidao 01/2023)", st_h1))
    story.append(section_rule())
    story.append(
        P("4.1 R.10 — Alienacao fiduciaria (15/05/2015 · Prot. 502.942)", st_h2)
    )
    story.append(
        kv_table(
            [
                ("Credor", "<b>Banco Maxima S/A</b> · CNPJ 33.923.798/0001-00"),
                ("Fiduciantes", "Dennis + Ermantina"),
                ("Divida", "<b>R$ 414.251,71</b>"),
                ("Parcelas", "118 &times; <b>R$ 7.121,93</b>"),
                ("Vencimento final", "<b>11/04/2025</b> (ja decorrido)"),
            ],
            38 * mm,
        )
    )
    story.append(
        P(
            "Em 2026: obter <b>termo de quitacao</b> e averbar <b>baixa</b> (se quitada) ou anuencia do credor.",
            st_body,
        )
    )
    story.append(P("4.2 Av.11 — Penhora (07/10/2020 · Prot. 590.095)", st_h2))
    story.append(
        kv_table(
            [
                (
                    "Tipo",
                    "Penhora de <b>50%</b> dos direitos de fiduciante (R.10)",
                ),
                ("Processo", "Execucao fiscal <b>1534213572015</b>"),
                ("Exequente", "SF / Prefeitura de Sao Paulo"),
                (
                    "Executados",
                    "Dennis D'Araujo Moniz Ramos + Joao Brasil Vita Sobrinho",
                ),
                ("Valor da divida (a epoca)", "<b>R$ 85.149,08</b>"),
                ("Depositario", "Dennis D'Araujo Moniz Ramos"),
            ],
            48 * mm,
        )
    )
    story.append(
        P(
            "Levantar antes/na escritura. Advogado avalia efeito sobre espolio "
            "(obito de Ermantina ~2018 &times; penhora 2020).",
            st_body,
        )
    )

    # §5
    story.append(P("5. Ancoras de valor (resumo ACM — laudo v6)", st_h1))
    story.append(section_rule())
    story.append(
        grid_table(
            ["Lente", "Valor", "Base"],
            [
                [
                    "Casa documental (441 m&sup2;)",
                    "<b>R$ 5,99–7,15M</b>",
                    "Headline v6 (mercado)",
                ],
                [
                    "Terreno (residual)",
                    "<b>R$ 9,62M</b>",
                    "Co-ancora / piso de conversa declarado",
                ],
                [
                    "Casa se regularizada (~736 m&sup2;)",
                    "<b>R$ 11,8–14,0M</b>",
                    "Condicionado — ver ressalvas",
                ],
                [
                    "Pretendido da familia",
                    "<b>R$ 12M</b>",
                    "= R$ 27.211/m&sup2; sobre 441 m&sup2; (acima da regua)",
                ],
            ],
            [55 * mm, 40 * mm, usable - 95 * mm],
        )
    )
    story.append(
        P(
            "<b>Invariantes comerciais:</b> nunca conversar abaixo de R$ 9,62M · "
            "nunca anunciar area construida acima de 441 m&sup2; sem averbacao · "
            "anuncio-ponte sugerido R$ 10,5–11M (cenario D).",
            st_body,
        )
    )
    story.append(
        P("Ressalvas da auditoria (ainda abertas — material interno)", st_h2)
    )
    story.append(
        P(
            "1. Total satelite ~736 m&sup2; nao fecha com a soma das capturas (garagem no print = 101,64 m&sup2;).<br/>"
            "2. Faixa 11,8–14M usa R$/m&sup2; sem o Capex aplicado na lente 441.<br/>"
            "3. “Fechamento esperado” ~9,2–9,6M fica abaixo do piso 9,62M.<br/>"
            "4. Laudo/JSON v6 ainda fala em obras pos-2014; PDF de cenarios fala em pre-2014/anistia — alinhar.<br/>"
            "5. PDF de cenarios: banner material interno — validar com supervisao antes do proprietario.",
            st_body,
        )
    )

    # §6
    story.append(P("6. Checklist — o que pedir AGORA a familia", st_h1))
    story.append(section_rule())
    story.append(P("Documentos pessoais / sucessao", st_h2))
    story.append(
        P(
            "☐ Certidao de <b>obito</b> de Ermantina (data exata)<br/>"
            "☐ Existe <b>inventario</b>? (judicial / extrajudicial) — n&ordm;, fase, inventariante<br/>"
            "☐ RG/CPF + endereco de <b>Dennis</b><br/>"
            "☐ RG/CPF + estado civil de <b>Clarisia</b> e dos <b>2 irmaos</b><br/>"
            "☐ Certidoes de <b>casamento</b> dos irmaos (regime de bens)<br/>"
            "☐ Nomes dos <b>conjuges</b> dos irmaos<br/>"
            "☐ Procuracoes ja existentes?<br/>"
            "☐ Testamento? (certidao negativa Censec/RTD)",
            st_body,
        )
    )
    story.append(P("Imovel / onus", st_h2))
    story.append(
        P(
            "☐ <b>Certidao de matricula atualizada (2026)</b> — prioridade n&ordm; 1<br/>"
            "☐ Termo de quitacao <b>Banco Maxima</b> + status da baixa<br/>"
            "☐ Status da execucao fiscal <b>1534213572015</b> / penhora Av.11<br/>"
            "☐ IPTU / certidoes fiscais recentes",
            st_body,
        )
    )
    story.append(P("Representacao RE/MAX", st_h2))
    story.append(
        P(
            "☐ Definir modelo A, B ou C de assinatura (§3.1)<br/>"
            "☐ Minuta de contrato com clausula de estado sucessario<br/>"
            "☐ Lista nominal de outorgantes + conjuges",
            st_body,
        )
    )
    story.append(P("Regularizacao (se cenario anistia)", st_h2))
    story.append(
        P(
            "☐ Contratar licenciador (experiencia Jardins / CONPRESP)<br/>"
            "☐ Protocolo ate <b>30/08/2026</b><br/>"
            "☐ Prova de anterioridade pre-31/07/2014 (aerofotos oficiais + IPTU antigo)<br/>"
            "☐ Teor das restricoes do loteamento (Companhia de Imoveis e Construcoes)",
            st_body,
        )
    )

    # §7
    story.append(P("7. Dados ainda em branco", st_h1))
    story.append(section_rule())
    story.append(
        grid_table(
            ["Campo", "Valor"],
            [
                ["Data exata do obito de Ermantina", "~8 anos — confirmar"],
                ["Dennis vivo?", "<b>Sim</b> (confirmado 13/07/2026)"],
                ["Nome completo do irmao", "_______________________________"],
                ["Nome completo da irma", "_______________________________"],
                ["Nome dos conjuges", "_______________________________"],
                ["Inventariante / n&ordm; do processo", "_______________________________"],
                ["Clarisia — CPF", "_______________________________"],
                ["Dennis — CPF / telefone", "_______________________________"],
                ["Contato preferencial", "Clarisia (captacao)"],
            ],
            [70 * mm, usable - 70 * mm],
        )
    )

    # §8
    story.append(P("8. Mensagem-resumo (copiar)", st_h1))
    story.append(section_rule())
    story.append(
        banner(
            "Imovel Rua Honduras 629, matricula 116.360 (4o RI-SP), SQL 014.071.0030-0: terreno 1.050 m2, "
            "area averbada 441 m2 (nao 800). Titulares na certidao 01/2023: Dennis + Ermantina (comunhao universal). "
            "Ermantina falecida ~8 anos; Dennis vivo; herdeiros: Clarisia (solteira, interlocutora) + 2 irmaos casados com filhos. "
            "Inventario/partilha nao constam da certidao ate 30/01/2023. Onus: fiduciaria Banco Maxima (venc. 11/04/2025) e "
            "penhora de 50% dos direitos de fiduciante (exec. fiscal R$ 85.149,08). Contrato RE/MAX e escritura exigem "
            "Dennis + 3 herdeiros (e conjuges se couber) ou procuracoes/inventariante — nao basta Clarisia sozinha. "
            "Prioridades: certidao atualizada 2026, inventario, baixa de onus; anistia com protocolo ate 30/08/2026 em paralelo se for o caso. "
            "Valores de referencia (laudo v6): casa documental R$ 5,99–7,15M; piso terreno R$ 9,62M; pretendido R$ 12M.",
            bg=GROK_SOFT,
            fg=TEXT2,
        )
    )

    story.append(Spacer(1, 6 * mm))
    brand = Table(
        [
            [
                Paragraph(
                    '<font color="white"><b>Grok</b></font>',
                    ParagraphStyle(
                        "gw",
                        fontName="ArialBold",
                        fontSize=14,
                        textColor=white,
                    ),
                ),
                Paragraph(
                    '<font color="#8B95A5">xAI</font><br/>'
                    '<font color="white" size="8">Ficha unica consolidada · Honduras 629 · 13/07/2026<br/>'
                    "Uso interno / exportacao · RE/MAX Galeria · Luciana Borba</font>",
                    ParagraphStyle(
                        "gx",
                        fontName="Arial",
                        fontSize=8,
                        leading=11,
                        textColor=white,
                    ),
                ),
            ]
        ],
        colWidths=[28 * mm, usable - 28 * mm],
    )
    brand.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), GROK_BG),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 10),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
                ("BOX", (0, 0), (-1, -1), 0, GROK_BG),
                ("LINEBEFORE", (1, 0), (1, 0), 1.5, GROK_ACCENT),
            ]
        )
    )
    story.append(brand)

    doc = SimpleDocTemplate(
        str(OUT),
        pagesize=A4,
        leftMargin=MARGIN_L,
        rightMargin=MARGIN_R,
        topMargin=MARGIN_T,
        bottomMargin=MARGIN_B,
        title="Ficha Unica — Honduras 629 — Grok",
        author="Grok (xAI)",
        subject="Consolidacao operacional Honduras 629",
        creator="Grok · xAI",
    )
    doc.build(story, onFirstPage=draw_header_footer, onLaterPages=draw_header_footer)
    print(f"OK {OUT} ({OUT.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
