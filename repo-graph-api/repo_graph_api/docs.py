"""OpenAPI document and an interactive Swagger UI page."""
from __future__ import annotations

from flask import Blueprint, jsonify, redirect, request

from .openapi import spec

bp = Blueprint("docs", __name__)

SWAGGER_PAGE = """<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <title>repo-graph-api</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui.css">
</head>
<body>
  <div id="ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui-bundle.js"></script>
  <script>SwaggerUIBundle({url: "/api/v1/openapi.json", dom_id: "#ui", deepLinking: true, tryItOutEnabled: true});</script>
</body>
</html>"""


@bp.get("/api/v1/openapi.json")
def openapi_json():
    return jsonify(spec(request.host_url.rstrip("/")))


@bp.get("/docs")
def docs():
    return SWAGGER_PAGE


@bp.get("/")
def index():
    return redirect("/docs")
