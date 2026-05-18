export const metadata = {
  title: 'Política de Privacidade — RE/MAX Galeria Moema',
  description:
    'Política de Privacidade conforme Lei Geral de Proteção de Dados (LGPD).',
}

/**
 * /lgpd/politica-privacidade — Epic 7 Story 7.10 AC7.
 *
 * Canonical privacy policy. Text reviewed by counsel before production
 * publication. Wave A draft references LIA Epic 7.
 */
export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 prose prose-slate">
      <h1>Política de Privacidade</h1>
      <p className="text-sm text-gray-500">
        Última atualização: a confirmar com counsel jurídico antes do go-live.
      </p>

      <section>
        <h2>1. Quem somos</h2>
        <p>
          RE/MAX Galeria Moema (franquia local) é a controladora dos dados
          pessoais tratados nesta plataforma, com atuação exclusiva no mercado
          imobiliário da Zona Sul do município de São Paulo. A consultora
          operadora primária é a corretora Luciana Borba (CRECI a confirmar).
        </p>
      </section>

      <section>
        <h2>2. Que dados coletamos</h2>
        <ul>
          <li>
            Dados publicados pelo próprio titular em anúncios de venda de
            imóveis em portais públicos (ZAP, OLX, VivaReal, MercadoLivre): nome,
            telefone, e-mail (quando exposto), endereço do imóvel anunciado e
            valor pedido.
          </li>
          <li>
            Dados públicos de bases governamentais: registro CRECI (COFECI),
            CNPJ (Receita Federal), IPTU/ITBI (Prefeitura de São Paulo —
            GeoSampa).
          </li>
        </ul>
        <p>
          <strong>Não coletamos</strong> CPF, RG, dados de saúde, orientação
          sexual, religião, ou qualquer dado pessoal sensível (Art. 5º, II da
          LGPD).
        </p>
      </section>

      <section>
        <h2>3. Finalidade e base legal</h2>
        <p>
          Tratamos os dados com base no <strong>legítimo interesse</strong> do
          controlador (Art. 7º, IX da LGPD), conforme Avaliação de Legítimo
          Interesse (LIA) específica documentada e aprovada por counsel
          jurídico. A finalidade é a captação ativa de leads de venda de imóveis
          na Zona Sul de São Paulo, para subsidiar a atividade comercial
          regulamentada da consultora pelo COFECI/CRECI.
        </p>
      </section>

      <section>
        <h2>4. Como protegemos seus dados</h2>
        <ul>
          <li>
            <strong>Cifragem em repouso:</strong> todos os dados pessoais
            (telefone, e-mail, nome) são cifrados em repouso usando Supabase
            Vault, com chave gerenciada e nunca exposta à aplicação.
          </li>
          <li>
            <strong>Controle de acesso:</strong> apenas a consultora dona do
            lead pode acessar dados associados. Toda decifragem é registrada em
            audit log permanente (Art. 37 LGPD).
          </li>
          <li>
            <strong>Minimização:</strong> coletamos apenas o estritamente
            necessário para a finalidade declarada.
          </li>
          <li>
            <strong>Retenção:</strong> leads não convertidos em contato comercial
            efetivo são automaticamente anonimizados após 90 dias.
          </li>
        </ul>
      </section>

      <section>
        <h2>5. Seus direitos (Art. 18 LGPD)</h2>
        <p>Você tem o direito de:</p>
        <ul>
          <li>Confirmar se tratamos dados seus.</li>
          <li>Acessar seus dados.</li>
          <li>Corrigir dados incompletos ou desatualizados.</li>
          <li>
            <strong>Solicitar a remoção (opt-out)</strong> dos seus dados a
            qualquer momento, através do formulário em{' '}
            <a href="/lgpd/opt-out" className="text-blue-600 underline">
              /lgpd/opt-out
            </a>
            .
          </li>
          <li>
            Solicitar a portabilidade dos dados a outro fornecedor (mediante
            requisição expressa).
          </li>
          <li>Revogar consentimento, quando aplicável.</li>
        </ul>
        <p>
          O prazo de processamento de solicitações de opt-out é de até{' '}
          <strong>15 dias corridos</strong> (Art. 19 LGPD).
        </p>
      </section>

      <section>
        <h2>6. Contato — Encarregado pelo Tratamento de Dados (DPO)</h2>
        <p>
          E-mail DPO: <em>(a preencher com counsel)</em>
          <br />
          Telefone/WhatsApp DPO: <em>(a preencher com counsel)</em>
        </p>
        <p>
          Em caso de não-atendimento, você pode reclamar diretamente à Autoridade
          Nacional de Proteção de Dados (ANPD).
        </p>
      </section>

      <section>
        <h2>7. Alterações nesta política</h2>
        <p>
          Esta política pode ser atualizada. A versão vigente é sempre a
          publicada nesta URL. Alterações materiais serão comunicadas no rodapé
          da plataforma por no mínimo 30 dias.
        </p>
      </section>
    </main>
  )
}
