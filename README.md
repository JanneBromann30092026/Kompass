# Kompass

Kundenbetreuung für Versicherung & Vorsorge – eine Progressive Web App für das iPad.
Alle Daten bleiben auf dem Gerät, die App funktioniert offline.

**App öffnen:** https://jannebromann30092026.github.io/Kompass/

> Das Repository ist öffentlich und enthält nur Code und erfundene Demo-Daten – **nie** echte
> Kundendaten.

## Installation auf dem iPad

1. https://jannebromann30092026.github.io/Kompass/ in **Safari** öffnen.
2. Oben auf das **Teilen-Symbol** tippen → **Zum Home-Bildschirm** → **Hinzufügen**.
3. Kompass ab jetzt immer über das Homescreen-Icon öffnen – nur so bleiben die Daten
   zuverlässig erhalten.

## Entwicklung

Node.js 22 (siehe `.nvmrc`).

| Befehl                | Zweck                                                        |
| --------------------- | ------------------------------------------------------------ |
| `npm run dev`         | Dev-Server                                                   |
| `npm run build`       | Production-Build nach `dist/`                                |
| `npm run typecheck`   | TypeScript (strict)                                          |
| `npm run lint`        | ESLint                                                       |
| `npm test`            | Unit-Tests (Vitest)                                          |
| `npm run e2e`         | Smoke-Tests (Playwright, iPad hoch/quer, gegen `vite preview`) |
| `npm run screenshots` | iPad-Screenshots nach `screenshots/`                         |
| `npm run icons`       | App-Icons und Startbilder aus `public/icons/favicon.svg`     |

Jeder Push auf `main` wird per GitHub Actions auf GitHub Pages veröffentlicht. Projektkontext,
Architektur und Roadmap: [CLAUDE.md](CLAUDE.md).
