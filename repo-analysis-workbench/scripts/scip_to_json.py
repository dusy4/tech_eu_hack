"""Convert a binary SCIP index (e.g. from `rust-analyzer scip`) to the .scip.json
format that `build-index --scip-index` imports, without the external `scip` CLI.

Usage: .venv/bin/python scripts/scip_to_json.py index.scip [index.scip.json]
"""

import json
import sys
from pathlib import Path

from google.protobuf.json_format import MessageToDict

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src" / "parsers" / "scip_proto"))
import scip_pb2  # noqa: E402  (generated from scip.proto by grpc_tools.protoc)


def main() -> None:
    source = Path(sys.argv[1])
    target = Path(sys.argv[2]) if len(sys.argv) > 2 else source.with_name(source.name + ".json")
    index = scip_pb2.Index()
    index.ParseFromString(source.read_bytes())
    payload = MessageToDict(index, preserving_proto_field_name=True, use_integers_for_enums=True)
    for document in payload.get("documents", []):
        document.pop("text", None)  # full file text isn't needed for import
    target.write_text(json.dumps(payload), encoding="utf-8")
    documents = payload.get("documents", [])
    occurrences = sum(len(doc.get("occurrences", [])) for doc in documents)
    symbols = sum(len(doc.get("symbols", [])) for doc in documents)
    print(f"{target}: {len(documents)} documents, {symbols} symbols, {occurrences} occurrences")


if __name__ == "__main__":
    main()
