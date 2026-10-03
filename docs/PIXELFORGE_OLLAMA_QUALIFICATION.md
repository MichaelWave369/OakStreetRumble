# PixelForge Ollama -> Oak qualification

This rung proves that Oak Street Rumble can be controlled through the canonical
PixelForge runtime/model stack without copying provider code into Oak.

```text
PixelForge Ollama Provider v1
        |
        v
ModelPolicyClientV1
        |
        v
RuntimeHostV1
        |
        v
Oak PixelForge Bridge v1
        |
        v
OakRuntime
        |
        +-- authority
        +-- rules
        +-- simulation
        +-- Reality Ledger
```

## CI qualification

The CI test uses the exact merged PixelForge commit pinned in `package.json`.

It does not require a live Ollama daemon. A fake transport returns an
Ollama-shaped response, then the real PixelForge provider/model/host stack must
convert that response into one Oak MOVE intent.

Acceptance requires:

- model controller can observe before delegation but has zero allowed actions,
- human authority starts the run,
- human authority delegates movement only,
- model observation exposes MOVE and withholds combat/purchase/authority/session,
- fake Ollama sees only the bounded observation,
- model emits exactly one MOVE,
- Oak accepts that MOVE through its normal authority/rules path,
- Reed's authoritative x position increases,
- the accepted Reality Ledger event preserves model controller identity and
  correlation id,
- model receipts, host receipts and Oak recording all contain matching evidence.

A second test sends malformed Ollama prose and requires zero model-authored game
events and no movement.

## Live local qualification

A real installed Ollama model can run the same boundary locally:

```powershell
$env:OLLAMA_MODEL="your-installed-model"
npm run qualify:ollama
```

Optional endpoint override:

```powershell
$env:OLLAMA_BASE_URL="http://127.0.0.1:11434"
$env:OLLAMA_MODEL="your-installed-model"
npm run qualify:ollama
```

The live model receives only the bounded Oak observation and explicit instruction
to return one MOVE intent. PASS requires a governed accepted MOVE and an actual
increase in Reed's x position.

## Evidence streams

Three separate transcripts remain distinct:

```text
Model receipts
  request/provider/parse boundary

Host receipts
  observe/queue/advance/event-consumption boundary

Oak Reality Ledger
  authority/rule/game consequence truth
```

The test correlates them without merging their responsibilities.

## Deliberate non-goals

This qualification does not:

- grant the model combat/navigation/purchase/session authority,
- give the model direct World access,
- let the provider mutate Oak,
- add autonomous continuous play,
- add retries or hidden repair of malformed model output,
- require Ollama in CI.
