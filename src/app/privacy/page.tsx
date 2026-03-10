import { Header } from "@/components/header";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />
      <main className="flex-grow py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            Política de Privacidade
          </h1>
          
          <div className="prose prose-lg max-w-none">
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                1. Coleta de Dados
              </h2>
              <p className="text-gray-600 mb-4">
                Coletamos informações pessoais que você nos fornece diretamente, como nome, endereço de e-mail, 
                informações de carteira digital e outros dados necessários para o funcionamento da plataforma.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                2. Uso de Cookies
              </h2>
              <p className="text-gray-600 mb-4">
                Utilizamos cookies e tecnologias similares para:
              </p>
              <ul className="list-disc list-inside text-gray-600 mb-4 space-y-1">
                <li>Melhorar sua experiência de navegação</li>
                <li>Personalizar conteúdo e anúncios</li>
                <li>Analisar o tráfego do site</li>
                <li>Lembrar suas preferências</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                3. Compartilhamento de Dados
              </h2>
              <p className="text-gray-600 mb-4">
                Não vendemos, alugamos ou compartilhamos suas informações pessoais com terceiros, 
                exceto quando necessário para o funcionamento da plataforma ou quando exigido por lei.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                4. Segurança
              </h2>
              <p className="text-gray-600 mb-4">
                Implementamos medidas de segurança adequadas para proteger suas informações pessoais 
                contra acesso não autorizado, alteração, divulgação ou destruição.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                5. Seus Direitos (LGPD)
              </h2>
              <p className="text-gray-600 mb-4">
                Você tem o direito de:
              </p>
              <ul className="list-disc list-inside text-gray-600 mb-4 space-y-1">
                <li>Solicitar acesso aos seus dados pessoais</li>
                <li>Solicitar correção de dados incorretos</li>
                <li>Solicitar a exclusão de seus dados</li>
                <li>Revogar seu consentimento a qualquer momento</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                6. Contato
              </h2>
              <p className="text-gray-600 mb-4">
                Para questões relacionadas à privacidade ou exercer seus direitos, 
                entre em contato conosco através do e-mail: privacy@gotas.com
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                7. Atualizações
              </h2>
              <p className="text-gray-600 mb-4">
                Esta política pode ser atualizada periodicamente. Recomendamos que você a revise regularmente.
              </p>
              <p className="text-gray-500 text-sm">
                Última atualização: {new Date().toLocaleDateString('pt-BR')}
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
} 