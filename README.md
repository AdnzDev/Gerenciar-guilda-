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
