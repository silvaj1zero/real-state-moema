import { LGPDOptOutForm } from '@/components/LGPDOptOutForm'

export const metadata = {
  title: 'Solicitar Opt-Out — RE/MAX Galeria Moema',
  description:
    'Solicite a remoção dos seus dados pessoais conforme Art. 18 da LGPD (Lei 13.709/2018).',
}

/**
 * /lgpd/opt-out — Epic 7 Story 7.10 AC8.
 *
 * Public form for titulares to request removal of their PII per LGPD Art. 18.
 */
export default function OptOutPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-bold tracking-tight">
        Solicitar remoção dos seus dados
      </h1>
      <p className="mt-3 text-base text-gray-700">
        Em conformidade com a Lei Geral de Proteção de Dados (Lei 13.709/2018),
        Art. 18, você tem o direito de solicitar a remoção dos seus dados
        pessoais armazenados pela RE/MAX Galeria Moema.
      </p>

      <div className="mt-8 rounded-md border border-gray-200 bg-white p-6">
        <LGPDOptOutForm />
      </div>

      <div className="mt-8 space-y-2 text-sm text-gray-600">
        <p>
          <strong>Prazo de processamento:</strong> Até 15 dias corridos, conforme
          Art. 19 da LGPD.
        </p>
        <p>
          <strong>Confirmação:</strong> Você receberá um número de protocolo
          após registrar a solicitação. Guarde-o para acompanhamento.
        </p>
        <p>
          <strong>Dúvidas?</strong> Entre em contato com o Encarregado pelo
          Tratamento de Dados (DPO) através do canal informado em{' '}
          <a
            href="/lgpd/politica-privacidade"
            className="text-blue-600 underline"
          >
            nossa Política de Privacidade
          </a>
          .
        </p>
      </div>
    </main>
  )
}
