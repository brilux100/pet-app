# PupilCare

Webowa wersja polskiego ekosystemu opieki nad zwierzętami. PupilCare prowadzi
opiekuna od pytania lub przypomnienia do konkretnego działania: AI, lekarza,
wizyty, usługi albo produktu. Pierwszy pilotaż jest przeznaczony dla Gdańska i
Trójmiasta.

## Aktualny zakres MVP

- responsywny dashboard dla komputera i telefonu,
- wiele profili pupili z szybkim przełączaniem,
- profil zdrowia i historia szczepień,
- wizyty i przypomnienia,
- dokumenty pupila,
- AI Asystent odpowiadający wyłącznie na pytania związane z pupilem,
- limit pięciu bezpłatnych pytań z przejściem do Premium,
- bezpłatne ostrzeżenia bezpieczeństwa również po wykorzystaniu limitu,
- własny przepływ Vet 24/7: wywiad, potwierdzenie płatności, przekazanie danych,
  rozmowa wideo i zapis podsumowania,
- Vet 24/7 za 89,99 zł albo 49,99 zł w planie Premium,
- przejście do rezerwacji stacjonarnej przez WetTermin,
- psy i koty jako główne gatunki oraz rozszerzalny wybór innych zwierząt,
- logowanie przez e-mail, Google, Facebook i Apple po podłączeniu Supabase,
- trwała baza profili i historii z politykami Row Level Security.

## Model biznesowy

- opłata serwisowa 9,99 zł za rezerwację lub 4,99 zł w Premium,
- abonament PupilCare Premium za 39,99 zł miesięcznie,
- rabaty i polecenia produktów partnerów.

## Integracje

WetTermin jest pierwszym kandydatem do rezerwacji wizyt weterynaryjnych.
Docelowa integracja powinna udostępniać wyszukiwanie klinik, wolne terminy,
tworzenie i anulowanie rezerwacji oraz status zakończenia wizyty. Do czasu
uzyskania API aplikacja korzysta ze śledzonego przejścia do WetTermin.

## Uruchomienie

Wymagany jest Node.js 22.13 lub nowszy.

    npm ci
    npm run dev

Wersję produkcyjną sprawdzisz poleceniem:

    npm run build

## Supabase

1. Utwórz projekt Supabase.
2. Uruchom migrację `supabase/migrations/202608220001_pupilcare_core.sql`.
3. Włącz logowanie e-mail oraz wybrane integracje Google, Facebook i Apple.
4. Ustaw w środowisku aplikacji `SUPABASE_URL` i `SUPABASE_ANON_KEY`.

Klucz `SUPABASE_SERVICE_ROLE_KEY` nie może być używany w przeglądarce ani
zapisywany w repozytorium. Bez konfiguracji Supabase aplikacja udostępnia
bezpieczną wersję demonstracyjną.

## Stack

React 19, TypeScript, Vinext/Vite, Supabase Auth/Postgres i CSS. Kolejne
integracje to produkcyjne API AI, Stripe oraz własna transmisja wideo z lekarzem
PupilCare.
