# Guild Manager — estrutura do banco

## Verificação da guilda

O campo `verified` fica no documento principal de cada guilda. O site cria novas guildas com `verified: false` e a regra do banco impede que uma guilda seja criada já verificada.

Para verificar uma guilda, a administração altera manualmente o campo para `true` no painel do banco. O líder não possui botão para fazer isso no site e a regra de atualização impede que usuários comuns alterem esse campo.

```text
verified: false  → guilda normal
verified: true   → selo de verificação
```

Quando a guilda passa a ser verificada, o líder recebe o aviso correspondente na próxima abertura da guilda.

## Estrutura organizada

Use esta estrutura como referência para os novos dados. Não é necessário apagar os documentos antigos sem antes confirmar que não estão sendo usados.

```text
guilds/
  GUILD_ID/
    name
    code
    description
    logoData
    verified
    ownerId
    ownerEmail
    alerta
    photoBlocked
    photoBlockReason
    createdAt
    updatedAt

    lines/
      LINE_ID/
        name
        image
        ...

        players/
          PLAYER_ID/
            name
            nick
            photo
            photoBlocked
            photoBlockReason
            ...

    applications/
      APPLICATION_ID/
        guildId
        guildName
        name
        age
        contact
        status
        createdAt
        reviewedAt
        reviewedBy

    logs/
      LOG_ID/
        action
        status
        applicantName
        targetName
        actorUid
        actorEmail
        description
        createdAt

    subLeaders/
      USER_ID/
        uid
        email
        canEditGuild
        allowedLineIds[]

siteNotices/
  NOTICE_ID/
    title
    message
    active
    type
    createdAt
```

### Para que serve cada parte

- `guilds`: informações principais das guildas.
- `lines`: linhas pertencentes a uma guilda.
- `players`: jogadores pertencentes a uma line.
- `applications`: inscrições que ainda podem ser avaliadas pelo líder.
- `logs`: histórico das ações já respondidas e outras ações registradas.
- `subLeaders`: permissões dos sublíderes.
- `siteNotices`: avisos oficiais exibidos na aba Avisos do correio.

## Publicar avisos oficiais

Os avisos oficiais são administrados fora do site. Para criar o primeiro aviso, no painel do banco abra **Cloud Firestore → Dados** e clique em **Iniciar coleção**.

Use exatamente:

```text
siteNotices
```

Depois crie um documento. O ID pode ser automático. Campos:

| Campo | Tipo | Exemplo |
|---|---|---|
| `title` | string | `Manutenção programada` |
| `message` | string | `O serviço passará por manutenção hoje.` |
| `active` | boolean | `true` |
| `type` | string | `warning` |
| `createdAt` | timestamp | data/hora atual |

Tipos visuais disponíveis:

- `info`
- `warning`
- `success`

`active: true` publica o aviso. `active: false` oculta o aviso sem precisar apagar o documento.

**Importante:** se `siteNotices` não aparece ainda na lista de coleções, isso é normal. O Firestore só mostra a coleção depois que o primeiro documento é criado.

## Avisos oficiais

A coleção `siteNotices` fica **na raiz do Cloud Firestore**, no mesmo nível de `guilds` e `users`. Ela **não fica dentro de uma guilda**.

No painel do banco, a estrutura deve aparecer assim:

```text
(default)
├── guilds
├── users
└── siteNotices
    └── ID_DO_AVISO
```

Se `siteNotices` ainda não aparece, crie a coleção em **Iniciar coleção** no nível principal do banco. Depois crie o primeiro documento com `title`, `message`, `active`, `type` e `createdAt`. A coleção passa a aparecer automaticamente na lista.

## Correio

O correio possui três abas:

1. **Eventos** — inscrições pendentes.
2. **Logs** — inscrições já aceitas ou rejeitadas, exibidas em tom mais escuro.
3. **Avisos** — comunicados oficiais.

O contador do correio mostra apenas inscrições pendentes. Avisos novos usam o pequeno indicador de notificação abaixo do correio.

## Inscrições

Após o envio de uma inscrição, o botão fica como **Inscrição enviada** e desativado enquanto a solicitação estiver pendente, evitando spam de solicitações para a mesma guilda.

## Regras de segurança

O arquivo `firestore.rules` acompanha o projeto. Depois de qualquer alteração nas regras, publique o arquivo no projeto correspondente.

Pontos importantes das regras atuais:

- novas guildas precisam nascer com `verified: false`;
- usuários comuns não podem alterar `verified`;
- avisos oficiais não podem ser criados ou alterados pelo site;
- inscrições podem ser criadas como pendentes e avaliadas pelo dono da guilda;
- logs não podem ser editados ou apagados pelo aplicativo;
- acesso de sublíder respeita as permissões cadastradas.

## Migração de dados antigos

Não apague documentos antigos apenas para deixar a tela do painel mais limpa. Se já existem guildas funcionando, mantenha os IDs atuais. A organização proposta serve principalmente para padronizar novos dados e deixar cada responsabilidade em seu próprio local.
