# AgencyOS — Paket Spesifikasi untuk Antigravity

Ini adalah titik mulai proyek. Baca file ini dulu; kamu tidak perlu memilih sendiri file mana yang harus dipakai.

## Mulai dalam 3 langkah

1. Ekstrak folder `agentic-agency` ke lokasi proyek yang kamu inginkan, lalu buka folder itu di Antigravity.
2. Buka `ANTIGRAVITY_EXECUTION_PROMPT.md`, salin seluruh isinya, lalu kirim sebagai prompt ke Antigravity.
3. Biarkan Antigravity membaca spesifikasi dan membuat rencana. **Jangan minta implementasi langsung sebelum kamu meninjau dan menyetujui rencananya.**

## Peta file

### File di root (aturan dan titik masuk)
- `README.md` — panduan manusia untuk memulai.
- `AGENTS.md` — aturan tetap untuk AI coding agent.
- `ANTIGRAVITY_EXECUTION_PROMPT.md` — instruksi awal yang dikirim ke Antigravity.

### File di `docs/` (spesifikasi produk; sumber utama tunggal)
- `PROJECT_BRIEF.md` — visi dan gambaran produk.
- `PRODUCT_REQUIREMENTS.md` — kebutuhan dan fitur.
- `SYSTEM_ARCHITECTURE.md` — arsitektur teknis.
- `DOMAIN_MODEL.md` — konsep data dan hubungan antar-entitas.
- `AI_WORKFORCE_AND_RECRUITMENT.md` — workforce, role, agent, rekrutmen.
- `SCRUM_AND_EXECUTION_WORKFLOW.md` — Scrum, task, dan eksekusi.
- `UX_UI_DESIGN_SYSTEM.md` — aturan desain UI/UX.
- `SCREEN_SPECIFICATIONS.md` — spesifikasi layar.
- `SECURITY_AND_GOVERNANCE.md` — keamanan, izin, approval, audit.
- `IMPLEMENTATION_ROADMAP.md` — urutan fase implementasi.
- `QUALITY_GATES.md` — kriteria kualitas dan pemeriksaan.

## Aturan agar tidak membingungkan

- Spesifikasi produk hanya punya **satu versi resmi**, yaitu yang berada di `docs/`.
- Jangan membuat salinan spesifikasi yang sama di root.
- Jika ada konflik atau keputusan yang belum jelas, minta Antigravity mencatatnya di `docs/OPEN_QUESTIONS.md` dan menunggu persetujuan manusia.
- Antigravity harus memeriksa repo dan runtime yang tersedia terlebih dahulu. Jangan menganggap semua engine/API sudah siap.
- Mulai dengan mock execution yang jelas ditandai sebagai simulasi; jangan hubungkan engine live atau melakukan tindakan destruktif tanpa persetujuan.

## Struktur yang diharapkan

```text
agentic-agency/
├── README.md
├── AGENTS.md
├── ANTIGRAVITY_EXECUTION_PROMPT.md
└── docs/
    ├── PROJECT_BRIEF.md
    ├── PRODUCT_REQUIREMENTS.md
    ├── SYSTEM_ARCHITECTURE.md
    ├── DOMAIN_MODEL.md
    ├── AI_WORKFORCE_AND_RECRUITMENT.md
    ├── SCRUM_AND_EXECUTION_WORKFLOW.md
    ├── UX_UI_DESIGN_SYSTEM.md
    ├── SCREEN_SPECIFICATIONS.md
    ├── SECURITY_AND_GOVERNANCE.md
    ├── IMPLEMENTATION_ROADMAP.md
    └── QUALITY_GATES.md
```

Antigravity nantinya boleh menambahkan dokumen kerja seperti `docs/IMPLEMENTATION_PLAN.md`, `docs/ARCHITECTURE_DECISIONS.md`, dan `docs/OPEN_QUESTIONS.md`. Dokumen itu adalah hasil kerja baru, bukan salinan spesifikasi.
