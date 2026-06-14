# Instrukcja wdrożenia RASCI Manager

## Krok 1 — Baza danych (Supabase)

1. Wejdź na https://supabase.com i utwórz darmowe konto
2. Kliknij **New project** → nadaj nazwę → wybierz region (EU West)
3. Przejdź do **SQL Editor** (lewy panel)
4. Wklej całą zawartość pliku `supabase_schema.sql` i kliknij **Run**
5. Przejdź do **Project Settings → API**
6. Skopiuj:
   - **Project URL** → to jest `VITE_SUPABASE_URL`
   - **anon public** key → to jest `VITE_SUPABASE_ANON_KEY`

## Krok 2 — Hosting (Vercel)

1. Wejdź na https://vercel.com i zaloguj się przez GitHub
2. Kliknij **Add New → Project**
3. Zaimportuj to repozytorium z GitHub
   - (jeśli nie masz jeszcze repo: `git init && git add . && git commit -m "init" && gh repo create rasci-manager --public --push`)
4. Podczas konfiguracji projektu dodaj **Environment Variables**:
   - `VITE_SUPABASE_URL` = wartość z kroku 1
   - `VITE_SUPABASE_ANON_KEY` = wartość z kroku 1
5. Kliknij **Deploy**

Po wdrożeniu aplikacja będzie dostępna pod adresem `https://rasci-manager.vercel.app` (lub podobnym).

## Dostęp do aplikacji

Przy pierwszym wejściu aplikacja automatycznie generuje unikalny `workspace_id` i zapisuje go w localStorage przeglądarki.
Twoje projekty są dostępne pod URL: `https://twoja-domena.vercel.app/{workspace_id}`

**Kopiuj ten link** za pomocą przycisku w nagłówku — to jedyny sposób dostępu do Twoich danych.
Przechowaj go w bezpiecznym miejscu. Ktoś, kto zna link, ma pełny dostęp do przestrzeni roboczej.

## Lokalne uruchomienie

```bash
cp .env.example .env
# uzupełnij .env wartościami z Supabase
npm install
npm run dev
```
