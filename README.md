# Fight v2 🥊

Jogo de luta em 1ª pessoa estilo Punch-Out, com visual cartoon colorido
(inspirado em Clash Royale). Feito em HTML5 Canvas puro, pronto para
empacotar com **Apache Cordova** para App Store e Google Play.

## Como jogar

- **Botões de cima** = soco esquerdo / soco direito
- **Botões de baixo** = esquiva esquerda / esquiva direita
- Quando o rival erguer a luva com o **"!" vermelho**, esquive para o lado
  **contrário** da luva — o botão de esquiva correto **pisca em dourado**.
  Se esquivar, ele fica **tonto (estrelas)** — bata nessa janela para causar
  dano forte e fazer combo!
- Socar fora da janela ainda dá um dano pequeno (chip damage), mas cuidado
  com o spam: 5 socos seguidos no vazio = ele esquiva e contra-ataca.
- **Esquiva perfeita** (no último instante) = câmera lenta + janela maior.

No desktop: `A`/`D` = socos, `←`/`→` = esquivas, `Esc` = pausa.

Extras no menu: **Tutorial** interativo (4 etapas animadas), modal de
**Controles** (detecta desktop/mobile) e seletor de **Dificuldade**
(Fácil = botão de esquiva certo brilha · Normal = sem dicas ·
Difícil = sem dicas + golpes 15% mais rápidos e 25% mais fortes).

Música de fundo: coloque `bgm-fight.mp3` em `www/assets/audio/`
(instruções em [COLOQUE-A-MUSICA-AQUI.md](www/assets/audio/COLOQUE-A-MUSICA-AQUI.md)).

## Rodar no navegador (desenvolvimento)

```bash
cd fight-v2
npx http-server www -p 8080 -c-1
# abra http://localhost:8080
```

## Estrutura

```
fight-v2/
├── config.xml            # configuração Cordova (id, orientação, prefs)
├── package.json
└── www/
    ├── index.html        # canvas + telas de start/game over (DOM)
    ├── css/style.css     # estilo das telas overlay
    └── js/
        ├── config.js     # ⚖️ BALANCEAMENTO (dificuldade, dano, cores)
        ├── sfx.js        # sons sintetizados (WebAudio, zero assets)
        ├── state.js      # estado puro do jogo
        ├── rive-bridge.js# ponte p/ animações Rive (USE_RIVE=false por ora)
        ├── effects.js    # parallax/câmera, shake, partículas, dano flutuante
        ├── logic.js      # máquinas de estado + SISTEMA DE COLISÃO
        ├── render.js     # toda a arte cartoon em canvas
        └── main.js       # input, loop, telas
```

## Ajustar a dificuldade

Tudo em [www/js/config.js](www/js/config.js):

| Constante | Efeito |
|---|---|
| `TELEGRAPH_MS` | tempo de aviso antes do soco do rival (maior = mais fácil) |
| `OPP_VULN_MS` | janela para contra-atacar (maior = mais fácil) |
| `DMG_OPP_PUNCH` | dano que você toma |
| `DMG_PLAYER_VULN_HIT` | seu dano no contra-ataque |
| `OPP_MAX_HP` | vida do rival |

## Ativar as animações do Rive (futuro)

1. Crie `player.riv` e `opponent.riv` no editor Rive com as State Machines
   `PlayerSM` / `OppSM` e os inputs documentados em
   [www/js/rive-bridge.js](www/js/rive-bridge.js).
2. Coloque os arquivos em `www/assets/`.
3. Em `rive-bridge.js`, mude `USE_RIVE` para `true`.
4. Para funcionar offline, baixe o runtime e troque o `<script src>` do
   unpkg por uma cópia local em `www/js/vendor/rive.js`.

A arte canvas atual continua como fallback automático.

## Build mobile com Cordova

### Pré-requisitos

```bash
npm install -g cordova
# Android: Android Studio + SDK (API 34+), JDK 17, variável ANDROID_HOME
# iOS: macOS + Xcode + CocoaPods (sudo gem install cocoapods)
```

### Adicionar plataformas e rodar

```bash
cd fight-v2
cordova platform add android
cordova platform add ios

cordova run android   # roda no emulador/dispositivo conectado
cordova run ios       # roda no simulador
```

### Ícone e splash screen

Crie `resources/icon.png` (1024×1024) e `resources/splash.png` (2732×2732)
e gere tudo automaticamente:

```bash
npm install -g cordova-res
cordova-res android --skip-config --copy
cordova-res ios --skip-config --copy
```

## Publicar nas lojas

### Google Play

1. Crie a conta de desenvolvedor (taxa única de US$ 25):
   https://play.google.com/console
2. Gere uma keystore (guarde com a vida — perder = não atualiza mais o app):
   ```bash
   keytool -genkey -v -keystore fightv2.keystore -alias fightv2 \
     -keyalg RSA -keysize 2048 -validity 10000
   ```
3. Build assinado (AAB, formato exigido pela Play):
   ```bash
   cordova build android --release -- \
     --keystore=fightv2.keystore --alias=fightv2 --packageType=bundle
   ```
4. Suba o `.aab` (fica em `platforms/android/app/build/outputs/bundle/release/`)
   no Play Console, preencha ficha da loja, classificação etária e privacidade.

### App Store (iOS)

1. Inscreva-se no Apple Developer Program (US$ 99/ano):
   https://developer.apple.com/programs/
2. ```bash
   cordova build ios --release
   open platforms/ios/Fight\ v2.xcworkspace
   ```
3. No Xcode: selecione seu Team (assinatura automática), depois
   **Product → Archive → Distribute App → App Store Connect**.
4. No App Store Connect, crie o app (bundle id `com.estevao.fightv2`),
   preencha a ficha, screenshots (6.7" e 5.5") e envie para revisão.

### Checklist antes de enviar

- [ ] Ícone e splash gerados
- [ ] Testado em dispositivo físico (toque, áudio, vibração)
- [ ] Runtime do Rive local (ou `USE_RIVE=false`) — app não pode depender de rede
- [ ] Política de privacidade (obrigatória nas duas lojas, mesmo sem coleta de dados)
- [ ] Versão (`version` no config.xml) incrementada a cada envio
