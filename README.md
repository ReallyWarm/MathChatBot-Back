# MathChatBot-Back

## Project Overview

This is the backend for Math Teaching Chatbot System. The full project is split across multiple repositories:

- Frontend: [MathChatBot-Front](https://github.com/Rezzpect/MathChatBot-Front)
- Backend: [MathChatBot-Back](https://github.com/ReallyWarm/MathChatBot-Back) (you are here)
- n8n-Workflow:

## Installation

1\. Create a new Supabase project on [supabase.com](https://supabase.com)

2\. Set up your Publishable API key and Secret API key

(Supabase Dashboard -> Settings -> API Keys)

3\. Set up your JWT Signing Keys

(Supabase Dashboard -> Settings -> JWT Keys)

4\. Clone the repository

```terminal
git clone https://github.com/you/my-supabase-project.git
cd my-supabase-project
```

Install the Supabase CLI module

```terminal
npm install
```

5\. Copy `.env.example` to `.env` and fill in your project’s secrets (API keys and n8n webhook URLs)

```terminal
cp .env.example .env
```

6\. Connect the Supabase CLI to your Supabase account by logging in with your browser

```terminal
supabase login
```

7\. Link your remote Supabase project using the Project ID
Get your Project ID from (Supabase Dashboard -> Settings -> General)

```terminal
supabase link --project-ref <your-project-id>
```

8\. Apply the configurations to your Supabase project

```terminal
supabase config push
```

9\. Run all Database migrations (creates tables, functions, policies, RLS)

```terminal
supabase db push
```

10\. Deploy all Edge functions

```terminal
supabase functions deploy --no-verify-jwt
```

## 👥 Contributors

- [@Apec](https://github.com/Rezzpect)
- [@K_firm1208](https://github.com/Kfirm1208)
- [@ReallyWarm](https://github.com/ReallyWarm)
