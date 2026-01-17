# Relatório: deslocamento do header para baixo

## Achados principais
- O `header.site-header` está definido como `position: fixed` com `top: 0`, largura total e `z-index: 2000`, portanto deve ficar colado no topo da viewport em todas as páginas. O componente também define `min-height` e `height` iguais à variável `--header-safe-height`, que considera a área segura do dispositivo. 【F:css/style.css†L644-L665】
- O `body` recebe `padding-top: var(--header-safe-height)` para abrir espaço para o conteúdo e evitar que ele fique oculto sob o header. Esse preenchimento não move o header em si, mas faz com que qualquer conteúdo renderizado imediatamente após o header comece abaixo dele. 【F:css/style.css†L21-L86】
- O `html` e o `body` já zeram `margin`, o que elimina a hipótese de a margem padrão do navegador empurrar o header. 【F:css/style.css†L21-L35】

## Possível causa para ver o header "abaixado"
O espaço de `padding-top` do `body` pode ser confundido com um deslocamento do header, especialmente em telas menores onde o cabeçalho tem altura fixa (`--header-safe-height`). Caso algum layout envolva o header dentro de um contêiner adicional com `padding-top` ou `margin-top`, esse espaço se soma e o cabeçalho parece distante do topo.

## Recomendações
- Manter o `header` como filho direto de `body` para evitar herdar preenchimentos/margens de contêineres. 【F:index.html†L19-L38】
- Conferir se páginas secundárias não adicionam `padding-top` extra no wrapper global; se houver, remova ou reduza esse valor para não acumular com `--header-safe-height`. 【F:css/style.css†L21-L35】
- Se for necessário reservar espaço apenas para o conteúdo, prefira ajustar o `padding-top` do contêiner principal (`main` ou `.container-screen`) em vez do `body`, para que o header continue visualmente colado ao topo. 【F:css/style.css†L73-L115】
