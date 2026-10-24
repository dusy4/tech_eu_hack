"""Check a Hugging Face safetensors model for untrained (all-ones) norm weights
without downloading it: reads the header and a few small tensors via HTTP ranges."""

import json
import struct
import sys
import urllib.request

import numpy as np

PROBES = ["model.norm.weight", "model.layers.0.input_layernorm.weight", "model.layers.10.self_attn.q_norm.weight"]


def get(url, start, end):
    req = urllib.request.Request(url, headers={"Range": f"bytes={start}-{end}"})
    with urllib.request.urlopen(req) as r:
        return r.read()


def files_for(repo):
    idx_url = f"https://huggingface.co/{repo}/resolve/main/model.safetensors.index.json"
    try:
        with urllib.request.urlopen(idx_url) as r:
            weight_map = json.load(r)["weight_map"]
    except Exception:
        weight_map = {}
    return weight_map


def check(repo):
    weight_map = files_for(repo)
    print(f"== {repo}")
    for name in PROBES:
        # official HF embedding checkpoints omit the "model." prefix
        if name not in weight_map and name.removeprefix("model.") in weight_map:
            name = name.removeprefix("model.")
        fname = weight_map.get(name, "model.safetensors")
        url = f"https://huggingface.co/{repo}/resolve/main/{fname}"
        n = struct.unpack("<Q", get(url, 0, 7))[0]
        header = json.loads(get(url, 8, 8 + n - 1))
        meta = header.get(name)
        if meta is None:
            print(f"   {name}: not found in {fname}")
            continue
        a, b = meta["data_offsets"]
        raw = get(url, 8 + n + a, 8 + n + b - 1)
        dtype = meta["dtype"]
        if dtype == "BF16":
            vals = (np.frombuffer(raw, dtype=np.uint16).astype(np.uint32) << 16).view(np.float32)
        elif dtype == "F16":
            vals = np.frombuffer(raw, dtype=np.float16).astype(np.float32)
        else:
            vals = np.frombuffer(raw, dtype=np.float32)
        verdict = "UNTRAINED (all ones)" if np.allclose(vals, 1.0) else "trained"
        print(f"   {name}: mean={vals.mean():.4f} std={vals.std():.4f}  -> {verdict}")


for repo in sys.argv[1:]:
    try:
        check(repo)
    except Exception as exc:
        print(f"== {repo}\n   error: {exc}")
