# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-10-01

### Added

- **Sensor Reading** action: one HWiNFO reading as a value, a graph, both, or a ring gauge. Smooth-line or bar graphs, EMA smoothing, update interval, decimals, MB → GB conversion, custom label, color, background and font.
- **Composite Dashboard** action: 2–4 readings on one key with overlaid graphs and per-slot colors.
- **Derived Metric** action: sum, average, maximum, minimum, delta or percent over 2–8 readings, with presets saved in global settings.
- **Infobar Carousel** action for the Stream Deck Neo: single (with sparkline) and overview (three per page) styles, auto-cycling pages and custom labels.
- **Settings** action: connection status key, global poll rate (250 ms – 10 s) and an alert-rule library.
- Threshold alerts with hysteresis, dwell, cooldown, sticky mode, custom text and key-press snooze (5 min, 15 min, 1 h, until resumed).
- Property Inspector sensor picker with search, category filter and favorites.
- Portable `.streamDeckPlugin` packaging via `npm run package`.

[Unreleased]: https://github.com/recepemredev/streamdeck-hwinfo-monitor/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/recepemredev/streamdeck-hwinfo-monitor/releases/tag/v0.1.0
