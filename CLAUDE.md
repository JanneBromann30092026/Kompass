# Kompass – Kundenbetreuung für Versicherung & Vorsorge

## Vision
Kompass ist eine Progressive Web App (PWA) für meine Kundenbetreuung (Versicherung & Vorsorge). Primäres Zielgerät ist ein **iPad (Safari, als Homescreen-App installiert)**, bedient per Touch und optional mit Hardware-Tastatur. Alle Kundendaten bleiben **ausschließlich verschlüsselt auf dem Gerät**; die App funktioniert vollständig offline (außer der optionalen KI).

1. **Kunden:** Kundenakten (Kunden-ID K-0001, Vorname, optional Nachname und Kontakt, Geburtsdatum, Lebenssituation, Verträge je Sparte, Einwilligungen). Direkt aus der Akte anrufen, WhatsApp oder E-Mail. Neuer Kunde über einen geführten Fragenkatalog.
2. **Bedarf:** Eine Regel-Engine erkennt aus den Fakten, was jetzt, später oder nicht sinnvoll ist – mit Priorität (1 existenziell, 2 wichtig, 3 optional) und Begründung. Echter Bedarf vor Provision.
3. **Wiedervorlagen:** werden automatisch aus Fakten abgeleitet (Ausbildungsende, 18. Geburtstag, Jahresgespräch, genannte Ereignisse), als Liste mit Fälligkeiten gezeigt und lassen sich in den iPad-Kalender übernehmen. Geburtstagsliste auf der Startseite.
4. **Gespräche:** Gesprächsaufhänger (3–5 pro Kunde), Gesprächsvorbereitung auf einer Bildschirmseite, Gesprächsnotizen mit Verlauf – auch per Diktat.
5. **Segmente & Aktionen:** Zielgruppen filtern, Seminare planen, Einladungslisten **nur mit Werbeeinwilligung**, Einladungstexte.
6. **Dashboard:** Kundenzahl, fällige Wiedervorlagen, Produktabdeckung je Sparte, offene Bedarfe nach Priorität, Pipeline.
7. **Kunden-Netz:** frei verschiebbare, zoombare Karte (wie das Gehirn in Synapse): Kunden verbunden mit Produkten, Lebensphasen, Lebensereignissen und Themen.

## Arbeitsumgebung (wichtig)
- Der Nutzer hat **nur ein iPad**, keinen Rechner. Entwickelt wird ausschließlich in Claude-Code-Cloud-Sitzungen. Der Nutzer kann keine Befehle lokal ausführen und keinen Dev-Server öffnen.
- Der Nutzer sieht die App nur über das Deployment auf GitHub Pages: https://jannebromann30092026.github.io/Kompass/ (Deploy automatisch per GitHub Actions bei jedem Push auf main).
- Deshalb gilt für jeden Schritt: Die App selbst mit Playwright (vorinstalliertes Chromium, kein "playwright install") gegen den Production-Build (vite preview) prüfen und **Screenshots im iPad-Format** (Querformat 1180×820 und Hochformat 820×1180, deviceScaleFactor 2, hasTouch, isMobile) erstellen und dem Nutzer zeigen.
- Entwicklerwerkzeuge (Komponentenübersicht, Demo-Daten, synthetische Großdaten) müssen auch im Production-Build erreichbar sein, versteckt hinter einem Schalter "Entwicklermodus" in den Einstellungen.
- Arbeite auf einem Feature-Branch und erstelle am Ende einen Pull Request mit kurzer deutscher Beschreibung, was der Nutzer nach dem Mergen auf dem iPad prüfen soll.
- Das Repo ist **öffentlich** (GitHub Pages im kostenlosen Plan). Es enthält **nie** echte Kundendaten, nur Code und erfundene Demo-Daten.
- Schwesterprojekt **Synapse** (öffentliches Repo `JanneBromann30092026/Synapse-`): gleiche Arbeitsweise und Technik. Infrastruktur und Komponenten dürfen von dort kopiert und angepasst werden; die Apps bleiben aber vollständig getrennt (eigenes Repo, eigene Daten, keine gemeinsamen Pakete).
- Fachinhalte und Testkunden stammen aus dem privaten Repo `JanneBromann30092026/Kunden-Wissensdatenbank` (Notizen zu Bedarfslogik, Lebensphasen, Ereignissen, Themen, 12 Testkunden).

## Tech-Stack (verbindlich, nicht ohne Rückfrage ändern)
Gleiche Versionen wie Synapse (dort in package.json nachsehen):
- Node.js 22 LTS (.nvmrc und "engines")
- Vite + React 19 mit TypeScript im strict-Modus (kein any, keine ts-ignore ohne Begründungskommentar)
- vite-plugin-pwa (Workbox) für Manifest, Service Worker, Offline-Fähigkeit und Update-Hinweis
- Tailwind CSS 4 (@tailwindcss/vite), Design-Tokens als CSS-Variablen
- Motion (Paket "motion", Import aus "motion/react") für Animationen
- lucide-react für Icons, Inter als Schrift (@fontsource-variable/inter)
- Zustand für UI-State
- react-router (HashRouter, Import aus "react-router") für Navigation
- Dexie.js (IndexedDB) als lokale Datenbank, versioniertes Schema als Migrationen
- **Web Crypto API** (PBKDF2 + AES-GCM) für die Verschlüsselung – keine Krypto-Bibliotheken von Dritten
- zod für Validierung
- @anthropic-ai/sdk direkt im Browser (dangerouslyAllowBrowser: true), **optional** und standardmäßig aus (Standardmodell: claude-haiku-4-5-20251001, konfigurierbar)
- react-force-graph-2d für das Kunden-Netz
- Vitest (+ fake-indexeddb) für Unit-Tests, @playwright/test exakt 1.56.1 für Smoke-Tests und Screenshots, ESLint + Prettier
- Deployment: GitHub Actions → GitHub Pages (Vite base: "/Kompass/")

## Architekturprinzipien
- **Alle Kundendaten bleiben auf dem Gerät und sind verschlüsselt.** Beim ersten Start legt der Nutzer ein App-Passwort fest. Daraus wird per PBKDF2 (SHA-256, ≥ 600.000 Iterationen, zufälliges Salt) ein AES-GCM-256-Schlüssel abgeleitet, der **nur im Arbeitsspeicher** liegt (CryptoKey, nicht extrahierbar). Gespeichert werden nur Salt, Iterationen und ein verschlüsselter Prüfwert.
- Personenbezogene Daten liegen in Dexie nur als verschlüsselte `payload` (Ciphertext + IV). Unverschlüsselt sind ausschließlich technische Felder (UUID, Fremdschlüssel-UUID, updatedAt). Suchen, Filtern und Sortieren passieren im Speicher nach dem Entschlüsseln (Datenmenge: einige hundert Kunden).
- **App-Sperre:** gesperrt beim Start, nach einstellbarer Inaktivität (Standard 5 Minuten) und wenn die App länger im Hintergrund war. Beim Sperren wird der Schlüssel und alles Entschlüsselte aus dem Speicher entfernt. Passwort vergessen = Daten verloren (klarer Hinweis im Onboarding, Empfehlung: Passwort im iPad-Schlüsselbund speichern, regelmäßig Backup exportieren).
- Beim Start navigator.storage.persist() anfordern. Regelmäßige Export-Erinnerung (verschlüsselte Backup-Datei), weil es keinen automatischen Dateisystem-Zugriff gibt.
- Datenzugriff nur über Repository-Module (src/data/repositories/*); sie ver- und entschlüsseln. Komponenten greifen nie direkt auf Dexie oder die Krypto-Schicht zu. Schemaänderungen nur über neue Dexie-Versionen mit upgrade-Funktion.
- Ein optionaler API-Key liegt ebenfalls verschlüsselt in einer eigenen Tabelle "secrets", wird nie geloggt, nie exportiert und in der UI nie wieder im Klartext angezeigt (nur "Key hinterlegt").
- **KI ist optional und standardmäßig aus.** Alle Funktionen arbeiten ohne KI (Regeln + Textvorlagen). Mit KI werden nur **pseudonymisierte** Daten gesendet: Jahrgang (nie das Geburtsdatum), Lebensphase, Beruf, Wohnsituation, Familienstand, Vertragsstatus, Bedarfe, Ereignisse – **nie** Vor- oder Nachname, Kontaktdaten, Geburtsdatum, Freitext-Notizen oder Kunden-ID. KI-Aufrufe laufen gekapselt über src/services/ai/*.
- Reine Logik (Bedarfsregeln, Wiedervorlagen-Ableitung, Segmente und Einwilligungsprüfung, Aufhänger-Auswahl, Dashboard-Kennzahlen, Krypto-Formate) liegt in framework-unabhängigen Modulen unter src/core/ und ist mit Vitest getestet.
- Jede Änderung an einer Kundenakte wird datiert im Verlauf der Akte protokolliert.
- Content-Security-Policy per meta-Tag, so restriktiv wie möglich; einzige externe Verbindung: api.anthropic.com (nur für die optionale KI).

## Datenschutz-Regeln (fachlich, immer)
- Kunden-ID (K-0001, fortlaufend), Vorname und Geburtsdatum (unbekannt → nur Jahrgang). **Optional** Nachname, Telefon (auch für WhatsApp) und E-Mail – sie verlassen das Gerät nie: nicht an die KI, nicht in Kalender-Exporte, in CSV-Exporte nur bei ausdrücklicher Auswahl mit Warnhinweis. Keine Adresse, IBAN, Steuer-ID, Vertragsnummern.
- **Keine Gesundheitsdaten** (Diagnosen, Gesundheitsfragen aus BU/PKV-Anträgen, Schwangerschaft) – nur „Gesundheitsprüfung erledigt: ja/nein“. Freitextfelder zeigen einen Hinweis darauf.
- Einwilligungen je Kunde: Datenspeicherung, Werbung/Seminar-Einladung, Kontaktkanal, jeweils mit Datum. **Ohne Werbeeinwilligung landet niemand auf einer Einladungsliste** (wird nur gezählt).
- Minderjährige (aus dem Geburtsdatum abgeleitet) werden markiert: Abschlüsse und Werbung nur mit Zustimmung der Eltern; Wiedervorlage zum 18. Geburtstag.
- Geburtstagsgrüße gelten als Werbung: nur bei Werbeeinwilligung vorschlagen (rechtlich prüfen).
- Nur Fakten speichern, die der Nutzer nennt; Unbekanntes bleibt leer und wird als „offener Punkt“ geführt. Steuerliche/rechtliche Hinweise immer als „prüfen“ formulieren, nie als Beratung.

## Fachmodell (Kurzfassung)
- Sparten: BU, Haftpflicht, Kfz (Prio 1) · Unfall, Investmentrente, bAV, VL, Fondssparplan (Prio 2) · Hausrat (Prio 3).
- Vertragsstatus je Sparte: abgeschlossen | geplant | angeboten | abgelehnt | nein | nicht relevant | offen | über Eltern.
- Lebensphasen: Schule, Ausbildung, Studium, Berufsstart, Auszug, Partnerschaft und Heirat, Familie mit Kind, Immobilie, Ruhestand.
- Lebensereignisse: Ausbildungsbeginn, Ausbildungsende (auch Studienende), 18. Geburtstag, Führerschein, Gehaltssprung, Jobwechsel, Umzug, Heirat, Geburt eines Kindes, Elternzeit-Ende, Immobilienkauf, Jahresgespräch.
- Themen: Arbeitskraftabsicherung, Haftung und Sachwerte, Vermögensaufbau, Altersvorsorge.
- Bedarfsregel je Sparte: sinnvoll wenn · nicht sinnvoll wenn · Trigger-Ereignisse · Priorität · typische Einwände. Quelle: `05_Bedarfslogik` im privaten Repo Kunden-Wissensdatenbank.
- Wiedervorlagen: Ausbildungs-/Studienende 3 Monate vorher (1. des Monats) · 18. Geburtstag am Geburtstag (nur Jahrgang bekannt → 1. Januar, „Datum prüfen“) · Jahresgespräch 12 Monate nach dem letzten Gespräch · jedes genannte Ereignis mit Datum.

## Ordnerstruktur (Zielbild)
src/core/            – reine Logik ohne React/Browser-APIs (needs, reminders, segments, consent, hooks, dashboard, crypto-Formate)
src/data/            – Dexie-Datenbank, Schema/Migrationen, Repositories, Typen, Stammdaten (Sparten, Phasen, Ereignisse, Themen, Regeln)
src/services/        – Krypto/Tresor, KI-Provider, Backup/Export
src/app/             – App-Root, Router, Shell, Sperrbildschirm
src/components/ui/   – Design-System-Komponenten
src/features/        – dashboard, customers, needs, reminders, conversations, campaigns, network, settings, transfer, dev
src/styles/          – Tokens, globale Styles, motion.ts
src/i18n/de.ts       – alle UI-Texte zentral (Deutsch)
e2e/                 – Playwright-Tests und Screenshot-Skript

## Design-Leitlinien
Gleiche Designsprache wie Synapse – schlicht, modern, ruhig, abgerundete geometrische Formen (große Radien, Pill-Buttons, Kreise), viel Weißraum, Inter, weiche Schatten und feine Ränder, kurze federnde Spring-Animationen, gezielte Effekte (Glows, sanfte Verläufe) an Schlüsselmomenten: Entsperren, Wiedervorlage erledigt, Bedarf übernommen, Kunden-Netz. Dark und Light Mode, Standard folgt dem System. prefers-reduced-motion wird respektiert.

**Eigene Identität (klar unterscheidbar von Synapse):**
- Akzentfarbe **Petrol/Türkis** statt Violett, deutlich abgegrenzt von Erfolgs-Grün und Warn-Orange; ergänzender Akzent Bernstein für Hinweise auf Bedarf/Fälligkeit.
- App-Icon: abgerundetes Quadrat mit dunklem Petrol-Verlauf und geometrischer **Kompassrose**; Nadel zweifarbig (Türkis/Bernstein). Startbildschirm im selben Stil.
- Name überall „Kompass“ (Manifest name und short_name).

Touch-first (iPad), wie Synapse:
- Tippflächen mindestens 44×44 px. Nichts nur per Hover; Hover-Effekte nur unter @media (hover: hover).
- Safe Areas (env(safe-area-inset-*)), Höhen mit dvh, kein ungewolltes Scrollen/Bounce der Seite.
- Bildschirmtastatur: Formulare mit visualViewport so anpassen, dass das aktive Feld sichtbar bleibt.
- Gesten (Wischen, Long-Press) immer mit sichtbarer Button-Alternative. Tastaturkürzel für Hardware-Tastaturen.
- Hoch- und Querformat, Split View (ab ca. 500 px Breite).

## Konventionen
- UI-Sprache Deutsch (du-Form, freundlich, knapp), Code/Variablen/Kommentare Englisch.
- Keine hartkodierten UI-Texte in Komponenten – alles aus src/i18n/de.ts. Fachliche Textvorlagen (Aufhänger, Einwände, Einladungen) liegen als Daten in src/data, nicht in de.ts.
- IDs sind UUIDs (crypto.randomUUID), Zeitstempel als ISO-Strings in UTC; Kalenderdaten (Wiedervorlagen) als „JJJJ-MM-TT“ in lokaler Zeit.
- Jeder Schritt endet mit: npm run typecheck, npm run lint, npm run test und npm run build ohne Fehler, plus Playwright-Screenshots.
- Implementiere immer nur den aktuell beauftragten Schritt. Baue keine Features künftiger Schritte vor, verbaue sie aber auch nicht.
- Nach Abschluss eines Schritts: Roadmap unten abhaken und unter "Entscheidungen & Notizen" wichtige Abweichungen oder Erkenntnisse kurz dokumentieren.

## Roadmap
- [x] 0 Projektkontext (CLAUDE.md)
- [x] 1 Fundament: Setup, PWA, Deployment, Design-System & Shell (aus Synapse)
- [x] 2 Datenbank, Datenmodell & Verschlüsselung
- [x] 3 Fachwissen & Demo-Daten
- [x] 4 Kundenverwaltung
- [ ] 5 Bedarfs-Engine & Gesprächsaufhänger
- [ ] 6 Wiedervorlagen
- [ ] 7 Gespräche & Gesprächsvorbereitung
- [ ] 8 Dashboard & Pipeline
- [ ] 9 Segmente & Aktionen
- [ ] 10 Einstellungen & optionale KI
- [ ] 11 Kunden-Netz
- [ ] 12 Backups, Export & Import
- [ ] 13 Feinschliff & Installation

## Entscheidungen & Notizen
- Entstehung: Zuerst als Obsidian-Vault, dann als Markdown-Repo mit Claude-Befehlen getestet (privates Repo Kunden-Wissensdatenbank). Entscheidung für eine eigene PWA wie Synapse: Daten nur auf dem iPad und verschlüsselt, KI optional, Name „Kompass“, Synapse-Designsprache mit eigener Farbe.
- Abweichung von der ursprünglichen Spezifikation (bewusst, weil die Daten jetzt nur verschlüsselt auf dem Gerät liegen): optional Nachname, Telefon, E-Mail und genaues Geburtsdatum statt nur Jahrgang. Zusätzlich: Diktat für Notizen, Kalender-Export, Geburtstagsliste.
- Aus Synapse übernommene Erkenntnisse (gelten hier genauso):
  - Versionen: Vite 8, React 19, Tailwind 4 (keine tailwind.config), react-router 8 (Import aus "react-router"), zod 4, Vitest 5, ESLint 10 (Flat Config, type-aware), TypeScript ~6.0 (wegen typescript-eslint), @playwright/test exakt 1.56.1 passend zum vorinstallierten Chromium.
  - CSP nur im Production-Build per Vite-Plugin als erstes meta-Tag; kein 'unsafe-inline'; frame-ancestors weglassen. React-`style`-Props sind erlaubt. `AnimatePresence mode="popLayout"` nicht verwenden (injiziert ein <style>). react-force-graph/float-tooltip injizieren Styles → `noStyleInjectPlugin` aus Synapse übernehmen.
  - Service Worker: generateSW, registerType "prompt", Hinweis „Update verfügbar“, stündliche Prüfung.
  - Theme vor dem ersten Render aus einem localStorage-Spiegel (nur Theme, nie Kundendaten), weil IndexedDB asynchron ist und die CSP keine Inline-Skripte erlaubt. Dunkle Token-Werte doppelt (data-theme und Media-Query-Fallback), kein `light-dark()`.
  - Dexie: Booleans nicht indizieren; `openDatabase()` wirft nie, sondern liefert einen Fehlercode; Fehlerklassen nicht „NotFoundError“ nennen (Dexie wandelt sie um); verschachtelte Lese-Helfer ohne explizite Transaktion (PrematureCommitError in Chrome, fake-indexeddb merkt es nicht).
  - **In liveQuery-Queriern keine Nicht-Dexie-Async-APIs aufrufen – also auch kein crypto.subtle.** Entschlüsseln deshalb außerhalb von liveQuery (z. B. liveQuery liefert verschlüsselte Zeilen/Änderungszähler, ein Store entschlüsselt danach).
  - Lint (react-hooks 7 / React-Compiler-Regeln): keine Komponenten aus Funktionsaufrufen in JSX, kein setState synchron im Effect, keine Ref-Zugriffe im Render. `useEffectEvent` für Listener.
  - Overlays (Modal, BottomSheet, ActionMenu, Tooltip) per Portal, Fokus-Falle, Esc; BottomSheet schließt per Wischen am Griff; Dialoge weichen der Bildschirmtastatur über `useKeyboardInset` (visualViewport) aus.
  - Lightning CSS entfernt `-webkit-`-Präfixe; für Safari nötige Präfixe als Inline-Style setzen.
  - Navigation: ab 900 px Sidebar (einklappbar), darunter Tab-Bar unten.
  - Teilen: Datei schon beim Öffnen des Dialogs erzeugen, damit `navigator.share({files})` direkt im Tipp läuft (iPadOS verlangt eine frische Nutzergeste); ohne Teilen-API Download per Blob-Link.
  - Tests: Touch-Gesten per CDP (`Input.dispatchTouchEvent`), KI immer per `page.route` mocken (inkl. OPTIONS-Preflight), Bildschirmtastatur in Screenshots per gefälschtem `visualViewport` simulieren.
- Schritt 1 (Fundament):
  - Aus Synapse übernommen und angepasst: Projekt-Setup (gleiche Paketversionen, Lockfile aus Synapse beschnitten), vite.config (cspPlugin, splashPlugin, noStyleInjectPlugin, PWA, Chunking), ESLint/Prettier/TS, Workflows, Playwright mit iPad-Profilen, Screenshot- und Icon-Skript, Tokens, UI-Komponenten inkl. Hooks, Theme-Boot, UpdatePrompt, ErrorBoundary, Shell, Tastaturkürzel-Übersicht (`?`). Weggelassen: Karteikarten-Teile, Fehlerprotokoll, Onboarding (kommt mit dem Passwort in Schritt 2), ⌘K-Hinweis, ColorPicker/IconPicker/ProjectAvatar.
  - Datenbank: Dexie-DB `kompass`, Version 1 nur mit Tabelle `settings` (Theme, Bewegung, Seitenleiste, Entwicklermodus). Bewusst unverschlüsselt: technische Werte ohne Personenbezug, die schon vor dem Entsperren gebraucht werden. Schritt 2 ergänzt die verschlüsselten Tabellen als **Version 2**. localStorage-Spiegel: `kompass.bootPrefs`. Eigene Namen sind Pflicht, weil Synapse auf demselben Origin (jannebromann30092026.github.io) läuft.
  - CSP: `connect-src 'self'`; `https://api.anthropic.com` kommt erst mit der KI in Schritt 10 dazu.
  - Farben (alle Textfarben ≥ 4,5:1 auf --bg/--surface): Akzent hell `#0b7285` (weiße Schrift), dunkel `#3cc4cf` mit dunkler Schrift (`--on-accent`). Bernstein: `--amber` für Flächen/Punkte, `--amber-fg` für Text. Erfolg ist gelbgrün (`#15803d`/`#4ade80`), Warnung rot-orange (`#c2410c`/`#fb923c`) – so bleiben Akzent, Bernstein und Status klar getrennt. Gefüllte Status-Buttons nutzen `--on-success`/`--on-danger`/`--on-warning`. Badge-Ton `amber` für Bedarf/Fälligkeit.
  - Icon: Quelle `public/icons/favicon.svg` (Kompassrose, Nadel Türkis/Bernstein). `npm run icons` erzeugt pwa-192/512 mit transparenten Ecken sowie apple-touch-icon und maskable als randlose Variante (ohne `rx`), weil iOS/Android selbst maskieren; dazu iOS-Startbilder hell/dunkel.
  - Fokusmodus: Seiten fordern ihn mit `useFocusModeRequest(active)` an (Zähler-Store in src/app/shell/focusMode.ts); beim Verlassen der Seite endet er automatisch. Test in /dev/ui.
  - Platzhalterseiten liegen in src/features/coming-soon und werden in den jeweiligen Schritten durch echte Seiten ersetzt. Routen: /dashboard, /customers, /reminders, /campaigns, /network, /settings, /dev/ui.
  - Split View (500 px): Tab-Beschriftungen kürzen sich mit „…“ statt überzulaufen. `npm run screenshots` erzeugt zusätzlich `icon-preview.png` und `*-split-dark.png`.
- Schritt 2 (Datenbank, Datenmodell & Verschlüsselung):
  - Dexie **Version 2** (nicht 1 wie im Prompt), weil Version 1 (nur `settings`) seit Schritt 1 ausgeliefert ist: neue Tabellen meta, customers, needs, reminders, lifeEvents, conversations, campaigns, history, secrets, snapshots, errorLog; keine Datenmigration nötig (Upgrade-Test vorhanden). Lesbar sind nur id/key, customerId, updatedAt (bzw. createdAt/at); alles andere steckt in `payload`. Auch errorLog ist verschlüsselt (Fehlermeldungen können Personendaten enthalten); Nutzung folgt später.
  - Krypto: PBKDF2-SHA-256 mit **800.000 Iterationen** (gemessen im Cloud-Chromium, Xeon 2,1 GHz: 600k ≈ 105 ms, 800k ≈ 140 ms, 1 Mio. ≈ 175 ms). Mindestwert 600.000 wird beim Lesen geprüft. Iterationen stehen je Tresor in meta; eine Passwortänderung übernimmt den aktuellen Standard. Im Entwicklermodus zeigt Einstellungen → Sicherheit die gemessene Ableitungsdauer auf dem iPad.
  - Format `{v: 1, iv (12 Byte), ct}` als Uint8Array direkt in IndexedDB. AAD `kompass:v1:<tabelle>:<id>` bindet jede Payload an ihren Datensatz (vertauschte Payloads lassen sich nicht entschlüsseln). Passwörter werden NFC-normalisiert. Prüfwert = verschlüsselter fester Text in meta.vault.
  - Der Schlüssel liegt nur in src/services/crypto/session.ts (Modulvariable, nicht extrahierbar), nie in einem Store. Sperren löscht Schlüssel und den entschlüsselten Store (src/data/store.ts).
  - Schreiben: erst verschlüsseln, dann eine Dexie-Transaktion (Web Crypto darf nicht in IDB-Transaktionen laufen). Passwort ändern: alle Zeilen außerhalb neu verschlüsseln, dann in **einer** Transaktion prüfen (IV unverändert = niemand hat dazwischen geschrieben) und schreiben; bei Konflikt bis zu 3 Versuche.
  - Kundennummer: Zähler meta.customerSequence wird in einer eigenen kleinen Transaktion vor dem Verschlüsseln reserviert – die Nummer ist auch nach Fehlern oder Löschen verbraucht.
  - Sync zwischen Tabs: liveQuery liest nur id + updatedAt; entschlüsselt werden nur neuere Versionen, und als gelöscht gilt nur, was in einem früheren Ergebnis existierte (sonst löscht ein veraltetes Ergebnis frisch geschriebene Datensätze aus dem Store – Race im Test gefunden). updatedAt steigt je Datensatz strikt (`nextTimestamp`). Scheitert das Entschlüsseln im Sync (Passwort in anderem Tab geändert), sperrt die App.
  - Verlauf: Tabelle history (verschlüsselt), Einträge mit `path`, `from`, `to` (verschachtelt, z. B. `contracts.bu`). Kunde löschen löscht alles inkl. Verlauf (Recht auf Löschung).
  - Domain-Schlüssel (Sparten, Vertragsstatus, Phasen, Ereignisse …) englisch in src/data/domain.ts; deutsche Bezeichnungen und Regeln folgen in Schritt 3. Wohnsituation/Familienstand/Risikoprofil als Aufzählungen statt Freitext (Kundenvorlage hatte Varianten wie „Miete (mit Partner …)“).
  - Sperrbildschirm: echtes `<form>`, verstecktes Benutzerfeld „Kompass“ (sr-only, readonly), `autocomplete` new-password/current-password → Schlüsselbund + Face ID. Fehlversuche in meta.unlockFailures (überleben Neuladen): ab dem 3. Fehlversuch 5/10/30/60 s Wartezeit. „Passwort vergessen?“ löscht nach Eingabe von „LÖSCHEN“ alles. Beim Entsperren dreht sich die Nadel ein; das Passwortfeld verliert den Fokus (Tastatur schließt, keine Eingabe landet im unsichtbaren Feld).
  - VaultGate ohne `AnimatePresence mode="wait"`: Der deckende Sperrbildschirm erscheint sofort, die App blendet darunter aus.
  - Auto-Sperre (src/app/lock/useAutoLock.ts): Inaktivität (Einstellung 1–30 Min., Standard 5) per 5-s-Intervall, Hintergrund > 1 Min. per visibilitychange (iPadOS pausiert Timer im Hintergrund).
  - Tests: Playwrights `page.clock` war hier unzuverlässig (fastForward wirkte manchmal nicht, motion-Animationen blieben danach hängen) → eigene Zeitverschiebung nur für `Date.now()` per addInitScript; das Prüfintervall läuft in Echtzeit.
  - Testpasswort `Kompass-Test-2026!` (src/core/devConstants.ts = e2e/ipad.ts), im Entwicklermodus auf dem Sperrbildschirm und in den Einstellungen sichtbar. Entwicklerbereich „Verschlüsselung testen“: Testkunden anlegen/ändern/löschen, Ciphertext-Vorschau.
- Schritt 3 (Fachwissen & Demo-Daten):
  - Stammdaten in src/data/reference (unverschlüsselt, Teil des Codes): Sparten, Bedarfsregeln (inkl. `PRIORITIZATION`, `RULE_DISCLAIMER`), Lebensphasen, Lebensereignisse (mit Wiedervorlage-Regel als Daten: `eventDate`/`birthday`/`lastConversation`/`immediately`), Themen, Fragenkatalog, deutsche Bezeichnungen der Aufzählungen (labels.ts). zod-Schemas in reference/schemas.ts; reference.test.ts prüft alle Querverweise. Typisierung `Readonly<Record<Key, Info>>` statt `as const satisfies` (optionale Felder). Themen-Schlüssel `TOPICS` in domain.ts. Nur Aliase aus der Quelle (keine erfundenen Synonyme). Kfz ist in keiner Lebensphase typisch.
  - Fragenkatalog an Kompass angepasst: Nachname/Telefon/E-Mail optional; „nicht speichern“: Adresse, IBAN, Steuer-ID, Vertragsnummern, Gesundheitsdaten.
  - Ansicht „Wissen“ (src/features/knowledge, eigener Lazy-Chunk): Routen /knowledge, /knowledge/:kind/:key (product|phase|event|topic), /knowledge/priorities, /knowledge/questionnaire. Platzierung: **kein 7. Tab**, sondern Nebenlink in der Seitenleiste (über „Sperren“) und Karte „Nachschlagen“ in den Einstellungen (Tab-Bar-Layout; dort bleibt der Tab „Einstellungen“ markiert). Suche umlaut-tolerant (src/core/search.ts, „ä“ = „ae“ = „a“), Taste `/` fokussiert, Esc leert; die Suchanfrage bleibt beim Zurückkehren erhalten. Platzhalter „Kunden mit …“ (Schritt 4). `SearchInput` als neue UI-Komponente.
  - Tailwind-Breakpoint `wide` in rem (56.25rem = 900 px): mit px sortierte Tailwind ihn **vor** `sm:` (rem), dann überschrieb `sm:` jede `wide:`-Klasse.
  - Demo-Daten (src/data/demo, nur im Entwickler-Chunk geladen): 12 Kunden aus 01_Kunden/08_Gespraeche; K-0001 bekommt einen anderen erfundenen Vornamen (**Leon**). Erfundene Geburtsdaten (Geburtstage in den nächsten 7 Tagen: Ilka, Ben, Emma), einige Nachnamen, Telefon +49 000 …, E-Mail @example.com. Referenzdatum 2026-10-01: alle Daten werden um die Tage bis heute verschoben (Monate „JJJJ-MM“ und „MM/JJJJ“ im Text ab dem 15. gerechnet), nur-Jahrgang um Kalenderjahre (Finn bleibt minderjährig); Zeitstempel nie in der Zukunft. Verlauf: „angelegt“ mit dem Anfangszustand (spätere Änderungen per `applyFieldChanges` zurückgerechnet) + Änderungen. Wiedervorlagen für Ausbildungsende und 18. Geburtstag werden wie die Regeln aus Schritt 6 abgeleitet.
  - Import idempotent über stabile IDs (`deterministicUuid`, FNV-1a); nur fehlende Kunden bekommen neue Nummern (`reserveCustomerSequences`). Nummern bleiben nach dem Entfernen verbraucht → vor echtem Einsatz Datenbank zurücksetzen. „Demo-Daten entfernen“ löscht alle `demo`-Kunden außer synthetischen (also auch Testkunden aus „Verschlüsselung testen“), `removeMany` in einer Transaktion.
  - Synthetische Daten: 500 Kunden (Tag „Synthetisch“, mulberry32, deterministisch) in Batches à 50 Kunden pro Transaktion; `commit` schreibt per `bulkPut` je Tabelle. Im Cloud-Chromium dauert das Anlegen von 500 Kunden nur wenige Sekunden. „Entschlüsseln messen“ zeigt die Dauer wie beim Entsperren.
- Schritt 4 (Kundenverwaltung):
  - Kernlogik in src/core/customers: Alter/Minderjährigkeit (`ageInfo`: nur Jahrgang → `maybe`, wenn der 18. in dieses Jahr fällt; wird wie minderjährig behandelt), Geburtstag (29.02. → 28.02. in Nicht-Schaltjahren; das Alter steigt rechtlich erst am 01.03.), Telefon (`normalizePhone`: 0… → +49, 00… → +, „(0)“ entfernt; Gruppierung bleibt; WhatsApp nur mit internationaler Nummer), Suche/Filter/Sortierung, Einwilligungsprüfung (Werbung bei (evtl.) Minderjährigen nur mit Zustimmung der Eltern), Fragenkatalog-Logik.
  - Fragenkatalog als Daten: jede Frage hat `key`, `fields` (Kundenpfade, Freitext als `answers.<key>`) und optional `onlyFor` (Lebensphasen; bei unbekannter Phase wird gefragt). Unbeantwortete Fragen werden zu offenen Punkten „Bereich: Frage“; `customersRepo.update` entfernt solche Punkte automatisch, sobald die Frage beantwortet ist oder nicht mehr gilt (eigene Punkte bleiben). Neue Kundenfelder: `answers`, `fixedCosts`, `disposableIncome`, `employerVl`, `employerBav`, `archived` (alle optional/mit Default, keine Migration nötig, weil verschlüsselte Payload).
  - Dexie **Version 3**: Tabelle `drafts` (verschlüsselt wie alle Datentabellen, in DATA_TABLES → Laden, Sync, Passwortwechsel automatisch). Ein Entwurf „Neuer Kunde“ mit fester ID; gespeichert nach jeder Änderung (eine Schreibung zugleich, die letzte gewinnt); vor Anlegen/Verwerfen wird das Speichern gestoppt und abgewartet, sonst entsteht der Entwurf neu.
  - UI: /customers (Liste, `content-visibility` für viele Zeilen), /customers/new (Fragenkatalog im Fokusmodus, 9 Bereiche + Zusammenfassung, „Weiter“ wird zu „Überspringen“, wenn im Bereich nichts beantwortet ist), /customers/:id (Akte). Bearbeiten abschnittsweise über `EditPanel` (ab 900 px `SidePanel` rechts, darunter BottomSheet); beide halten das fokussierte Feld über der Bildschirmtastatur. Feld-Editoren zentral in features/customers/fields (`CustomerField`), genutzt von Akte und Fragenkatalog. Neue UI-Bausteine: `SidePanel`, `ChoiceChip`.
  - Verträge in der Akte per Tipp auf die Sparte änderbar (ActionMenu, Verlaufseintrag). Verlauf: neueste zuerst, aufklappbar, Listen (offene Punkte, Schlagwörter) nur als „− entfernt · + neu“.
  - Archivieren ist der Standard (Liste blendet aus, Filter „Archiv anzeigen“); endgültiges Löschen mit Bestätigung, kaskadierend in einer Transaktion.
  - Kürzel: `n` neuer Kunde (überall außer in Dialogen/Textfeldern), `/` Suche (Kunden, Wissen). Die Suchanfrage der Kundenliste wird beim Sperren gelöscht (kann Namen enthalten).
  - Wissen: Die Platzhalter „Kunden mit …“ zeigen jetzt die passenden aktiven Kunden (Sparte: Status außer offen/nein/nicht relevant; Thema: abgeschlossene Sparten des Themas).
  - „Nächste Wiedervorlage“ in der Liste ist bis Schritt 6 ein Platzhalter („–“).

