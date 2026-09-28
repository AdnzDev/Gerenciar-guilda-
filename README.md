# Guild Manager

Projeto estático usando Firebase Authentication e Cloud Firestore.

## Inscrições e selo verificado

- Guildas novas recebem `verified: false`. Para escolher quais guildas serão verificadas, use o Firebase Console: Firestore Database → `guilds` → documento da guilda → **Add field** (ou edite o campo existente) → `verified` do tipo **Boolean** → `true`. O app apenas exibe o selo; os donos das guildas não podem alterar esse campo pelo site.
- A aba **Entrar em uma Guilda** lista as guildas públicas e permite enviar nome, idade e telefone.
- Cada cartão de recrutamento mostra o total de jogadores cadastrados nas lines da guilda.
- Inscrições são gravadas em `guilds/{guildId}/applications/{applicationId}` com status `pending`. O proprietário da guilda pode aceitar ou rejeitar e contatar a pessoa pelo WhatsApp.
- Publique as regras incluídas em `firestore.rules` no Firebase Console (Firestore Database → Rules) para habilitar o acesso conforme esperado. As regras permitem o envio público de uma inscrição e restringem leitura e decisão ao proprietário da guilda.

Abra `index.html` por um servidor estático com conexão à internet para carregar os módulos Firebase.
