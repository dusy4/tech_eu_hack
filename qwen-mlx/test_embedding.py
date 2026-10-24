"""Standalone check of Qwen3-Embedding-8B (4-bit MLX) on Metal.

Uses the same pooling code as server.py: queries get the instruction prefix,
documents don't, last-token hidden state, L2-normalised. Prints a similarity
matrix and checks each query's best match is the intended snippet.
"""

import time

import mlx.core as mx
from mlx_lm import load

from server import DEFAULT_EMBED_MODEL, EMBED_QUERY_TASK, batched_by_tokens, last_token_hidden

DOCS = {
    "retry": """fn retry_with_backoff<F, T>(mut op: F, max_attempts: u32) -> Result<T, Error>
where F: FnMut() -> Result<T, Error> {
    let mut delay = Duration::from_millis(100);
    for attempt in 1..=max_attempts {
        match op() {
            Ok(v) => return Ok(v),
            Err(e) if attempt < max_attempts => { thread::sleep(delay); delay *= 2; }
            Err(e) => return Err(e),
        }
    }
    unreachable!()
}""",
    "walkdir": """impl Iterator for IntoIter {
    type Item = Result<DirEntry>;
    fn next(&mut self) -> Option<Result<DirEntry>> {
        if let Some(start) = self.start.take() {
            let dent = itry!(DirEntry::from_path(0, start, false));
            if let Some(result) = self.handle_entry(dent) { return Some(result); }
        }
        while !self.stack_list.is_empty() {
            self.depth = self.stack_list.len();
            // pop the next entry from the directory stack ...
        }
        None
    }
}""",
    "config": """#[derive(Deserialize)]
pub struct Config {
    pub database_url: String,
    pub port: u16,
}
pub fn load_config(path: &Path) -> anyhow::Result<Config> {
    let text = fs::read_to_string(path)?;
    Ok(toml::from_str(&text)?)
}""",
    "hash": """def sha1_file(path: Path) -> str:
    digest = hashlib.sha1()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(65536), b""):
            digest.update(chunk)
    return digest.hexdigest()""",
}
QUERIES = {
    "retry": "How does retry handling with exponential backoff work?",
    "walkdir": "recursively iterate over directory entries",
    "config": "where is the TOML configuration file parsed",
    "hash": "compute a checksum of a file's contents",
}


def main() -> None:
    t0 = time.time()
    model, wrapper = load(str(DEFAULT_EMBED_MODEL))
    model.pop("lm_head", None)
    tok = wrapper._tokenizer
    eos = tok.convert_tokens_to_ids("<|endoftext|>")
    pad = tok.pad_token_id if tok.pad_token_id is not None else eos
    print(f"load: {time.time() - t0:.1f}s   GPU active: {mx.get_active_memory() / 1e9:.2f} GB   device: {mx.default_device()}")

    def embed(texts, is_query):
        seqs = []
        for t in texts:
            if is_query:
                t = f"Instruct: {EMBED_QUERY_TASK}\nQuery:{t}"
            seqs.append(tok.encode(t, add_special_tokens=False) + [eos])
        out = [None] * len(seqs)
        for batch in batched_by_tokens(seqs, 4096):
            v = last_token_hidden(model, [seqs[i] for i in batch], pad).astype(mx.float32)
            v = v / mx.linalg.norm(v, axis=-1, keepdims=True)
            mx.eval(v)
            for i, row in zip(batch, v):
                out[i] = row
        return mx.stack(out), sum(len(s) for s in seqs)

    names = list(DOCS)
    embed(["warm-up"], False)  # compile Metal kernels

    t0 = time.time()
    doc_vecs, doc_tokens = embed([DOCS[n] for n in names], False)
    doc_time = time.time() - t0
    t0 = time.time()
    q_vecs, q_tokens = embed([QUERIES[n] for n in names], True)
    q_time = time.time() - t0
    print(f"dim: {doc_vecs.shape[1]}   docs: {doc_tokens} tokens in {doc_time:.2f}s ({doc_tokens / doc_time:.0f} tok/s)"
          f"   queries: {q_tokens} tokens in {q_time:.2f}s")

    # Unbatched vs batched must agree (checks right-padding is exact).
    single, _ = embed([DOCS[names[0]]], False)
    drift = float(mx.max(mx.abs(single[0] - doc_vecs[0])))
    print(f"batched vs single max diff: {drift:.2e}")

    sims = q_vecs @ doc_vecs.T
    mx.eval(sims)
    print("\ncosine similarity (rows = queries, cols = docs)")
    print(" " * 10 + "".join(f"{n:>10}" for n in names))
    correct = 0
    for i, n in enumerate(names):
        row = sims[i].tolist()
        best = names[max(range(len(row)), key=row.__getitem__)]
        correct += best == n
        print(f"{n:>10}" + "".join(f"{v:>10.3f}" for v in row) + f"   best={best}{' OK' if best == n else ' WRONG'}")
    print(f"\n{correct}/{len(names)} queries matched their intended snippet")
    print(f"peak GPU memory: {mx.get_peak_memory() / 1e9:.2f} GB")


if __name__ == "__main__":
    main()
