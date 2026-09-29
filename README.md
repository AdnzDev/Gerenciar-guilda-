# Gerenciar-guilda-
## Verificação da guilda
O campo `verified` pertence ao documento da guilda no Firestore e deve ser alterado somente pela administração do site no Firebase Console.

Exemplo:
```text
verified: false
```
para
```text
verified: true
```

O dono da guilda não recebe opção para alterar esse campo pelo site. Quando o dono abrir uma guilda que foi marcada como verificada, o Guild Manager exibe um aviso informando que o selo foi concedido.

## Correio de inscrições
O dono da guilda possui um ícone de correio no canto superior direito da tela da guilda. O número vermelho mostra inscrições pendentes. O correio permite visualizar os dados, abrir o WhatsApp com uma mensagem pronta e aceitar ou rejeitar cada solicitação.

## Avisos do administrador do site

A aba **Avisos** do correio lê documentos da coleção `siteNotices` no Firestore. O líder não edita esses avisos pelo site.

Crie um documento em `siteNotices` pelo Firebase Console com estes campos:

- `title`: texto do título do aviso
- `message`: texto da mensagem
- `active`: `true` para exibir ou `false` para ocultar
- `type`: `info`, `warning` ou `success` (opcional)
- `createdAt`: campo do tipo **Timestamp** do Firebase

Exemplo:

```text
siteNotices
  aviso_01
    title: "Manutenção programada"
    message: "O Guild Manager ficará em manutenção hoje às 22h."
    active: true
    type: "warning"
    createdAt: Timestamp
```

A aba **Eventos** mostra somente inscrições pendentes. Depois que o líder aceita ou rejeita, a inscrição deixa Eventos e o registro aparece em **Logs**, visualmente mais escuro e com o status `Aceito` ou `Rejeitado`.
