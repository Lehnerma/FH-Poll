# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Projektstatus

Das Repository ist noch leer (Stand: Initialisierung, keine Commits, kein Angular-Projekt angelegt). Diese Datei beschreibt die geplante Ausrichtung. Sobald das Projekt gescaffoldet ist, Build-/Lint-/Test-Befehle und die tatsächliche Architektur hier ergänzen und die Annahmen unten prüfen.

## Projekt

Umfrage-App für Schüler (FH-Poll). Single-Page-Application mit Angular 22 (aktuelle Angular-Standards: Standalone-Komponenten, Signals, moderne Control-Flow-Syntax `@if`/`@for`, `inject()`) und Firebase als Backend-as-a-Service.

## Fachliche Kernregeln

- **Teilnehmer ohne Authentifizierung:** Beim ersten Besuch gibt der Nutzer nur einen Nickname ein; damit beantwortet er Umfragen. Kein Login, keine Registrierung.
- **Admin-Zugang (separat):** Umfragen erstellen, bearbeiten, schließen und löschen. Die Admin-Rechte müssen serverseitig (Firebase Security Rules) abgesichert sein, nicht nur per Route-Guard im Client.
- **Live-Ergebnisse:** Kommen später, schrittweise. Datenmodell und Firestore-Struktur so wählen, dass Echtzeit-Updates (Snapshot-Listener) nachrüstbar sind.

## Lint / Code-Qualität

Linting wird durchgängig für Clean Code eingesetzt. Das Lint-Setup ist noch nicht vorhanden und wird vom Nutzer ergänzt; danach den Lint-Befehl hier eintragen. Code muss lint-clean sein, bevor er als fertig gilt.

## Arbeitsweise (aus der globalen Nutzer-Konfiguration)

- Sprache: Deutsch. Den Nutzer (Max) im ersten Satz mit Namen ansprechen.
- Standardmäßig Berater statt Ausführer: Code nur auf explizite Aufforderung schreiben oder ändern.
- Tagebuch: pro Tag eine Datei `.claude/tagebuch/YYYY-MM-DD.md` mit kurzen Stichpunkten.
- Moderne Sprach-/Framework-Schreibweise, kein veralteter Stil.
- HTML: auf semantische Fehler hinweisen; Barrierefreiheit nur als Hinweis, nicht zwingend umsetzen.
