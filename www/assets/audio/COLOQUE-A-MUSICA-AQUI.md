# Música de fundo

Coloque aqui o arquivo:

```
bgm-fight.mp3
```

O jogo já está integrado e vai tocar automaticamente:

- **Estilo recomendado**: luta / arcade / motivacional, energia positiva, não agressiva
- **Loop**: o jogo repete em loop infinito (idealmente um arquivo que "fecha" bem o loop)
- **Volume**: o jogo toca a 10% do volume — não precisa normalizar baixo
- **Formato**: MP3 (compatível com iOS/Android/desktop)
- **Tamanho**: ideal < 1 MB (loop de 30–60s resolve)

Onde achar música gratuita (licença livre):
- https://pixabay.com/music/ (busque "fight", "arcade", "boxing")
- https://incompetech.com (Kevin MacLeod, CC-BY)
- https://opengameart.org

Comportamento já implementado:
- inicia após o primeiro toque/clique (regra do iOS/Android)
- pausa quando o jogo é pausado, retoma ao continuar
- para ao voltar para o menu
- sem o arquivo, o jogo roda normalmente (sem erros)
