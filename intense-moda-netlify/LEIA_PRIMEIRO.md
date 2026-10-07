# Intense Moda na Netlify

Este pacote contém a loja para os clientes e o painel protegido por senha. Não é apenas uma página estática: as roupas, as fotos e as publicações ficam no armazenamento da Netlify.

## Publicar

1. Extraia o ZIP. Você terá a pasta `intense-moda-netlify`.
2. Entre na sua conta da Netlify: https://app.netlify.com/
3. Na área de projetos, use **Add new project → Deploy manually**, ou abra https://app.netlify.com/drop enquanto estiver conectado à sua conta.
4. Envie a pasta completa `intense-moda-netlify`, que contém `package.json`, `netlify.toml`, `public` e `netlify`. Não envie apenas a pasta `public`.
5. Se a tela pedir as configurações, use:
   - Build command: `npm run build`
   - Publish directory: `public`
   - Functions directory: `netlify/functions`
6. Acompanhe o deploy. Antes de divulgar, confira se aparecem as funções `store` e `auth` na seção **Functions** do projeto.

O upload de um projeto completo, quando conectado à conta, permite que a Netlify instale as dependências e execute o build. Se a sua tela aceitar somente arquivos já prontos e não executar o build, use o caminho de repositório abaixo ou a publicação pelo terminal. O painel depende das funções; subir somente o HTML não ativa os cadastros.

## Ativar sua senha

No projeto, abra **Project configuration → Environment variables**. Adicione:

| Campo | Valor |
|---|---|
| Key | `ADMIN_PASSWORD` |
| Value | Uma senha privada de pelo menos 16 caracteres, escolhida por você |
| Scope, se aparecer | Functions |
| Context | Production |

Guarde essa senha. Não use a senha da sua conta da Netlify ou do ChatGPT e não coloque senhas em arquivos publicados. O pacote não contém uma senha padrão. Sem configurar a senha, ninguém consegue cadastrar ou publicar roupas.

Depois de salvar a variável, faça um novo deploy para aplicá-la. Para economizar uma publicação, você pode primeiro criar um projeto por um repositório, configurar a variável antes de liberá-lo e publicar uma única vez; ao enviar a pasta manualmente e configurar depois, poderão ser necessárias duas publicações.

**Atenção ao saldo informado de 37 créditos:** no plano por créditos, duas publicações bem-sucedidas em produção usam 30 créditos e deixariam 7, antes dos demais consumos. Uma única publicação usa 15 e deixaria 22. Confira a data de renovação e o saldo na Netlify antes de publicar. Não fiz nenhum deploy na sua conta.

## Links depois da publicação

- **Clientes:** use o endereço principal que a Netlify fornecer.
- **Painel:** acrescente `/painel` ao mesmo endereço. Ele pede a senha antes de mostrar suas roupas cadastradas.

No painel, coloque foto, nome, descrição, preço, cor, categoria e tamanhos. Clique em **Salvar rascunho**. Quando estiver tudo certo, clique em **Publicar alterações** e confirme. Para excluir, use **Remover** e publique novamente.

Salvar ou publicar roupas pelo painel não gera um novo deploy do site. Os dados permanecem no Netlify Blobs mesmo depois de novas publicações de código. As sessões duram oito horas; depois disso, entre novamente. Alterar `ADMIN_PASSWORD` e aplicar a variável por um deploy invalida as sessões anteriores.

## Atualização automática e consumo

Quem abrir a loja recebe a versão publicada mais recente. Uma página aberta e em uso verifica alterações a cada **60 segundos**, além de consultar ao voltar à aba. As verificações param em abas ocultas e após cinco minutos sem interação, para reduzir o consumo.

Essa atualização é automática, com atraso de até cerca de um minuto enquanto a página estiver ativa; não é transmissão instantânea. O painel conserva o fluxo de rascunho e publicação para que clientes não vejam cadastros incompletos.

Os acessos, as fotos enviadas e as funções podem consumir recursos e créditos. Não há garantia de que o saldo de 37 será suficiente por um período específico. O plano gratuito possui limite: se os créditos terminarem, a Netlify pode pausar todos os projetos da equipe até a renovação. O site original continua disponível no endereço anterior.

## Outra forma de publicar: repositório

Crie um repositório privado na sua conta do GitHub e envie os arquivos desta pasta, mantendo a estrutura. Na Netlify, escolha **Add new project → Import an existing project**, conecte o repositório e use as configurações indicadas acima. Configure `ADMIN_PASSWORD` como variável antes do primeiro deploy, se a tela permitir. Nunca inclua o valor da senha no GitHub.

## Outra forma de publicar: terminal

Com Node.js 22 ou mais recente instalado, abra um terminal nesta pasta:

```sh
npm install
npx netlify login
npx netlify sites:create
npx netlify link
```

Na conta da Netlify, configure `ADMIN_PASSWORD` no projeto recém-criado. Em seguida, publique:

```sh
npx netlify deploy --build --prod
```

`sites:create` cria o projeto; `link` seleciona esse mesmo projeto. Não publique em produção repetidamente para testar: isso consome créditos. As instruções não incluem tokens ou senhas de acesso.

## O que foi mantido

- Visual preto e dourado e capa atual.
- Fotos e descrições, categorias Feminino, Masculino e Infantil, tamanhos adultos e infantis.
- Pedidos para o WhatsApp (19) 99994-1805. O cliente precisa tocar em Enviar no WhatsApp.
- Pix, débito e crédito em até 6 vezes, com condições a confirmar na loja. O site não processa pagamentos.
- Retirada na loja; sem entrega.
- Botão Como chegar usando o link informado da loja.

O catálogo publicado do site original estava vazio ao preparar este pacote. Rascunhos que ainda não foram publicados no painel original não foram transferidos. Os dois painéis terão cadastros separados; depois da mudança, use o painel da Netlify para atualizar a loja da Netlify.

## Verificação realizada

O pacote foi testado localmente com o SDK e o servidor de desenvolvimento oficial do Netlify Blobs: bloqueio do painel sem senha, fotos e descrições persistidas, rascunhos separados do catálogo público, edição e remoção, publicação, detecção de versões antigas e proteção de sessão. As duas funções foram compiladas. Ainda é necessário concluir a publicação e verificar a configuração na sua própria conta da Netlify.

Referências oficiais:
- https://docs.netlify.com/deploy/create-deploys/
- https://docs.netlify.com/build/data-and-storage/netlify-blobs/
- https://docs.netlify.com/build/functions/api/
- https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/how-credits-work/
