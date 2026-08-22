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
- jedna konsultacja Vet 24/7 miesięcznie w planie Premium,
- przejście do rezerwacji stacjonarnej przez WetTermin,
- psy i koty jako główne gatunki oraz rozszerzalny wybór innych zwierząt,
- zapis danych demonstracyjnych w pamięci przeglądarki.

## Model biznesowy

- prowizja od zrealizowanych usług,
- abonament PupilCare Premium,
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

## Stack

React 19, TypeScript, Vinext/Vite i CSS. Projekt jest przygotowany do kolejnego
etapu: logowania, trwałej bazy danych, prawdziwego API AI, płatności i transmisji
wideo z lekarzem PupilCare.
