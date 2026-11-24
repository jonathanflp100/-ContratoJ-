# ContratoJá

Gerador de contratos com IA e assinatura eletrônica pelo WhatsApp (Brasil e Paraguai).

## Como funciona por dentro

- **Front-end** (React + Vite): as telas. Para ficar rápido, os dados ficam em memória e são enviados ao servidor automaticamente, menos de 1 segundo depois de cada alteração.
- **Servidor** (`server.ts` + pasta `server/`): guarda os dados no Supabase, controla os **créditos** (o navegador não consegue alterar o saldo), recebe as **assinaturas** dos clientes e gera o **hash SHA-256**. É ele que chama o Gemini, então a chave fica escondida.
- **Supabase**: login (e-mail + senha) e banco de dados. O navegador usa o Supabase só para o login; todo o resto passa pelo servidor.

## Rodar no seu computador

```bash
npm install
cp .env.example .env   # coloque pelo menos a GEMINI_API_KEY
npm run dev            # http://localhost:3000
```

Sem as variáveis do Supabase, o app roda em **modo desenvolvimento**: os dados ficam em `data/dev-db.json` e o login não confere a senha. Serve para testar; **nunca use assim em produção**.

## Ligar o Supabase (produção)

1. Crie um projeto em https://supabase.com.
2. Em **SQL Editor → New query**, cole o conteúdo de `supabase/schema.sql` e clique em **Run**.
3. Em **Project Settings → API**, copie para o `.env` do servidor (ou para os Secrets do AI Studio / Environment Variables da Vercel):
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (**secreta**: nunca coloque no front-end nem no GitHub)
4. Em **Authentication → URL Configuration**, coloque o endereço do app em *Site URL*. É para lá que o link de confirmação de e-mail leva.
5. (Opcional) Em **Authentication → Providers → Email**, desligue *Confirm email* se não quiser exigir a confirmação de e-mail durante os testes.

## Créditos e pagamento

- Conta nova ganha 2 créditos. Cada contrato finalizado ou enviado para assinatura gasta 1, só uma vez por contrato.
- Compartilhar um modelo na biblioteca dá +2 créditos, no máximo 5 vezes por conta.
- A compra de créditos ainda é **simulada**. Em produção ela fica desligada, a menos que `ALLOW_SIMULATED_PAYMENTS=true`. O próximo passo é ligar o Mercado Pago (Pix) e a Pagopar/Bancard: o webhook do pagamento chama a mesma lógica da rota `/api/credits/purchase`.

## Assinatura e verificação

- O link `/assinar/<contrato>/<token>` funciona em qualquer celular. O token tem 128 bits e só quem recebeu o link consegue assinar.
- O servidor registra data e hora (pelo relógio do servidor), IP, navegador e fuso. Também respeita a ordem sequencial dos signatários e não aceita assinar duas vezes.
- Depois de assinado e selado com o hash, o contrato não pode mais ser alterado.
- `/verificar`: com o **hash** (QR code do PDF), mostra o documento completo. Com o **código curto** (CJ-2026-001), mostra só um resumo, sem o conteúdo, para ninguém conseguir "adivinhar" contratos de outras empresas.

## Conta demonstração

O botão de demonstração continua funcionando sem login. Os dados dela ficam só no navegador e nunca vão para o servidor.
