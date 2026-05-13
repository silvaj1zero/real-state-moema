# Execution Flow and Performance

## Execution Flow

```
Input (URL ou File)
       │
       ▼
┌────────────────┐
│  0. Route      │ → YouTube URL? → ETL Pipeline
│                │ → Local file?  → Whisper Pipeline
└──────┬─────────┘
       │
       ├── YouTube ─────────────────────┐
       │                                ▼
       │                   ┌─────────────────────┐
       │                   │ 1. youtube-transcript│ → ETL: legendas via API
       │                   └──────┬──────────────┘
       │                          │
       │                          ▼ (se --clean)
       │                   ┌─────────────────────────┐
       │                   │ 1b. clean-transcript    │ → LLM: pontuação + parágrafos
       │                   └──────┬──────────────────┘
       │                          │
       ├── Local ───────────┐     │
       │                    ▼     │
       │        ┌──────────────┐  │
       │        │ 1. Validate  │  │
       │        └──────┬───────┘  │
       │               ▼          │
       │        ┌──────────────┐  │
       │        │ 2. Extract   │  │
       │        └──────┬───────┘  │
       │               ▼          │
       │        ┌──────────────┐  │
       │        │ 3. Whisper   │  │
       │        └──────┬───────┘  │
       │               ▼          │
       │        ┌──────────────┐  │
       │        │3.5 Fix Times │  │
       │        └──────┬───────┘  │
       │               │          │
       │               ▼          ▼
       │        ┌──────────────────┐
       └───────►│  4. Organize     │ → outputs/transcriptions/{slug}/
                └──────┬───────────┘
                       ▼
                ┌──────────────────┐
                │  5. Report       │ → Summary + Preview
                └──────────────────┘
```

## Performance Reference (M3 Ultra)

### Com 2x Speed (Default)

Pesquisa demonstrou que 2x **mantém ou melhora** qualidade (WER 5.1-5.8% vs 5-6% em 1x).

| Duração | Tempo estimado | Velocidade | Melhoria |
|---------|----------------|------------|----------|
| 1 min   | ~2s            | ~30-40x    | 50%      |
| 5 min   | ~8-10s         | ~30-40x    | 50%      |
| 30 min  | ~1 min         | ~30x       | 50%      |
| 1 hora  | ~2-2.5 min     | ~25-30x    | 50%      |
| 4 horas | ~10-12 min     | ~20-25x    | 50%      |

### Com --no-speed (1x, timestamps exatos)

Use apenas quando precisar de timestamps 100% exatos para legendas críticas.

| Duração | Tempo estimado | Velocidade |
|---------|----------------|------------|
| 1 min   | ~3-4s          | ~15-20x    |
| 5 min   | ~15-20s        | ~15-20x    |
| 30 min  | ~2 min         | ~15x       |
| 1 hora  | ~4-5 min       | ~12-15x    |
| 4 horas | ~20-25 min     | ~10-12x    |
