"""Query-string parsing with consistent 400 errors."""
from __future__ import annotations

from flask import request


class ApiError(Exception):
    def __init__(self, status: int, code: str, message: str, details: dict | None = None):
        super().__init__(message)
        self.status, self.code, self.message, self.details = status, code, message, details

    def to_dict(self) -> dict:
        body = {"status": self.status, "code": self.code, "message": self.message}
        if self.details:
            body["details"] = self.details
        return {"error": body}


def not_found(what: str, value: str) -> ApiError:
    return ApiError(404, "not_found", f"{what} '{value}' does not exist.", {what: value})


def _bad(name: str, message: str) -> ApiError:
    return ApiError(400, "invalid_parameter", f"Query parameter '{name}' {message}", {"parameter": name})


def get_bool(name: str, default: bool) -> bool:
    raw = request.args.get(name)
    if raw is None or raw == "":
        return default
    value = raw.strip().lower()
    if value in ("1", "true", "yes", "on"):
        return True
    if value in ("0", "false", "no", "off"):
        return False
    raise _bad(name, "must be true or false.")


def get_int(name: str, default: int, minimum: int, maximum: int) -> int:
    raw = request.args.get(name)
    if raw is None or raw == "":
        return default
    try:
        value = int(raw)
    except ValueError:
        raise _bad(name, "must be an integer.") from None
    if not minimum <= value <= maximum:
        raise _bad(name, f"must be between {minimum} and {maximum}.")
    return value


def get_choice(name: str, default: str, choices: tuple[str, ...]) -> str:
    value = request.args.get(name) or default
    if value not in choices:
        raise _bad(name, f"must be one of: {', '.join(choices)}.")
    return value


def get_list(name: str, default: tuple[str, ...], choices: tuple[str, ...] | None = None) -> tuple[str, ...]:
    raw = request.args.get(name)
    if raw is None or raw.strip() == "":
        return default
    values = tuple(dict.fromkeys(v.strip() for v in raw.split(",") if v.strip()))
    if choices:
        unknown = [v for v in values if v not in choices]
        if unknown:
            raise _bad(name, f"has unknown value(s) {', '.join(unknown)}; allowed: {', '.join(choices)}.")
    return values


def get_str(name: str) -> str | None:
    value = request.args.get(name)
    return value.strip() if value and value.strip() else None
