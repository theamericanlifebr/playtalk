# Captura de voz com Java Sound

Este módulo fornece uma implementação básica de captura contínua de áudio
para a versão mobile do Playtalk. O objetivo é substituir o microfone atual
por um dispositivo compatível com a API `javax.sound.sampled`, mantendo o
microfone sempre ligado nos ambientes de jogo para que a voz do jogador seja
processada em tempo real.

## Como funciona
- A classe [`MicrophoneCapture`](src/com/playtalk/audio/MicrophoneCapture.java)
  usa `TargetDataLine` para obter os dados brutos do microfone.
- O formato padrão (`16 kHz`, `mono`, `16 bits`) foi escolhido para otimizar o
  reconhecimento de fala em dispositivos móveis.
- Ao ser instanciada, a classe abre a linha do microfone, inicia a captura em
  uma *thread* dedicada e mantém o fluxo ativo até que `shutdown()` seja
  chamado ao final da sessão de jogo.

## Integração
1. Adicione o módulo ao projeto mobile Android ou desktop Java.
2. Certifique-se de que o novo hardware de microfone esteja instalado e seja o
   dispositivo de entrada padrão do sistema operacional.
3. Crie uma instância única de `MicrophoneCapture` durante a inicialização do
   jogo para garantir que o microfone permaneça ativo em todas as cenas.
4. Utilize `getLiveStream()` para transmitir o áudio em tempo real ou
   `getRecordedAudio()` para recuperar um *snapshot* dos dados já capturados.
5. Chame `shutdown()` apenas quando o aplicativo estiver finalizando para
   liberar os recursos.

> **Observação:** Como o microfone deve permanecer sempre ligado durante o
> gameplay, não há lógica interna para pausar a captura. Caso seja necessário
> aplicar filtros ou silenciamento, recomenda-se fazê-lo nas camadas superiores
> de processamento de áudio.
