# Talks

Slides and notes for my conference talks. Each talk lives in its own folder under [`talks/`](talks/) with a README and a self-contained HTML deck. [`talks.json`](talks.json) is the machine-readable index.

## Talks

| Year | Talk | Event |
| --- | --- | --- |
| 2026 | [Give your AI agent a job, not a prompt](talks/2026-digital-marketing-europe/README.md) · [slides](talks/2026-digital-marketing-europe/slides.html) | Digital Marketing Europe 2026 |

## Layout

```
talks/
├── README.md
├── talks.json
└── talks/
    └── 2026-digital-marketing-europe/
        ├── README.md
        └── slides.html
```

## Adding a talk

1. Create `talks/<year>-<event-slug>/` with a `README.md` and `slides.html`.
2. Add an entry to `talks.json`.
3. Add a row to the table above.

GitHub rejects files over 100 MB, so compress embedded images before adding a deck.
