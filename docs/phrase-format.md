# Formato das frases

A biblioteca de frases aceita tanto arrays quanto strings, mas o caso mais comum
são linhas com segmentos separados por `#`.

- O primeiro segmento é sempre o texto em português que aparece na tela.
- Cada segmento seguinte representa uma resposta aceita em inglês.
- Espaços extras são removidos automaticamente e respostas vazias são
  descartadas.

### Como o código interpreta

A função `normalizePhraseLine` divide a linha por `#`, define o primeiro trecho
como português e coloca os demais em uma lista de respostas válidas. Se a frase
já chegar como array, `ensurePhraseTuple` faz a limpeza e garante que as
respostas estejam normalizadas.

### Exemplo prático

A entrada `"Bom Dia#Good Morning#Good More ?"` é convertida em:

- Português: `"Bom Dia"` (primeiro segmento)
- Respostas aceitas: `["Good Morning", "Good More ?"]` (demais segmentos)

Isso significa que o jogador pode falar ou digitar qualquer uma das variantes em
inglês e a verificação considerará como resposta correta.

## Alternativas de palavras

Para aceitar pequenas variações em palavras isoladas (por exemplo, tratar
"bad", "back" ou "best" como equivalentes de "bed"), mantenha o arquivo
`data/phrases/word-alternatives.json`. Ele deve conter um objeto onde cada
propriedade é a forma canônica e o valor é um array de alternativas válidas:

```json
{
  "bed": ["bad", "back", "best"]
}
```

Sempre que o jogo carregar as frases, esse mapa é lido e aplicado no momento da
comparação. Basta adicionar novas entradas ao JSON para que outras palavras
isoladas também passem a ser aceitas dentro de frases maiores.
