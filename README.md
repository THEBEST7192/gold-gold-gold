# Busskappløp

En Next.js + Leaflet‑app som strømmer sanntids bussposisjoner fra Entur og lar spillere tippe på hvilken buss som reiser lengst innen en valgt tidsperiode.

## Teknologistack
- Next.js 16, React 19, TypeScript 5
- Tailwind CSS v4 via PostCSS
- Leaflet for kart
- Biome for linting og formatering

## Forutsetninger
- Node.js 18+ og npm 9+
- Et klientnavn for Entur‑API (brukes som ET‑Client‑Name)

## Kom i gang
- Installer avhengigheter: `npm i`
- Konfigurer miljø:
  - Opprett en `.env.local` i prosjektroten med:
    - `ENTUR_CLIENT_NAME=din-app`
- Start utviklingsserver: `npm run dev`
- Åpne nettsiden: http://localhost:3000

## UI og brukeropplevelse
- Velg en “Race zone” for området du vil følge
- Sett antall busser som skal delta i kappløpet
- Ensartet og polert UI med animerte piler i nedtrekksmenyer (SetupSelect)
- Fokus på tydelig state‑håndtering og enkel komposisjon av komponenter

## Miljøvariabler
- `ENTUR_CLIENT_NAME`: Kreves av Entur‑API og sendes som ET‑Client‑Name‑header. Uten denne vil API‑rutene returnere en feil.

## Tilgjengelige skripter
- `npm run dev`: Starter utviklingsserver
- `npm run build`: Bygger for produksjon
- `npm run start`: Kjører bygget app
- `npm run lint`: Lint med Biome
- `npm run format`: Formaterer med Biome

## Hvordan det fungerer
- Live datastrøm:
  - SSE‑endepunktet `/api/entur` henter busser fra Entur med faste intervaller, beriker med nærliggende stopp, og strømmer oppdateringer til klienten.
- Stoppdata:
  - Lastes fra tekstfiler i `src/app/api/data/` (f.eks. `stops.txt`).
- Bakgrunnsjobb (valgfritt):
  - Inngest‑funksjonen lytter på hendelsen `app/entur.fetch` og henter busser via `getAvailableBuses`; den kjøres i `step.run` med innebygde retries og begrenset samtidighet (4).
  - Brukes når du trenger periodiske eller hendelsesstyrte oppdateringer uten aktiv nettleser‑tilkobling (f.eks. planlagte jobber eller integrasjoner). Vanlig SSE‑strømming fungerer uten denne.
- Brukergrensesnitt:
  - Hovedside og løpslogikk: `src/app/page.tsx`
  - Komponenter: `src/components/BusCard.tsx`, `src/components/BusMap.tsx`, `src/components/PlayerBets.tsx`, `src/components/RaceSetup.tsx`

## Struktur
- `src/app/page.tsx` - inngangspunkt
- `src/components/RaceSetup.tsx` - oppsett av løp (nedtrekksmenyer)
- `src/components/BusCard.tsx` - visning av bussdata
- `src/components/BusMap.tsx` - kartlogikk
- `src/components/PlayerBets.tsx` - spillerinnsatser
- `src/lib/utils.ts` - hjelpefunksjoner
- `src/app/types.ts` - TypeScript‑typer

## Styling
- Tailwind CSS v4 via PostCSS
- Globale stiler: `src/app/globals.css`

## Utvikling
- Lokal utvikling skjer med Next.js dev‑server (`npm run dev`) på Node 18+.
- Biome brukes til linting/formattering, TypeScript 5 for typer, Tailwind CSS v4 via PostCSS for styling.
- SSE-/API‑ruter kjører lokalt; `ENTUR_CLIENT_NAME` må settes i `.env.local` for å hente data fra Entur.

## Hosting
- Bygg med `npm run build` og start med `npm run start` på en Node 18+ runtime.
- Passer for plattformer som Vercel eller egen Node‑server; sørg for at `ENTUR_CLIENT_NAME` er satt i miljøet.
- Valgfri bakgrunnsjobb kan kjøres via Inngest‑integrasjonen for hendelsesstyrte oppdateringer uten en aktiv nettleser‑tilkobling.

## Mål
- Konsekvent og enkel brukeropplevelse
- Gjenbrukbar og vedlikeholdbar komponentstruktur

## Videre arbeid
- Persistens med LocalStorage for å lagre valgt sone og antall busser, slik at brukeropplevelsen forblir konsistent ved sideoppdatering.
- Videreutvikle poengtavlen til å bli mer visuelt spennende og unik, da den nåværende løsningen er for enkel og skiller seg ikke ut nok i grensesnittet.
- Forbedre logikken ved gjenoppkobling etter rate-limiting (429) for å sikre at kartet og rute-linjen (trail) ikke forsvinner; i dag beholdes distanse reist, men de visuelle sporene på kartet nullstilles.
