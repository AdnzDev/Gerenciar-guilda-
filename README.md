# Guild Manager

Projeto estático usando Firebase Authentication e Cloud Firestore.

## Inscrições e selo verificado

- Guildas novas recebem `verified: false`. O proprietário altera o campo em **Editar Guilda**; o selo azul aparece ao lado do nome quando `verified` é `true`.
- A aba **Entrar em uma Guilda** lista as guildas públicas e permite enviar nome, idade e telefone.
- Inscrições são gravadas em `guilds/{guildId}/applications/{applicationId}` com status `pending`. O proprietário da guilda pode aceitar ou rejeitar e contatar a pessoa pelo WhatsApp.
- Publique as regras incluídas em `firestore.rules` no Firebase Console (Firestore Database → Rules) para habilitar o acesso conforme esperado. As regras permitem o envio público de uma inscrição e restringem leitura e decisão ao proprietário da guilda.

Abra `index.html` por um servidor estático com conexão à internet para carregar os módulos Firebase.
