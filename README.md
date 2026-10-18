# Tehnosen – E-trgovina (prodavnica)

Platforma za e-trgovinu na srpskom jeziku, namenjena pregledu proizvoda i simulaciji procesa kupovine. Projekat kombinuje „responzivni” (prilagodljivi) korisnički interfejs sa lokalnim Node.js „mock” API-jem (simuliranim interfejsom za razmenu podataka).

## Funkcionalnosti

- Katalog proizvoda sa detaljnim opisima i recenzijama
- Korpa za kupovinu sa opcijom podešavanja količine proizvoda
- Registracija i prijavljivanje korisnika
- Formular za završetak kupovine (checkout) sa izborom načina isporuke i plaćanja
- Validacija promotivnih kodova
- Kontakt obrazac
- Lokalni „mock” API za upravljanje podacima o proizvodima, korisničkim nalozima, porudžbinama, recenzijama i kontakt porukama

## Tehnološki stek

- HTML, CSS i JavaScript
- React – za interfejs korpe za kupovinu
- Node.js – za lokalni „mock” API i razvojni server
- JSON datoteke – za čuvanje podataka o proizvodima i simulaciju baze podataka (perzistenciju podataka)

## Pokretanje na lokalnom računaru

Zahtev: Node.js

Iz direktorijuma projekta pokrenite komandu:

```bash
npm run dev

Ovo pokreće veb-sajt i simulirani API (mock API). Otvorite http://localhost:8093 u svom veb-pregledaču.

Simulirani API radi na portu 3001. Ako je neki od ovih portova već zauzet, prekinite proces koji ga koristi pre pokretanja projekta.

## Struktura projekta

index.html — početna tačka veb-sajta
css/ — stilovi za izgled prodavnice
js/ — logika aplikacije, korpe za kupovinu, prijavljivanja i stranice proizvoda
src/api/apiClient.js — API klijent na strani klijenta (frontend)
api_response.json — podaci o katalogu proizvoda
postman/mocks/mock.js — lokalni server za simulirani API
