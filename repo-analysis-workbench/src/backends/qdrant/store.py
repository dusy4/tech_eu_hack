from __future__ import annotations

import os
import uuid
from functools import lru_cache
from typing import Dict, Iterable, List, Sequence, Set, Tuple

from qdrant_client import QdrantClient, models


DEFAULT_QDRANT_URL = "http://127.0.0.1:6333"
UPSERT_BATCH_SIZE = 256
COLLECTION_PREFIX = "repo_analysis"


def qdrant_url() -> str:
    return os.environ.get("REPO_ANALYSIS_QDRANT_URL", DEFAULT_QDRANT_URL).strip() or DEFAULT_QDRANT_URL


@lru_cache(maxsize=None)
def get_client(url: str) -> QdrantClient:
    if url == ":memory:":
        return QdrantClient(location=":memory:")
    return QdrantClient(url=url, timeout=120)


def collection_name(repo_name: str, model_name: str) -> str:
    raw = f"{COLLECTION_PREFIX}__{repo_name}__{model_name}"
    return "".join(ch if ch.isalnum() or ch in {"-", "_", "."} else "_" for ch in raw)


def point_id(doc_id: str) -> str:
    return str(uuid.uuid5(uuid.NAMESPACE_URL, doc_id))


def write_dense_vectors(
    url: str,
    collection: str,
    dimensions: int,
    records: Sequence[Dict[str, object]],
) -> int:
    """Replace `collection` with `records`; each record's "vector" becomes the point
    vector and every other field becomes its payload."""
    ensure_collection(url, collection, dimensions, recreate=True)
    written = 0
    for batch in batched(records, UPSERT_BATCH_SIZE):
        written += upsert_dense(url, collection, batch)
    return written


def ensure_collection(url: str, collection: str, dimensions: int, *, recreate: bool = False) -> None:
    client = get_client(url)
    if client.collection_exists(collection):
        if not recreate:
            return
        client.delete_collection(collection)
    client.create_collection(
        collection_name=collection,
        vectors_config=models.VectorParams(size=dimensions, distance=models.Distance.COSINE, on_disk=True),
        # int8 copies stay in RAM for fast search; full vectors are read from disk to rescore.
        quantization_config=models.ScalarQuantization(
            scalar=models.ScalarQuantizationConfig(type=models.ScalarType.INT8, always_ram=True),
        ),
    )


def drop_collection(url: str, collection: str) -> None:
    client = get_client(url)
    if client.collection_exists(collection):
        client.delete_collection(collection)


def upsert_dense(url: str, collection: str, records: Sequence[Dict[str, object]]) -> int:
    get_client(url).upsert(
        collection_name=collection,
        points=[
            models.PointStruct(
                id=point_id(str(record["doc_id"])),
                vector=[float(value) for value in record["vector"]],
                payload={key: value for key, value in record.items() if key != "vector"},
            )
            for record in records
        ],
        wait=True,
    )
    return len(records)


def existing_point_ids(url: str, collection: str) -> Set[str]:
    """IDs already stored, used to resume an interrupted streaming build."""
    client = get_client(url)
    if not client.collection_exists(collection):
        return set()
    ids: Set[str] = set()
    offset = None
    while True:
        points, offset = client.scroll(
            collection_name=collection,
            limit=10_000,
            offset=offset,
            with_payload=False,
            with_vectors=False,
        )
        ids.update(str(point.id) for point in points)
        if offset is None:
            return ids


def count_points(url: str, collection: str) -> int:
    client = get_client(url)
    if not client.collection_exists(collection):
        return 0
    return int(client.count(collection_name=collection, exact=True).count)


def get_collection_dimensions(url: str, collection: str) -> int:
    client = get_client(url)
    if not client.collection_exists(collection):
        return 0
    vectors = client.get_collection(collection).config.params.vectors
    return int(vectors.size)


def search_dense(
    url: str,
    collection: str,
    vector: Sequence[float],
    *,
    limit: int,
) -> List[Tuple[Dict[str, object], float]]:
    """Return (payload, cosine similarity) pairs, best first."""
    response = get_client(url).query_points(
        collection_name=collection,
        query=[float(value) for value in vector],
        limit=limit,
        with_payload=True,
        search_params=models.SearchParams(
            quantization=models.QuantizationSearchParams(rescore=True, oversampling=2.0),
        ),
    )
    return [(dict(point.payload or {}), float(point.score)) for point in response.points]


def batched(values: Sequence[Dict[str, object]], size: int) -> Iterable[Sequence[Dict[str, object]]]:
    for index in range(0, len(values), size):
        yield values[index : index + size]
