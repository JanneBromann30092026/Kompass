# Kompass – Prompts (PWA für das iPad)

Schritt 0 (CLAUDE.md) ist erledigt.

## So arbeitest du nur mit dem iPad

**Einmalig:**
1. Repo anlegen (öffentlich, leer): https://github.com/new?owner=JanneBromann30092026&name=Kompass&visibility=public&description=Kompass%20%E2%80%93%20Kundenbetreuung%20(PWA) → README usw. nicht anhaken → **Create repository**. Öffentlich ist nötig für GitHub Pages im kostenlosen Plan; im Repo liegen nur Code und erfundene Demo-Daten, **nie** echte Kunden.
2. **Settings → Pages → Source: „GitHub Actions“** wählen.
3. Claude Zugriff geben (falls nötig): github.com/settings/installations → Claude → Configure → Kompass hinzufügen.
4. CLAUDE.md und diese Datei liegen im Repo (erledigt).

**Pro Schritt:**
1. Neue Sitzung auf claude.ai/code, Repo **Kompass** auswählen.
2. Prompt des Schritts aus dieser Datei kopieren und abschicken.
3. Claude baut, testet, zeigt dir Screenshots und öffnet einen Pull Request.
4. Auf GitHub den PR öffnen → **Merge pull request**.
5. 1–2 Minuten warten (Tab **Actions** zeigt den Deploy), dann die App öffnen: https://jannebromann30092026.github.io/Kompass/
6. Passt etwas nicht, in derselben Sitzung beschreiben (gern mit Screenshot). Erst danach der nächste Schritt.

**App installieren (ab Schritt 1):** In Safari die URL öffnen → Teilen-Symbol → **Zum Home-Bildschirm**. Ab dann immer über das Homescreen-Icon öffnen. Nur so bleiben die Daten zuverlässig erhalten.

**Bricht Claude ab:** *„Mach weiter, wo du aufgehört hast. Prüfe zuerst mit git status und git diff den aktuellen Stand und lies die CLAUDE.md.“*

**Echte Kunden erst nach Schritt 12** (Backups) und nach Klärung: Vermittlerstatus, Vorgaben des Arbeitgebers/Firmen-CRM, Einwilligungstext.

---

## Schritt 1 – Fundament: Setup, PWA, Deployment, Design-System & Shell

```
Lies die CLAUDE.md. Wir setzen Roadmap-Schritt 1 um: Fundament.

Ziel: Eine installierbare, leere Kompass-PWA mit dem Fundament aus Synapse – gleiche Qualität, eigene Identität.

1. Synapse (öffentliches Repo JanneBromann30092026/Synapse-) als Vorlage nutzen: Projekt-Setup, vite.config (inkl. cspPlugin, noStyleInjectPlugin, PWA-Konfiguration, Chunking), ESLint/Prettier/TS-Konfiguration, GitHub-Workflows (CI + Deploy), Playwright-Setup mit iPad-Profilen (e2e/ipad.ts), Screenshot-Pipeline, Icon-Skript, Design-Tokens, UI-Komponenten (src/components/ui inkl. Hooks), Theme-Boot, UpdatePrompt, ErrorBoundary und App-Shell übernehmen. Kopieren und anpassen, nichts verlinken. Alles Karteikarten-Spezifische weglassen (Lernen, Karten, Gehirn-Embeddings, Grading, Import).
2. Anpassen: Name „Kompass“ überall (package.json, Manifest name/short_name, Titel), Vite base "/Kompass/", Version 0.1.0, neue IndexedDB-Namen (keine Kollision mit Synapse, auch nicht im localStorage-Spiegel).
3. Eigene Identität: Akzentfarbe Petrol/Türkis (Light/Dark, Kontrast WCAG AA, klar abgegrenzt von Erfolgs-Grün und Warn-Orange), Zusatzakzent Bernstein. App-Icon als SVG: abgerundetes Quadrat, dunkler Petrol-Verlauf, geometrische Kompassrose, Nadel Türkis/Bernstein; daraus PNG 192/512, maskable, apple-touch-icon 180 (npm run icons). Favicon. theme-color passend.
4. Shell mit Navigation (Sidebar ab 900 px, Tab-Bar darunter): Start (Dashboard), Kunden, Wiedervorlagen, Aktionen, Netz, Einstellungen – vorerst mit freundlichen Platzhaltern („Kommt in Schritt …“). Fokusmodus-Mechanik der Shell beibehalten.
5. Einstellungen-Grundgerüst: Theme, Bewegungen reduzieren, Entwicklermodus, Systemstatus (Version, Build, Speicher, dauerhafter Speicher gewährt). Entwicklermodus zeigt /dev/ui (Komponentenübersicht).
6. navigator.storage.persist() beim Start.
7. Tests: Vitest-Grundtest, Playwright-Smoke (keine Konsolenfehler/-warnungen, Manifest, Offline-Betrieb, Navigation, Theme-Persistenz).

Nicht Teil dieses Schritts: Datenbank-Schema, Verschlüsselung, Fachfunktionen.

Definition of Done:
- typecheck, lint, test, build und e2e fehlerfrei.
- Screenshots (Hoch/Quer, Dark/Light) inkl. Icon-Vorschau gezeigt.
- CLAUDE.md: Roadmap 1 abgehakt, Entscheidungen notiert.
- Feature-Branch, Pull Request. Im PR und im Chat: was ich nach dem Mergen auf dem iPad prüfen soll (URL öffnen, zum Home-Bildschirm hinzufügen – Icon neben Synapse prüfen –, Flugmodus-Test).
```

## Schritt 2 – Datenbank, Datenmodell & Verschlüsselung

```
Lies die CLAUDE.md. Wir setzen Roadmap-Schritt 2 um: Datenbank, Datenmodell & Verschlüsselung.

Ziel: Ein sicherer, verschlüsselter lokaler Speicher mit App-Sperre – die Grundlage für alle Kundendaten.

1. Krypto-Schicht (src/services/crypto, reine Formate in src/core): PBKDF2-SHA256 (≥ 600.000 Iterationen, 16 Byte Salt) → AES-GCM-256 (nicht extrahierbarer CryptoKey, nur im Speicher), je Datensatz neuer 12-Byte-IV, Format versioniert ({v, iv, ct}). Verschlüsselter Prüfwert zum Verifizieren des Passworts. Passwort ändern = alle Datensätze in einer Transaktion neu verschlüsseln. Messen, wie lange die Ableitung im Cloud-Chromium dauert, und Iterationen so wählen, dass das Entsperren auf dem iPad unter ~1 s bleibt (notieren).
2. Dexie-Schema Version 1: meta (Salt, Iterationen, Prüfwert, Schema-Infos), customers, needs, reminders, lifeEvents, conversations, campaigns, history (Verlauf je Kunde), settings, secrets, snapshots, errorLog. Personenbezogenes nur in `payload` (verschlüsselt); unverschlüsselt nur id, customerId, updatedAt. Typen + zod-Schemas für die entschlüsselten Objekte (Felder siehe CLAUDE.md „Fachmodell“ und Kundenvorlage im privaten Repo Kunden-Wissensdatenbank: Vorname, optional Nachname/Telefon/E-Mail, Geburtsdatum (oder nur Jahrgang, falls unbekannt), Lebensphase, Beruf, Ausbildung Start/Ende, Wohnsituation, Familienstand, Kinder, Einkommen ca., Risikoprofil, Gesundheitsprüfung erledigt, Einwilligungen mit Datum, Zustimmung Eltern, Vertragsstatus je Sparte, Potenzial, Tags, offene Punkte, Demo-Kennzeichen).
3. Entschlüsselter In-Memory-Store (Zustand) nach dem Entsperren; Repositories schreiben verschlüsselt und aktualisieren den Store. Reaktivität: liveQuery nur auf technische Felder/Änderungszähler, Entschlüsseln außerhalb von liveQuery (siehe CLAUDE.md). Änderungen aus anderen Tabs werden übernommen.
4. Kunden-IDs K-0001 fortlaufend (nie wiederverwendet, Zähler in meta). Jede Änderung erzeugt einen datierten Verlaufseintrag (was geändert, alt → neu).
5. Sperrbildschirm: Ersteinrichtung (Passwort festlegen + wiederholen, Stärke-Hinweis, deutlicher Hinweis „Passwort vergessen = Daten verloren“, Empfehlung Schlüsselbund) und Entsperren (Passwort-Feld, Fehlversuche mit kurzer Wartezeit). Formular so bauen, dass das iPad das Passwort im Schlüsselbund speichert und per Face ID ausfüllt (verstecktes Benutzerfeld „Kompass“, autocomplete="new-password" bzw. "current-password", echtes <form>) – damit ist Entsperren per Face ID ohne eigene Technik möglich. Automatische Sperre nach Inaktivität (Standard 5 Min, einstellbar) und nach Hintergrund > 1 Min; Sperren löscht Schlüssel und Store. Animierter Entsperr-Moment (Kompassnadel dreht sich ein).
6. Einstellungen: „Jetzt sperren“, Sperrzeit, Passwort ändern. Entwicklermodus: Testpasswort-Hinweis für E2E, „Datenbank zurücksetzen“ mit Bestätigung.
7. `openDatabase()` wirft nie (Fehlercodes wie in Synapse), Texte in de.ts.
8. Tests: Krypto (Round-Trip, falsches Passwort, manipulierter Ciphertext, Formatversion), Repositories mit fake-indexeddb, Passwort ändern, ID-Zähler, Verlauf. E2E: Ersteinrichtung, Sperren/Entsperren, Inaktivitätssperre (mit Fake-Uhr), Prüfung, dass im IndexedDB-Inhalt kein Klartext (z. B. Vorname eines Testkunden) steht.

Nicht Teil dieses Schritts: Fachlogik, Kunden-UI, Backups.

Definition of Done:
- typecheck, lint, test, build, e2e fehlerfrei; Screenshots Sperrbildschirm (Ersteinrichtung, Entsperren, Fehler) Hoch/Quer, Dark/Light.
- CLAUDE.md aktualisiert, PR mit iPad-Prüfliste (Passwort festlegen, App schließen, wieder öffnen, entsperren, Inaktivität abwarten).
```

## Schritt 3 – Fachwissen & Demo-Daten

```
Lies die CLAUDE.md. Wir setzen Roadmap-Schritt 3 um: Fachwissen & Demo-Daten.

Ziel: Das komplette Fachwissen steckt als geprüfte Stammdaten in der App, und es gibt realistische Testkunden zum Ausprobieren.

1. Privates Repo JanneBromann30092026/Kunden-Wissensdatenbank zur Sitzung hinzufügen und lesen (nur lesen, nichts ändern).
2. Stammdaten (unverschlüsselt, Teil des Codes, src/data/reference): Sparten (Schlüssel, Name, Langname, Priorität, Themen, Kurzbeschreibung), Bedarfsregeln (sinnvoll/nicht sinnvoll/Trigger/Priorität/Einwände/Hinweise – aus 05_Bedarfslogik), Lebensphasen (Beschreibung, typische Produkte/Ereignisse – aus 03), Lebensereignisse (Beschreibung, Wiedervorlage-Regel, Gesprächspunkte – aus 04), Themen (aus 06), Fragenkatalog (aus 09_Vorlagen). Mit zod validiert, Test: alle Querverweise gültig.
3. Ansichten „Wissen“ (unter Einstellungen oder eigener Bereich – Vorschlag machen): Sparten mit Bedarfsregel, Lebensphasen, Ereignisse, Themen – schön lesbar, verlinkt, durchsuchbar. Platzhalter-Bereiche, die später Kunden zeigen.
4. Demo-Daten im Entwicklermodus („Demo-Daten laden“, idempotent, als Demo markiert, „Demo-Daten entfernen“): die 12 Testkunden aus 01_Kunden inkl. Verträgen, Einwilligungen, Wiedervorlagen, Gesprächen (08_Gespraeche) und Verlauf. Wichtig: Das Repo Kompass ist öffentlich – **K-0001 „Ala“ bekommt einen anderen erfundenen Vornamen**, alle anderen sind erfunden und dürfen bleiben. Daten relativ zum heutigen Datum verschieben, damit Fälligkeiten immer realistisch sind (Referenzdatum der Vorlage: 2026-10-01). Erfundene, zum Jahrgang passende Geburtsdaten ergänzen (Minderjährige bleiben minderjährig; mindestens ein Geburtstag in den nächsten 7 Tagen), bei einigen Kunden erfundene Nachnamen und offensichtlich fiktive Kontaktdaten (Telefon im Format +49 000 …, E-Mail @example.com).
5. Synthetische Großdaten im Entwicklermodus (z. B. 500 Kunden) für Performance-Tests.
6. Tests: Stammdaten-Konsistenz, Demo-Import idempotent und verschlüsselt gespeichert.

Nicht Teil dieses Schritts: Kunden-UI, Bedarfs-Engine (die Regeln liegen jetzt als Daten vor, ausgewertet werden sie in Schritt 5).

Definition of Done: wie üblich; Screenshots der Wissensansichten. PR mit iPad-Prüfliste (Entwicklermodus an → Demo-Daten laden → Wissen durchblättern).
```

## Schritt 4 – Kundenverwaltung

```
Lies die CLAUDE.md. Wir setzen Roadmap-Schritt 4 um: Kundenverwaltung.

Ziel: Kunden anlegen, finden und vollständig pflegen – schnell und angenehm auf dem iPad.

1. Kundenliste: Karten oder Zeilen mit K-ID, Vorname (und Nachname, falls hinterlegt), Alter, Lebensphase, nächster Wiedervorlage (Platzhalter bis Schritt 6), Hinweis-Badges (minderjährig, keine Werbeeinwilligung, offene Punkte). Suche (Vor-/Nachname, K-ID, Beruf, Telefon), Filter (Lebensphase, Sparte/Status, Einwilligung, minderjährig, Demo), Sortierung. Leere Zustände.
2. Kundenakte (Detailseite): Steckbrief mit Alter und Geburtstag, Kontakt-Schnellaktionen (Anrufen per tel:, WhatsApp per wa.me, E-Mail per mailto: – nur sichtbar, wenn hinterlegt; bevorzugter Kanal hervorgehoben), Verträge je Sparte (Status-Chips, schnell änderbar), Einwilligungen (mit Datum, Kanal), Lebensereignisse mit Datum, offene Punkte, Verlauf (datiert, aufklappbar). Platzhalter-Bereiche für Bedarf, Wiedervorlagen, Gespräche (spätere Schritte).
3. Bearbeiten: Abschnittsweise (BottomSheet bzw. Seitenpanel ab 900 px), zod-Validierung, Bildschirmtastatur-fest. Hinweis bei Freitext: keine Gesundheitsdaten. Minderjährigkeit aus dem Geburtsdatum; bei Minderjährigen Feld „Zustimmung der Eltern“ Pflicht für Werbung. Kontaktfelder optional mit Hinweis „bleibt verschlüsselt auf dem iPad“; Telefonnummern normalisieren (für WhatsApp internationales Format).
4. Neuer Kunde = geführter Fragenkatalog (9 Bereiche aus den Stammdaten, Bereich „Person“ mit Geburtsdatum und optionalen Kontaktdaten), Schritt für Schritt mit Fortschritt, jede Frage überspringbar → unbeantwortete werden automatisch „offene Punkte“. Am Ende Zusammenfassung → Anlegen. Entwurf bleibt bei Sperre/Neuladen erhalten (verschlüsselt).
5. Löschen mit Bestätigung (kaskadierend über alle abhängigen Tabellen in einer Transaktion), Archivieren statt Löschen als Standard.
6. Tastaturkürzel: n = neuer Kunde, / = Suche.
7. Tests: core-Logik (Alter/Minderjährigkeit aus Geburtsdatum und Jahrgang-Fallback, 29. Februar, Filter, offene Punkte, Telefon-Normalisierung), Repositories, E2E (Fragenkatalog komplett und mit übersprungenen Fragen, Bearbeiten, Suche/Filter, Löschen, Verlauf-Eintrag).

Nicht Teil dieses Schritts: Bedarf, Wiedervorlagen, Gespräche.

Definition of Done: wie üblich; Screenshots Liste, Akte, Fragenkatalog (mit simulierter Bildschirmtastatur). PR mit iPad-Prüfliste.
```

## Schritt 5 – Bedarfs-Engine & Gesprächsaufhänger

```
Lies die CLAUDE.md. Wir setzen Roadmap-Schritt 5 um: Bedarfs-Engine & Gesprächsaufhänger.

Ziel: Die App erkennt für jeden Kunden den Bedarf – nachvollziehbar, priorisiert und ohne KI.

1. Reine Logik src/core/needs: Aus Fakten (Lebensphase, Alter, Beruf/Selbständig, Wohnsituation, Familie, Einkommen, Ereignisse, Vertragsstatus, Arbeitgeber zahlt VL/bAV) und den Bedarfsregeln je Sparte eine Einstufung „jetzt / später / nicht sinnvoll“ mit Priorität und Begründung (Text aus Bausteinen) ableiten. Sonderfälle: „über Eltern“ (Ende der Mitversicherung → später), Anpassungsbedarf bei bestehendem Vertrag (z. B. BU-Erhöhung nach Gehaltssprung/Heirat, Frist „prüfen“), Minderjährige. Sortierung: Priorität vor Potenzial. Ausführlich testen – die 12 Testkunden dienen als Referenzfälle (erwartete Einstufung aus ihren Notizen).
2. Vorschläge vs. Entscheidung: Die Engine schlägt vor; in der Akte kann ich jeden Bedarf übernehmen, ablehnen oder manuell ändern (mit eigener Begründung). Übernommene/abgelehnte Entscheidungen bleiben bestehen, bis sich relevante Fakten ändern (dann Hinweis „Bedarf neu prüfen“).
3. Gesprächsaufhänger: Vorlagen je Regel/Ereignis/Lebensphase mit Platzhaltern (Daten in src/data), Auswahl der 3–5 passendsten pro Kunde (locker, du-Form). Typische Einwände je Sparte abrufbar.
4. UI in der Kundenakte: Abschnitt „Bedarf“ (jetzt/später/nicht sinnvoll, Prio-Badges, Begründung, Aktionen), Abschnitt „Gesprächsaufhänger“ (kopierbar). Animation beim Übernehmen.
5. Potenzial (hoch/mittel/niedrig) als manuelles Feld, nie Grundlage der Reihenfolge.
6. Tests: Engine (Tabellen-Tests je Regel, Referenzfälle), E2E (Bedarf übernehmen/ablehnen, Faktenänderung → Hinweis).

Nicht Teil dieses Schritts: Wiedervorlagen, KI.

Definition of Done: wie üblich; Screenshots Akte mit Bedarf und Aufhängern. PR mit iPad-Prüfliste.
```

## Schritt 6 – Wiedervorlagen

```
Lies die CLAUDE.md. Wir setzen Roadmap-Schritt 6 um: Wiedervorlagen.

Ziel: Keine Gelegenheit geht verloren – die App sagt mir, wen ich wann warum anspreche.

1. Reine Logik src/core/reminders: automatische Wiedervorlagen aus Fakten (Regeln in CLAUDE.md „Fachmodell“ und Ereignis-Stammdaten; 18. Geburtstag am genauen Datum, 29. Februar → 28. Februar), jeweils mit Anlass und To-do-Text; Neuberechnung bei Faktenänderung ohne Duplikate (stabile Schlüssel je Regel), erledigte bleiben erhalten. Manuelle Wiedervorlagen jederzeit.
2. Ansicht „Wiedervorlagen“: Überfällig / Heute / Nächste 30 Tage / 31–90 Tage / Später, Filter nach Anlass. Erledigen per Wischen oder Button (mit kurzer Erfolgs-Animation), optional mit Notiz → Verlaufseintrag; Folgeaufgabe vorschlagen (z. B. nächstes Jahresgespräch). Verschieben (+1 Woche, +1 Monat, Datum).
3. In der Kundenakte: Abschnitt Wiedervorlagen; in der Kundenliste: nächste Wiedervorlage.
4. Hinweis-Badge auf dem Tab (Anzahl fälliger). App-Badge auf dem Homescreen-Icon (Badging API) nur, wenn iPadOS es ohne Push-Berechtigung erlaubt – prüfen und Entscheidung notieren.
5. Kalender-Export: einzelne oder alle offenen Wiedervorlagen als .ics teilen (für den iPad-Kalender), **nur pseudonymisiert** (K-ID + Anlass – kein Name, keine Kontaktdaten, kein Geburtsdatum), mit Erinnerung am Vortag.
6. Tests: Ableitungsregeln (alle Testkunden, Datumsgrenzen, Monatsende, Minderjährige), keine Duplikate, E2E (erledigen, verschieben, Folgeaufgabe, .ics-Inhalt).

Nicht Teil dieses Schritts: Gesprächsnotizen, Dashboard.

Definition of Done: wie üblich; Screenshots Wiedervorlagen (mit Demo-Daten). PR mit iPad-Prüfliste.
```

## Schritt 7 – Gespräche & Gesprächsvorbereitung

```
Lies die CLAUDE.md. Wir setzen Roadmap-Schritt 7 um: Gespräche & Gesprächsvorbereitung.

Ziel: Vor dem Gespräch in 30 Sekunden vorbereitet, danach in einer Minute dokumentiert.

1. Gesprächsvorbereitung (eine Bildschirmseite, auch als Vollbild): Steckbrief, offene Bedarfe nach Priorität, 3 Aufhänger, mögliche Einwände, offene Punkte, fällige Wiedervorlagen. Optimiert für Querformat neben dem Kunden.
2. Gesprächsnotiz: Datum, Anlass, Teilnehmer, besprochen, Ergebnisse, offen, nächste Schritte. **Diktat:** große Textfelder mit Hinweis auf das Mikrofon der iPad-Tastatur; zusätzlich ein Diktier-Button über die Web Speech API, falls Safari sie anbietet (sonst ausblenden), mit einmaligem Hinweis, dass die Spracherkennung über Apple läuft. Diktierter Text landet im gewählten Feld und bleibt bearbeitbar. Schnelle Aktionen direkt im Formular: Vertragsstatus ändern, Ereignis mit Datum erfassen (erzeugt Wiedervorlage), Einwilligung erteilen/entziehen, Wiedervorlage erledigen. Speichern aktualisiert „letztes Gespräch“ (→ Jahresgespräch neu) und schreibt Verlaufseinträge. Hinweis: keine Gesundheitsdaten.
3. Gesprächsverlauf in der Akte (chronologisch, aufklappbar).
4. Tests: core (Vorbereitung zusammenstellen), E2E (Vorbereitung öffnen, Gespräch mit Statusänderung und Ereignis erfassen → neue Wiedervorlage; Diktier-Button mit gemockter SpeechRecognition).

Nicht Teil dieses Schritts: Dashboard, Aktionen, KI.

Definition of Done: wie üblich; Screenshots Vorbereitung und Gesprächsformular (mit Tastatur). PR mit iPad-Prüfliste.
```

## Schritt 8 – Dashboard & Pipeline

```
Lies die CLAUDE.md. Wir setzen Roadmap-Schritt 8 um: Dashboard & Pipeline.

Ziel: Die Startseite zeigt auf einen Blick, was heute wichtig ist.

1. Reine Logik src/core/dashboard: Kennzahlen (Kunden, einladbar, minderjährig, Wiedervorlagen überfällig/fällig ≤ 30 Tage), Produktabdeckung je Sparte (abgeschlossen, geplant/angeboten, über Eltern, Bedarf ohne Vertrag, Quote = abgeschlossen ÷ relevante Kunden), offene Bedarfe nach Priorität (Top 10, Potenzial nur bei Gleichstand), Pipeline (geplant/angeboten je Sparte), Geburtstage (heute, nächste 7 und 30 Tage, mit neuem Alter).
2. Startseite: Begrüßung mit Datum, „Heute“-Bereich (fällige Wiedervorlagen, direkt erledigbar; Geburtstage mit Gruß-Vorlage per WhatsApp/E-Mail – nur bei Werbeeinwilligung, sonst nur Hinweis), Kennzahlen-Kacheln, Abdeckung als ruhige Balken, offene Bedarfe, Pipeline. Alles antippbar (führt zu gefilterten Listen/Akten). Leerer Zustand mit Einstieg „Ersten Kunden anlegen“ bzw. im Entwicklermodus „Demo-Daten laden“.
3. Tests: Kennzahlen gegen die Testkunden (Referenzwerte aus der Kunden-Wissensdatenbank, Stand 2026-10-01 mit fester Uhr), E2E Startseite.

Definition of Done: wie üblich; Screenshots Startseite Hoch/Quer, Dark/Light, leer und mit Demo-Daten. PR mit iPad-Prüfliste.
```

## Schritt 9 – Segmente & Aktionen

```
Lies die CLAUDE.md. Wir setzen Roadmap-Schritt 9 um: Segmente & Aktionen.

Ziel: Zielgruppen finden und Seminare planen – mit eingebautem Einwilligungs-Schutz.

1. Reine Logik src/core/segments + consent: Segment-Definition (Sparte/Status, Lebensphase, Alter, Bedarf, Ereignis, Tags), Ergebnis immer aufgeteilt in „einladbar“ (Werbeeinwilligung ja; Minderjährige zusätzlich Zustimmung der Eltern) und „nur gezählt“. Nicht einladbare Kunden erscheinen in Einladungslisten nie namentlich. Ausführlich testen.
2. Segment-Ansicht: Filter zusammenklicken, Ergebnis live, gespeicherte Segmente (z. B. „ohne Fondssparplan“, „Azubis und Studierende“, „VL offen“).
3. Aktionen/Seminare: Thema, Datum, Ort/Online, Segment → Einladungsliste (nur einladbare), Status je Eingeladenem (eingeladen, zugesagt, abgesagt, teilgenommen), Einladungstext aus Vorlagen (Platzhalter, du-Form, je Kanal kurz/lang), kopieren bzw. über das Teilen-Menü versenden. Nach dem Seminar: Folge-Wiedervorlagen für Teilnehmer anlegen.
4. Tests: Einwilligungsregeln (inkl. Minderjährige, Einwilligung später entzogen → aus Liste entfernt mit Hinweis), E2E (Segment → Seminar → Liste → Text).

Nicht Teil dieses Schritts: KI-Texte.

Definition of Done: wie üblich; Screenshots Segmente und Aktion. PR mit iPad-Prüfliste.
```

## Schritt 10 – Einstellungen & optionale KI

```
Lies die CLAUDE.md. Wir setzen Roadmap-Schritt 10 um: Einstellungen & optionale KI.

Ziel: Die App wird mit KI an den richtigen Stellen besser, ohne dass Kundendaten ungeschützt das Gerät verlassen. Ohne KI bleibt alles voll nutzbar.

1. Einstellungen vervollständigen (wie Synapse Schritt 6, Struktur src/services/ai übernehmen): KI-Anbieter aus (Standard) / Anthropic, Modell (Standard claude-haiku-4-5-20251001), API-Key (verschlüsselt in secrets, nur „Key hinterlegt“), „Verbindung testen“ (models.retrieve, keine Tokens), Hinweis „kostenpflichtig“. CSP connect-src api.anthropic.com.
2. Pseudonymisierung als reine, getestete Funktion: baut aus einer Kundenakte das KI-Paket (Jahrgang, Lebensphase, Beruf, Wohnsituation, Familienstand, Vertragsstatus, Bedarfe, Ereignisse). Test: Vor- und Nachname, K-ID, Geburtsdatum, Telefon, E-Mail, Freitexte und Notizen kommen nie vor. Vor dem ersten KI-Aufruf einmalig erklären, was gesendet wird; „Gesendete Daten anzeigen“ jederzeit möglich.
3. KI-Funktionen (jeweils mit Button, nie automatisch): Gesprächsaufhänger umformulieren/ergänzen, Gesprächsvorbereitung als kurzer Fließtext, Einladungstext für eine Aktion. Ergebnis immer bearbeitbar, Fallback auf Vorlagen bei Fehler/offline. Timeout, Fehlercodes, ein Wiederholungsversuch wie in Synapse.
4. Tests: Pseudonymisierung, Provider mit gemockter API, E2E nur mit page.route-Mock.

Definition of Done: wie üblich; Screenshots Einstellungen und KI-Funktion (gemockt). PR mit iPad-Prüfliste (KI bleibt aus, solange ich keinen Key hinterlege).
```

## Schritt 11 – Kunden-Netz

```
Lies die CLAUDE.md. Wir setzen Roadmap-Schritt 11 um: Kunden-Netz.

Ziel: Eine lebendige Karte meines Kundenstamms – wer hängt woran, wo liegen Chancen.

1. Graph (reine Logik in src/core/network): Knoten = Kunden, Sparten, Lebensphasen, Ereignisse (mit offenen Wiedervorlagen), Themen; Kanten = Vertrag (Stil je Status), Bedarf jetzt (hervorgehoben), Lebensphase, Ereignis, Thema. Kunden mit offenem Prio-1-Bedarf leuchten in Bernstein, fällige Wiedervorlagen pulsieren dezent.
2. Darstellung mit react-force-graph-2d nach dem Muster des Synapse-Gehirns (Zeichnen in onRenderFramePost, Glow-Sprites, Beschriftungen ab Zoom, Positionen speichern – verschlüsselt, da sie Kunden-IDs enthalten), Gesten: Ziehen, Pinch, Long-Press zum Verschieben, Doppeltipp = einpassen.
3. Interaktion: Antippen eines Kunden → Panel (ab 900 px rechts, sonst BottomSheet) mit Kurz-Steckbrief, Bedarf, nächster Wiedervorlage, „Akte öffnen“. Antippen einer Sparte/Phase → zugehörige Kunden hervorgehoben. Filter (Sparte, Lebensphase, nur Bedarf, nur fällig), Suche.
4. Performance mit 500 synthetischen Kunden prüfen (Framezeit-Anzeige im Entwicklermodus).
5. Tests: Graph-Aufbau, E2E (Antippen, Filter, Panel).

Definition of Done: wie üblich; Screenshots Netz (Demo-Daten, Filter, Panel). PR mit iPad-Prüfliste.
```

## Schritt 12 – Backups, Export & Import

```
Lies die CLAUDE.md. Wir setzen Roadmap-Schritt 12 um: Backups, Export & Import.

Ziel: Meine Kundendaten sind gegen Geräteverlust und Safari-Datenlöschung abgesichert – verschlüsselt.

1. Backup-Datei (.kompass): versioniertes Format, Inhalt verschlüsselt (Backup-Passwort = App-Passwort oder eigenes, Auswahl), enthält alle Tabellen außer secrets und Krypto-Meta, mit zod geprüft inkl. Verweisen. Teilen über das Teilen-Menü (Dateien-App, AirDrop) bzw. Download; Datei beim Öffnen des Dialogs erzeugen (frische Nutzergeste, siehe CLAUDE.md).
2. Wiederherstellen: Datei wählen → Passwort → Vorschau (Anzahl Kunden, Datum) → Alles ersetzen (vorher automatischer Snapshot) oder Zusammenführen (gleiche IDs aktualisieren, neue hinzufügen; K-ID-Zähler korrekt fortsetzen).
3. Automatische lokale Snapshots (verschlüsselt, max. 7, einmal pro Tag beim Start). Export-Erinnerung auf der Startseite (letztes Backup ≥ 7 Tage; „Später“ = 3 Tage Ruhe).
4. CSV-Export einer Kundenliste/Einladungsliste (nur gewählte Felder; Kontaktdaten standardmäßig abgewählt; Warnhinweis: unverschlüsselt).
5. Tests: Round-Trip (Export → leere DB → Import = identisch), falsches Passwort, beschädigte/neuere Datei, Zusammenführen, E2E mit gemockter Teilen-API.

Definition of Done: wie üblich; Screenshots Backup-Dialog und Wiederherstellung. PR mit iPad-Prüfliste (Backup in „Dateien“ sichern, wiederherstellen testen).
```

## Schritt 13 – Feinschliff & Installation

```
Lies die CLAUDE.md. Wir setzen Roadmap-Schritt 13 um: Feinschliff & Installation.

Ziel: Kompass fühlt sich auf dem iPad wie eine fertige native App an.

1. Qualitätsprüfung aller Seiten und Zustände (wie Synapse Schritt 16): leere Zustände, Skeletons, Fehler; Texte aus i18n (freundlich, knapp, du-Form); Tokens; beide Themes, Kontraste WCAG AA; Touch ≥ 44 px; Tastatur (Tab-Reihenfolge, Fokus, Kürzelübersicht per „?“); Reduced Motion; Hoch, Quer, Split View.
2. Onboarding beim ersten Start (2–3 animierte Schritte): Was Kompass kann; „Zum Home-Bildschirm hinzufügen“, falls nicht als Homescreen-App gestartet; App-Passwort festlegen (mit Hinweisen); Demo-Daten ausprobieren oder leer starten.
3. PWA-Feinschliff: Icon final prüfen, iOS-Startbildschirme (apple-touch-startup-image) im Kompass-Stil für gängige iPad-Größen Hoch/Quer, Statusleisten-Farbe je Theme, Update-Hinweis.
4. Datenschutz-Check: Durchsuche IndexedDB, localStorage, sessionStorage, Cache Storage und Logs nach Klartext-Kundendaten inkl. Nachnamen, Telefonnummern, E-Mail-Adressen und Geburtsdaten (E2E). Fehlerprotokoll (letzte 200 Einträge, ohne Kundendaten und Key) mit „Fehlerprotokoll kopieren“.
5. Performance: Code-Splitting (Netz, KI, Backup), Lighthouse (PWA, Performance, Accessibility) mit Playwright-Chromium, Befunde beheben; Entsperren und Start mit 500 Kunden messen.
6. README.md: Funktionsüberblick, Screenshots, Installation, Datenschutz (lokal, verschlüsselt, KI optional/pseudonymisiert), Backup-Empfehlung.
7. Gesamtcheck: kompletter Playwright-Durchlauf (Einrichtung → Kunde per Fragenkatalog → Bedarf → Wiedervorlage → Gespräch → Seminar → Netz → Backup → Wiederherstellen). Liste bekannte Einschränkungen und sinnvolle Ausbaustufen (z. B. Face-ID-Entsperren per WebAuthn-PRF, Erinnerungen per Push, Mehrgeräte-Sync).

Definition of Done:
- App lässt sich installieren, startet offline, alle Funktionen laufen.
- CLAUDE.md vollständig, Roadmap abgehakt, PR mit abschließender iPad-Prüfliste.
```
