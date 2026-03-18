# Loxweb

Sistema de gestao de alugueis por temporada, feito sob medida para uma pessoa muito especial: minha mae.

Este e um projeto pessoal de minha autoria, desenvolvido com o objetivo de aprender e aplicar tecnologias modernas de desenvolvimento web enquanto resolvo um problema real — ajudar minha mae a gerenciar suas propriedades de aluguel por temporada de forma simples e organizada.

## Sobre o projeto

O Loxweb permite gerenciar todo o fluxo de alugueis por temporada:

- **Propriedades** — cadastro de imoveis com foto, tipo (apartamento, casa, cobertura, etc.), endereco e informacoes de acesso
- **Reservas** — controle de check-in, check-out, hospedes, valores e status automatico
- **Calendario** — timeline visual de todas as reservas com navegacao por mes
- **Faxinas** — agendamento, custo e pagamento de faxinas terceirizadas
- **Proprietarios** — gestao dos donos dos imoveis com CPF e dados de contato
- **Relatorios** — recebimentos, despesas e manutencoes por mes com calculo de comissao
- **Inventario e manutencao** — controle por propriedade com manutencoes agendadas e recorrentes
- **Alertas** — notificacoes em tempo real para check-ins, faxinas pendentes e manutencoes

## Tecnologias

**Frontend**

- React 19 + TypeScript 5.9
- Vite 7
- Tailwind CSS 4 + shadcn/ui (Radix UI)
- TanStack React Query v5
- React Router v7
- React Hook Form + Zod v4
- Zustand (estado do calendario)
- date-fns + react-day-picker
- jspdf + html2canvas-pro (geracao de PDFs)

**Backend** (repositorio separado)

- Java 21 + Spring Boot 3
- Spring Security com JWT (HS256, 24h expiracao)
- PostgreSQL (Supabase)
- Cloudinary (upload de imagens)

## Infraestrutura

| Servico | Provedor | Plano |
|---------|----------|-------|
| Frontend | Vercel | Free |
| Backend | Fly.io | Free (shared-cpu-1x, 1GB RAM) |
| Banco de dados | Supabase | Free (PostgreSQL) |
| Imagens | Cloudinary | Free |
| Dominio | Registro.br | fernandagouvea.com.br |

## Como rodar localmente

```bash
# instalar dependencias
npm install

# configurar variavel de ambiente
cp .env.example .env
# editar VITE_API_URL no .env (ex: http://localhost:8080/api)

# rodar em desenvolvimento
npm run dev
```

O backend precisa estar rodando para a aplicacao funcionar.
