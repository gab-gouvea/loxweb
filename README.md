# Loxweb

Sistema de gestao de alugueis por temporada, feito sob medida para uma pessoa muito especial: minha mae.

Este e um projeto pessoal de minha autoria, desenvolvido com o objetivo de aprender e aplicar tecnologias modernas de desenvolvimento web enquanto resolvo um problema real — ajudar minha mae a gerenciar suas propriedades de aluguel por temporada de forma simples e organizada.

## Sobre o projeto

O Loxweb permite gerenciar todo o fluxo de alugueis por temporada:

- **Propriedades** — cadastro e visualizacao dos imoveis
- **Reservas** — controle de check-in, check-out, hospedes e valores
- **Calendario** — timeline visual de todas as reservas
- **Faxinas** — agendamento e pagamento de faxinas terceirizadas
- **Proprietarios** — gestao dos donos dos imoveis
- **Relatorios** — recebimentos, despesas e manutencoes por mes
- **Inventario e manutencao** — controle por propriedade

## Tecnologias

**Frontend**

- React 19 + TypeScript
- Vite
- Tailwind CSS + shadcn/ui
- TanStack React Query
- React Router
- React Hook Form + Zod

**Backend**

- Java + Spring Boot
- Spring Security com JWT
- MySQL

## Como rodar

```bash
# instalar dependencias
npm install

# configurar variavel de ambiente
cp .env.example .env
# editar VITE_API_URL no .env para apontar para o backend

# rodar em desenvolvimento
npm run dev
```

O backend (repositorio separado) precisa estar rodando para a aplicacao funcionar.

## Deploy

A aplicacao esta configurada para deploy gratuito:

- **Frontend:** Vercel
- **Backend:** Render
- **Banco de dados:** Neon (PostgreSQL)
