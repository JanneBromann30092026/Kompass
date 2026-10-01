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
- [ ] 1 Fundament: Setup, PWA, Deployment, Design-System & Shell (aus Synapse)
- [ ] 2 Datenbank, Datenmodell & Verschlüsselung
- [ ] 3 Fachwissen & Demo-Daten
- [ ] 4 Kundenverwaltung
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
