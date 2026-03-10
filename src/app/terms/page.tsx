'use client';
import { Header } from "@/components/header";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />
      <main className="flex-grow">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="prose prose-lg max-w-none">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Campanha: Cards do Futebol
            </h1>
            <h2 className="text-2xl font-semibold text-gray-700 mb-8">
              Termos e Condições (os "Termos")
            </h2>
            
            <div className="bg-red-50 border border-red-200 p-6 rounded-lg mb-8">
              <p className="text-sm font-semibold text-red-800 mb-2">
                ⚠️ ATENÇÃO:
              </p>
              <p className="text-sm text-red-700">
                Ativos virtuais e NFTs não são regulados no Brasil. Fan Tokens não devem ser considerados um tipo de investimento, pois sua função essencial é permitir acesso a bens, serviços ou funcionalidades específicas por meio de uma infraestrutura baseada em blockchain.
              </p>
            </div>

            <div className="space-y-8">
              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Campanha</h2>
                
                <div className="space-y-4">
                  <p className="text-gray-700 leading-relaxed">
                    <strong>1.</strong> Esta campanha é chamada "Cards do Futebol" (a "Campanha").
                  </p>
                  
                  <p className="text-gray-700 leading-relaxed">
                    <strong>2.</strong> A Campanha é realizada em conjunto pela Gotas Ltd, uma empresa constituída de acordo com as leis do Reino Unido, sob o número 1507459, com endereço registrado em 128 City Road, Londres, EC1V 2NX, Reino Unido, e pela Socios Technologies AG, uma empresa constituída de acordo com as leis da Suíça (doravante coletivamente denominadas "Co-Promotoras").
                  </p>
                  
                  <p className="text-gray-700 leading-relaxed">
                    <strong>3.</strong> A Gotas Ltd fornece a plataforma tecnológica da Campanha, que consistirá no seguinte: Cards do Futebol é uma coleção de tokens não fungíveis (NFTs) criados na plataforma Gotas Social. Para evitar dúvidas, a Socios Technologies AG e suas afiliadas não estão envolvidas no processo de mintagem.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Descrição da Campanha</h2>
                
                <div className="space-y-4">
                  <p className="text-gray-700 leading-relaxed">
                    <strong>4.</strong> A campanha está aberta a participantes ("Participante(s)" / "Você" / "Seu/Sua") que fizerem stake de Fan Tokens™ dos seguintes times: Flamengo, Fluminense, Vasco da Gama, Palmeiras, São Paulo FC e S.C. Internacional para cunhar (mintar) NFTs que depois poderão ser adquiridos por você. Será possível mintar novos NFTs até o fim da campanha ou até que o estoque daquela raridade se esgote.
                  </p>
                  
                  <p className="text-gray-700 leading-relaxed">
                    <strong>5.</strong> A Campanha ocorrerá de 21 de julho de 2025 ("Data de Abertura") até 22 de dezembro de 2025 ("Data de Encerramento"). Participações após essa data não serão consideradas, salvo decisão contrária das Co-Promotoras a seu exclusivo critério.
                  </p>
                  
                  <p className="text-gray-700 leading-relaxed">
                    <strong>6.</strong> A Campanha ocorrerá na plataforma gotas.social.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Requisitos de Participação</h2>
                
                <div className="space-y-4">
                  <p className="text-gray-700 leading-relaxed">
                    <strong>7.</strong> Para participar da Campanha, você DEVE:
                  </p>
                  
                  <ul className="list-disc pl-6 space-y-2 text-gray-700">
                    <li><strong>a.</strong> Ter pelo menos dezoito (18) anos;</li>
                    <li><strong>b.</strong> Possuir Fan Tokens™ dos times mencionados;</li>
                    <li><strong>c.</strong> Fazer stake dos seus Fan Tokens™ e mintar até três (3) cards por clube por dia, até o fim da temporada do futebol brasileiro;</li>
                    <li><strong>d.</strong> Ter uma carteira Socios.com ou outra compatível. Durante o período de stake, você acumula Reward Points (RP) de acordo com a funcionalidade Stake & Earn, conforme a Seção 10.8.6 dos Termos Gerais da Socios.com;</li>
                    <li><strong>e.</strong> Residir no Brasil;</li>
                    <li><strong>f.</strong> Seguir os seguintes passos:</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Como Participar</h2>
                
                <div className="space-y-6">
                  <div className="bg-blue-50 p-6 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">i. Conecte sua carteira</h3>
                    <p className="text-gray-700">
                      Acesse a página do seu time em cardsdofutebol.com e entre com sua carteira: Socios.com, Gmail, MetaMask, Apple ou outra opção.
                    </p>
                  </div>
                  
                  <div className="bg-blue-50 p-6 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">ii. Escolha a raridade</h3>
                    <p className="text-gray-700 mb-3">
                      Selecione entre Lendário, Épico ou Comum. O nível Lendário desbloqueia os três níveis:
                    </p>
                    <ul className="space-y-2 ml-4">
                      <li className="flex items-center gap-2">
                        <span className="text-yellow-500">👑</span>
                        <span className="font-semibold">Lendário:</span> requer 1.000 Fan Tokens™
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-purple-500">♦</span>
                        <span className="font-semibold">Épico:</span> requer 200 Fan Tokens™
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-gray-500">●</span>
                        <span className="font-semibold">Comum:</span> requer 100 Fan Tokens™
                      </li>
                    </ul>
                    <p className="text-sm text-gray-600 mt-3">
                      A elegibilidade depende da quantidade de Fan Tokens™ em stake no momento do mint.
                    </p>
                  </div>
                  
                  <div className="bg-blue-50 p-6 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">iii. Faça o stake dos Fan Tokens™</h3>
                    <p className="text-gray-700">
                      Bloqueie os Fan Tokens™ exigidos na carteira Socios.com ou diretamente no cardsdofutebol.com.
                    </p>
                  </div>
                  
                  <div className="bg-blue-50 p-6 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">iv. Stake uma vez, mint todo dia</h3>
                    <p className="text-gray-700">
                      Clique em "Mint" e resgate seu colecionável exclusivo selecionado por IA. Volte todos os dias para receber novas cartas. Não é necessário fazer novo stake.
                    </p>
                  </div>
                </div>
                
                <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-lg mt-6">
                  <p className="text-sm font-semibold text-yellow-800 mb-2">
                    📌 Observação:
                  </p>
                  <p className="text-sm text-yellow-700">
                    Você pode iniciar o processo de unstake a qualquer momento. Após isso, começa um período de espera (cooldown) de sete (7) dias, durante o qual os Fan Tokens permanecerão bloqueados e não poderão ser utilizados, negociados ou transferidos. Durante esse período, você também não poderá mintar novos NFTs.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Queima de Colecionáveis Digitais para Recompensas Adicionais</h2>
                
                <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-lg">
                  <p className="text-gray-700 leading-relaxed">
                    Os detentores de Colecionáveis Digitais podem, a seu exclusivo critério, optar por queimar um ou mais desses colecionáveis para resgatá-los por Fan Tokens, CHZ ou PEPPER, estritamente de acordo com os termos, condições e procedimentos prescritos pelas Co-Promotoras.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Informações Adicionais</h2>
                
                <div className="space-y-4">
                  <p className="text-gray-700 leading-relaxed">
                    <strong>8.</strong> A participação é gratuita, salvo disposição contrária nos presentes Termos.
                  </p>
                  
                  <p className="text-gray-700 leading-relaxed">
                    <strong>9.</strong> As Co-Promotoras não se responsabilizam por falhas técnicas que impeçam a participação.
                  </p>
                  
                  <p className="text-gray-700 leading-relaxed">
                    <strong>10.</strong> Os NFTs adquiridos são únicos, intransferíveis e não substituíveis, e não há alternativa em dinheiro.
                  </p>
                  
                  <p className="text-gray-700 leading-relaxed">
                    <strong>11.</strong> Qualquer benefício relacionado à Campanha será estritamente limitado ao descrito nestes Termos.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Disposições Gerais</h2>
                
                <div className="space-y-4">
                  <p className="text-gray-700 leading-relaxed">
                    <strong>12.</strong> A decisão das Co-Promotoras em relação a qualquer aspecto da Campanha é final e vinculativa, e não será admitida qualquer correspondência a respeito.
                  </p>
                  
                  <p className="text-gray-700 leading-relaxed">
                    <strong>13.</strong> Considera-se que os Participantes aceitaram e concordaram em se submeter a estes Termos ao ingressarem na Campanha. As Co-Promotoras reservam-se o direito, a seu exclusivo e absoluto critério, de recusar a participação, desclassificar ou impedir a participação de qualquer pessoa que viole estes Termos e/ou qualquer legislação aplicável, a qualquer momento.
                  </p>
                  
                  <p className="text-gray-700 leading-relaxed">
                    <strong>14.</strong> Se um Participante utilizar métodos fraudulentos ou tentar, de qualquer forma, contornar estes Termos, tal Participante será desclassificado a exclusivo critério das Co-Promotoras.
                  </p>
                  
                  <p className="text-gray-700 leading-relaxed">
                    <strong>15.</strong> As Co-Promotoras reservam-se o direito de anular, cancelar, suspender ou alterar a Campanha a qualquer momento, caso isso se torne necessário. O Promotor reserva-se o direito, a seu exclusivo e absoluto critério, de substituir os NFTs por NFT(s) alternativos, caso circunstâncias fora do controle das Co-Promotoras tornem isso necessário. Em razão de surtos de pandemia (incluindo, mas não se limitando, ao Coronavírus (COVID-19) e à varíola dos macacos), caso a entrega dos Fan Tokens™ ou dos NFTs cunhados se torne razoavelmente difícil ou impossível de ser realizada, o NFT poderá não ser entregue aos Participantes. Nessa eventualidade, as Co-Promotoras não serão responsáveis por quaisquer despesas ou danos de qualquer natureza incorridos pelos Participantes em conexão com os mecanismos necessários para participação na Campanha.
                  </p>
                  
                  <p className="text-gray-700 leading-relaxed">
                    <strong>16.</strong> Na medida permitida por lei, as Co-Promotoras, seus agentes ou distribuidores não serão, em nenhuma circunstância, responsáveis ou obrigadas a indenizar os Participantes, nem aceitarão qualquer responsabilidade por perda, dano, lesão pessoal ou morte decorrente da aceitação dos NFTs, exceto quando causados por negligência grave das Co-Promotoras, seus agentes, distribuidores ou respectivos funcionários. Seus direitos legais não são afetados.
                  </p>
                  
                  <p className="text-gray-700 leading-relaxed">
                    <strong>17.</strong> As Co-Promotoras reservam-se o direito, a seu exclusivo critério, de alterar, modificar, adicionar ou remover partes destes Termos e Condições a qualquer momento, sem aviso prévio. As alterações entrarão em vigor assim que forem publicadas na plataforma ou site da Campanha, sendo responsabilidade do Participante revisar periodicamente estes Termos e Condições em busca de atualizações. Sua participação contínua na Campanha após a publicação das alterações implicará na aceitação das referidas mudanças. No caso de alterações relevantes que possam afetar adversamente seus direitos sob estes Termos e Condições, as Co-Promotoras envidarão esforços razoáveis para notificar os Participantes por meio dos canais de comunicação que julgarem apropriados.
                  </p>
                  
                  <p className="text-gray-700 leading-relaxed">
                    <strong>18.</strong> Ao participar da Campanha, os participantes aceitam e concordam em participar de materiais publicitários relacionados exclusivamente a esta Campanha, o que pode incluir a publicação do nome e imagens do Vencedor em qualquer mídia (incluindo redes sociais) da Socios.com, dos Fan Tokens e de quaisquer afiliadas das Co-Promotoras. O Vencedor/Participantes pode ser solicitado a participar de gravações promocionais da Campanha. Esse conteúdo filmado poderá ser utilizado pelas Co-Promotoras e suas afiliadas. Todos os direitos, incluindo direitos de imagem e de propriedade sobre qualquer material audiovisual criado, permanecerão de propriedade exclusiva das Co-Promotoras e de suas afiliadas.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Proteção de Dados</h2>
                
                <div className="bg-gray-50 p-6 rounded-lg">
                  <p className="text-gray-700 leading-relaxed mb-4">
                    Um lembrete amigável de que quaisquer dados pessoais fornecidos pelos participantes da Campanha serão processados estritamente de acordo com a política de privacidade das Co-Promotoras, disponível <a href="#" className="text-blue-600 underline">aqui</a> e <a href="#" className="text-blue-600 underline">aqui</a>.
                  </p>
                  
                  <p className="text-gray-700 leading-relaxed mb-4">
                    Ainda assim, gostaríamos de informar que você tem o direito de:
                  </p>
                  
                  <ul className="list-disc pl-6 space-y-2 text-gray-700">
                    <li>Ser informado de forma clara, transparente e compreensível sobre como utilizamos seus dados pessoais em conexão com a Campanha;</li>
                    <li>Solicitar acesso às suas informações pessoais;</li>
                    <li>Solicitar a retificação dos dados pessoais que mantemos sobre você;</li>
                    <li>Solicitar a exclusão dos seus dados pessoais;</li>
                    <li>Se opor ao processamento dos seus dados pessoais quando este estiver baseado em interesse legítimo;</li>
                    <li>Solicitar a limitação do processamento dos seus dados pessoais;</li>
                    <li>Solicitar a transferência dos seus dados pessoais para outra parte, nos casos em que você os tiver fornecido a nós e estivermos utilizando com base no seu consentimento;</li>
                    <li>Retirar o consentimento a qualquer momento, enviando um e-mail para dataprotection@socios.com;</li>
                    <li>Apresentar uma reclamação junto à autoridade supervisora competente na Suíça ou no Reino Unido, caso acredite que estamos utilizando suas informações de maneira que viole as leis de proteção de dados.</li>
                  </ul>
                </div>
              </section>
            </div>

            <div className="mt-12 pt-8 border-t border-gray-200">
              <p className="text-sm text-gray-500 text-center">
                Para dúvidas sobre estes termos, entre em contato conosco através dos canais oficiais.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}