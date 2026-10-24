<h1 id="sizuku-studio-api">Sizuku Studio API v1.0.0</h1>

> Scroll down for code samples, example requests and responses. Select a language for code samples from the tabs above or the mobile navigation menu.

Local API behind `sizuku studio`: the Drizzle schema file on disk, its ER diagram and docs,
the formatter, the project's TypeScript for the editor, and the connected database. It listens on loopback only and has no
authentication, so nothing here is reachable from another origin.

<h1 id="sizuku-studio-api-schema">schema</h1>

## readSchema

<a id="opIdreadSchema"></a>

> Code samples

```bash
curl http://127.0.0.1:4983/api/schema \
  -H 'Accept: application/json'
```

`GET /schema`

The schema file as it is on disk.

> Example responses

> 200 Response

```json
{
  "path": "string",
  "file": "string",
  "source": "string",
  "parseError": {
    "message": "Expected `)` but found `EOF`",
    "line": 12,
    "column": 3
  }
}
```

> 500 Response

```json
{
  "type": "/problems/internal-server-error",
  "title": "Internal Server Error",
  "status": 500,
  "detail": "string",
  "instance": "string"
}
```

<h3 id="readschema-responses">Responses</h3>

| Status | Meaning               | Description                                            | Schema                                                |
| ------ | --------------------- | ------------------------------------------------------ | ----------------------------------------------------- |
| 200    | OK                    | The request has succeeded.                             | [Snapshot](#schemasnapshot)                           |
| 500    | Internal Server Error | 500 Internal Server Error (`application/problem+json`) | [InternalServerProblem](#schemainternalserverproblem) |

<aside class="success">
This operation does not require authentication
</aside>

## writeSchema

<a id="opIdwriteSchema"></a>

> Code samples

```bash
curl http://127.0.0.1:4983/api/schema \
  -X PUT \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  -d '{
    "source": "string"
  }'
```

`PUT /schema`

Write the schema file.

> Body parameter

```json
{
  "source": "string"
}
```

<h3 id="writeschema-parameters">Parameters</h3>

| Name     | In   | Type                        | Required | Description    |
| -------- | ---- | --------------------------- | -------- | -------------- |
| body     | body | [SaveBody](#schemasavebody) | true     | none           |
| » source | body | string                      | true     | The whole file |

> Example responses

> 200 Response

```json
{
  "path": "string",
  "file": "string",
  "source": "string",
  "parseError": {
    "message": "Expected `)` but found `EOF`",
    "line": 12,
    "column": 3
  }
}
```

> 422 Response

```json
{
  "type": "/problems/validation-failed",
  "title": "Validation Failed",
  "status": 422,
  "detail": "string",
  "instance": "string",
  "errors": [
    {
      "field": "string",
      "message": "string"
    }
  ]
}
```

> 500 Response

```json
{
  "type": "/problems/internal-server-error",
  "title": "Internal Server Error",
  "status": 500,
  "detail": "string",
  "instance": "string"
}
```

<h3 id="writeschema-responses">Responses</h3>

| Status | Meaning               | Description                                            | Schema                                                |
| ------ | --------------------- | ------------------------------------------------------ | ----------------------------------------------------- |
| 200    | OK                    | The request has succeeded.                             | [Snapshot](#schemasnapshot)                           |
| 422    | Unprocessable Entity  | 422 Unprocessable Content (`application/problem+json`) | [ValidationProblem](#schemavalidationproblem)         |
| 500    | Internal Server Error | 500 Internal Server Error (`application/problem+json`) | [InternalServerProblem](#schemainternalserverproblem) |

<aside class="success">
This operation does not require authentication
</aside>

## readSchemaEvents

<a id="opIdreadSchemaEvents"></a>

> Code samples

```bash
curl http://127.0.0.1:4983/api/schema/events
```

`GET /schema/events`

A `change` event whenever the schema file changes on disk.

<h3 id="readschemaevents-responses">Responses</h3>

| Status | Meaning | Description                | Schema |
| ------ | ------- | -------------------------- | ------ |
| 200    | OK      | The request has succeeded. | Inline |

<aside class="success">
This operation does not require authentication
</aside>

<h1 id="sizuku-studio-api-diagram">diagram</h1>

## drawSvg

<a id="opIddrawSvg"></a>

> Code samples

```bash
curl http://127.0.0.1:4983/api/diagram/svg \
  -X POST \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  -d '{
    "source": "string",
    "theme": {}
  }'
```

`POST /diagram/svg`

The ER diagram of a schema as SVG.

> Body parameter

```json
{
  "source": "string",
  "theme": {}
}
```

<h3 id="drawsvg-parameters">Parameters</h3>

| Name     | In   | Type                              | Required | Description                            |
| -------- | ---- | --------------------------------- | -------- | -------------------------------------- |
| body     | body | [DiagramBody](#schemadiagrambody) | true     | none                                   |
| » source | body | string                            | true     | The schema source                      |
| » theme  | body | object                            | false    | The colour scheme; light when left out |

> Example responses

> 200 Response

```json
{
  "svg": "string",
  "parseError": {
    "message": "Expected `)` but found `EOF`",
    "line": 12,
    "column": 3
  }
}
```

> 422 Response

```json
{
  "type": "/problems/validation-failed",
  "title": "Validation Failed",
  "status": 422,
  "detail": "string",
  "instance": "string",
  "errors": [
    {
      "field": "string",
      "message": "string"
    }
  ]
}
```

> 500 Response

```json
{
  "type": "/problems/internal-server-error",
  "title": "Internal Server Error",
  "status": 500,
  "detail": "string",
  "instance": "string"
}
```

<h3 id="drawsvg-responses">Responses</h3>

| Status | Meaning               | Description                                            | Schema                                                |
| ------ | --------------------- | ------------------------------------------------------ | ----------------------------------------------------- |
| 200    | OK                    | The request has succeeded.                             | [Diagram](#schemadiagram)                             |
| 422    | Unprocessable Entity  | 422 Unprocessable Content (`application/problem+json`) | [ValidationProblem](#schemavalidationproblem)         |
| 500    | Internal Server Error | 500 Internal Server Error (`application/problem+json`) | [InternalServerProblem](#schemainternalserverproblem) |

<aside class="success">
This operation does not require authentication
</aside>

## drawPng

<a id="opIddrawPng"></a>

> Code samples

```bash
curl http://127.0.0.1:4983/api/diagram/png \
  -X POST \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  -d '{
    "source": "string",
    "theme": {}
  }'
```

`POST /diagram/png`

The ER diagram of a schema as PNG.

> Body parameter

```json
{
  "source": "string",
  "theme": {}
}
```

<h3 id="drawpng-parameters">Parameters</h3>

| Name     | In   | Type                              | Required | Description                            |
| -------- | ---- | --------------------------------- | -------- | -------------------------------------- |
| body     | body | [DiagramBody](#schemadiagrambody) | true     | none                                   |
| » source | body | string                            | true     | The schema source                      |
| » theme  | body | object                            | false    | The colour scheme; light when left out |

> Example responses

> 200 Response

```json
{
  "base64": "string"
}
```

> 422 Response

```json
{
  "type": "/problems/validation-failed",
  "title": "Validation Failed",
  "status": 422,
  "detail": "string",
  "instance": "string",
  "errors": [
    {
      "field": "string",
      "message": "string"
    }
  ]
}
```

> 500 Response

```json
{
  "type": "/problems/internal-server-error",
  "title": "Internal Server Error",
  "status": 500,
  "detail": "string",
  "instance": "string"
}
```

<h3 id="drawpng-responses">Responses</h3>

| Status | Meaning               | Description                                            | Schema                                                |
| ------ | --------------------- | ------------------------------------------------------ | ----------------------------------------------------- |
| 200    | OK                    | The request has succeeded.                             | [Png](#schemapng)                                     |
| 422    | Unprocessable Entity  | 422 Unprocessable Content (`application/problem+json`) | [ValidationProblem](#schemavalidationproblem)         |
| 500    | Internal Server Error | 500 Internal Server Error (`application/problem+json`) | [InternalServerProblem](#schemainternalserverproblem) |

<aside class="success">
This operation does not require authentication
</aside>

<h1 id="sizuku-studio-api-format">format</h1>

## formatSource

<a id="opIdformatSource"></a>

> Code samples

```bash
curl http://127.0.0.1:4983/api/format \
  -X POST \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  -d '{
    "source": "string",
    "options": {
      "printWidth": 20,
      "tabWidth": 1,
      "useTabs": true,
      "semi": true,
      "singleQuote": true,
      "trailingComma": "all",
      "bracketSpacing": true,
      "arrowParens": "always"
    }
  }'
```

`POST /format`

Format a schema with oxfmt; a source that does not parse is a 422.

> Body parameter

```json
{
  "source": "string",
  "options": {
    "printWidth": 20,
    "tabWidth": 1,
    "useTabs": true,
    "semi": true,
    "singleQuote": true,
    "trailingComma": "all",
    "bracketSpacing": true,
    "arrowParens": "always"
  }
}
```

<h3 id="formatsource-parameters">Parameters</h3>

| Name               | In   | Type                            | Required | Description                                            |
| ------------------ | ---- | ------------------------------- | -------- | ------------------------------------------------------ |
| body               | body | [FormatBody](#schemaformatbody) | true     | none                                                   |
| » source           | body | string                          | true     | The schema source                                      |
| » options          | body | object                          | false    | Options for this run; the saved settings when left out |
| » » printWidth     | body | integer(int32)                  | false    | The line length the printer wraps at                   |
| » » tabWidth       | body | integer(int32)                  | false    | Spaces per indentation level                           |
| » » useTabs        | body | boolean                         | false    | Indent with tabs instead of spaces                     |
| » » semi           | body | boolean                         | false    | End statements with a semicolon                        |
| » » singleQuote    | body | boolean                         | false    | Use single quotes for strings                          |
| » » trailingComma  | body | string                          | false    | Trailing commas where valid                            |
| » » bracketSpacing | body | boolean                         | false    | Spaces inside object braces                            |
| » » arrowParens    | body | string                          | false    | Parentheses around a sole arrow function parameter     |

#### Enumerated Values

| Parameter         | Value  |
| ----------------- | ------ |
| » » trailingComma | all    |
| » » trailingComma | es5    |
| » » trailingComma | none   |
| » » arrowParens   | always |
| » » arrowParens   | avoid  |

> Example responses

> 200 Response

```json
{
  "source": "string"
}
```

> 422 Response

```json
{
  "type": "/problems/validation-failed",
  "title": "Validation Failed",
  "status": 422,
  "detail": "string",
  "instance": "string",
  "errors": [
    {
      "field": "string",
      "message": "string"
    }
  ]
}
```

> 500 Response

```json
{
  "type": "/problems/internal-server-error",
  "title": "Internal Server Error",
  "status": 500,
  "detail": "string",
  "instance": "string"
}
```

<h3 id="formatsource-responses">Responses</h3>

| Status | Meaning               | Description                                            | Schema                                                |
| ------ | --------------------- | ------------------------------------------------------ | ----------------------------------------------------- |
| 200    | OK                    | The request has succeeded.                             | [Formatted](#schemaformatted)                         |
| 422    | Unprocessable Entity  | 422 Unprocessable Content (`application/problem+json`) | [ValidationProblem](#schemavalidationproblem)         |
| 500    | Internal Server Error | 500 Internal Server Error (`application/problem+json`) | [InternalServerProblem](#schemainternalserverproblem) |

<aside class="success">
This operation does not require authentication
</aside>

## readFormatSettings

<a id="opIdreadFormatSettings"></a>

> Code samples

```bash
curl http://127.0.0.1:4983/api/format/settings \
  -H 'Accept: application/json'
```

`GET /format/settings`

The formatter settings in effect.

> Example responses

> 200 Response

```json
{
  "options": {
    "printWidth": 20,
    "tabWidth": 1,
    "useTabs": true,
    "semi": true,
    "singleQuote": true,
    "trailingComma": "all",
    "bracketSpacing": true,
    "arrowParens": "always"
  },
  "configPath": "string"
}
```

> 500 Response

```json
{
  "type": "/problems/internal-server-error",
  "title": "Internal Server Error",
  "status": 500,
  "detail": "string",
  "instance": "string"
}
```

<h3 id="readformatsettings-responses">Responses</h3>

| Status | Meaning               | Description                                            | Schema                                                |
| ------ | --------------------- | ------------------------------------------------------ | ----------------------------------------------------- |
| 200    | OK                    | The request has succeeded.                             | [FormatSettings](#schemaformatsettings)               |
| 500    | Internal Server Error | 500 Internal Server Error (`application/problem+json`) | [InternalServerProblem](#schemainternalserverproblem) |

<aside class="success">
This operation does not require authentication
</aside>

## writeFormatSettings

<a id="opIdwriteFormatSettings"></a>

> Code samples

```bash
curl http://127.0.0.1:4983/api/format/settings \
  -X PUT \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  -d '{
    "options": {
      "printWidth": 20,
      "tabWidth": 1,
      "useTabs": true,
      "semi": true,
      "singleQuote": true,
      "trailingComma": "all",
      "bracketSpacing": true,
      "arrowParens": "always"
    }
  }'
```

`PUT /format/settings`

Save the formatter settings to the project's `.oxfmtrc.json`.

> Body parameter

```json
{
  "options": {
    "printWidth": 20,
    "tabWidth": 1,
    "useTabs": true,
    "semi": true,
    "singleQuote": true,
    "trailingComma": "all",
    "bracketSpacing": true,
    "arrowParens": "always"
  }
}
```

<h3 id="writeformatsettings-parameters">Parameters</h3>

| Name               | In   | Type                                            | Required | Description                                        |
| ------------------ | ---- | ----------------------------------------------- | -------- | -------------------------------------------------- |
| body               | body | [FormatSettingsBody](#schemaformatsettingsbody) | true     | none                                               |
| » options          | body | object                                          | true     | The options to save                                |
| » » printWidth     | body | integer(int32)                                  | false    | The line length the printer wraps at               |
| » » tabWidth       | body | integer(int32)                                  | false    | Spaces per indentation level                       |
| » » useTabs        | body | boolean                                         | false    | Indent with tabs instead of spaces                 |
| » » semi           | body | boolean                                         | false    | End statements with a semicolon                    |
| » » singleQuote    | body | boolean                                         | false    | Use single quotes for strings                      |
| » » trailingComma  | body | string                                          | false    | Trailing commas where valid                        |
| » » bracketSpacing | body | boolean                                         | false    | Spaces inside object braces                        |
| » » arrowParens    | body | string                                          | false    | Parentheses around a sole arrow function parameter |

#### Enumerated Values

| Parameter         | Value  |
| ----------------- | ------ |
| » » trailingComma | all    |
| » » trailingComma | es5    |
| » » trailingComma | none   |
| » » arrowParens   | always |
| » » arrowParens   | avoid  |

> Example responses

> 200 Response

```json
{
  "options": {
    "printWidth": 20,
    "tabWidth": 1,
    "useTabs": true,
    "semi": true,
    "singleQuote": true,
    "trailingComma": "all",
    "bracketSpacing": true,
    "arrowParens": "always"
  },
  "configPath": "string"
}
```

> 422 Response

```json
{
  "type": "/problems/validation-failed",
  "title": "Validation Failed",
  "status": 422,
  "detail": "string",
  "instance": "string",
  "errors": [
    {
      "field": "string",
      "message": "string"
    }
  ]
}
```

> 500 Response

```json
{
  "type": "/problems/internal-server-error",
  "title": "Internal Server Error",
  "status": 500,
  "detail": "string",
  "instance": "string"
}
```

<h3 id="writeformatsettings-responses">Responses</h3>

| Status | Meaning               | Description                                            | Schema                                                |
| ------ | --------------------- | ------------------------------------------------------ | ----------------------------------------------------- |
| 200    | OK                    | The request has succeeded.                             | [FormatSettings](#schemaformatsettings)               |
| 422    | Unprocessable Entity  | 422 Unprocessable Content (`application/problem+json`) | [ValidationProblem](#schemavalidationproblem)         |
| 500    | Internal Server Error | 500 Internal Server Error (`application/problem+json`) | [InternalServerProblem](#schemainternalserverproblem) |

<aside class="success">
This operation does not require authentication
</aside>

<h1 id="sizuku-studio-api-docs">docs</h1>

## readDocs

<a id="opIdreadDocs"></a>

> Code samples

```bash
curl http://127.0.0.1:4983/api/docs \
  -H 'Accept: application/json'
```

`GET /docs`

The generated documentation of the saved schema.

> Example responses

> 200 Response

```json
{
  "tables": [
    {
      "name": "string",
      "dbName": "string",
      "description": "string",
      "columns": [
        {
          "name": "string",
          "dbName": "string",
          "type": "string",
          "nullable": true,
          "primaryKey": true,
          "unique": true,
          "isList": true,
          "enumName": "string",
          "defaults": ["string"],
          "description": "string",
          "references": {
            "table": "string",
            "column": "string"
          }
        }
      ],
      "indexes": [
        {
          "type": "id",
          "columns": ["string"]
        }
      ],
      "references": [
        {
          "table": "string",
          "column": "string",
          "otherColumn": "string",
          "kind": "string",
          "origin": "string",
          "onDelete": "string",
          "onUpdate": "string"
        }
      ],
      "referencedBy": [
        {
          "table": "string",
          "column": "string",
          "otherColumn": "string",
          "kind": "string",
          "origin": "string",
          "onDelete": "string",
          "onUpdate": "string"
        }
      ]
    }
  ],
  "enums": [
    {
      "name": "string",
      "dbName": "string",
      "description": "string",
      "values": ["string"]
    }
  ],
  "parseError": {
    "message": "Expected `)` but found `EOF`",
    "line": 12,
    "column": 3
  }
}
```

> 500 Response

```json
{
  "type": "/problems/internal-server-error",
  "title": "Internal Server Error",
  "status": 500,
  "detail": "string",
  "instance": "string"
}
```

<h3 id="readdocs-responses">Responses</h3>

| Status | Meaning               | Description                                            | Schema                                                |
| ------ | --------------------- | ------------------------------------------------------ | ----------------------------------------------------- |
| 200    | OK                    | The request has succeeded.                             | [Docs](#schemadocs)                                   |
| 500    | Internal Server Error | 500 Internal Server Error (`application/problem+json`) | [InternalServerProblem](#schemainternalserverproblem) |

<aside class="success">
This operation does not require authentication
</aside>

<h1 id="sizuku-studio-api-db">db</h1>

## readDbStatus

<a id="opIdreadDbStatus"></a>

> Code samples

```bash
curl http://127.0.0.1:4983/api/db \
  -H 'Accept: application/json'
```

`GET /db`

The database connection and the tables of the schema.

> Example responses

> 200 Response

```json
{
  "connected": true,
  "dialect": "sqlite",
  "url": "string",
  "error": "string",
  "tables": [
    {
      "name": "string",
      "table": "string",
      "columns": [
        {
          "name": "string",
          "column": "string",
          "type": "string",
          "nullable": true
        }
      ],
      "key": ["string"]
    }
  ]
}
```

> 500 Response

```json
{
  "type": "/problems/internal-server-error",
  "title": "Internal Server Error",
  "status": 500,
  "detail": "string",
  "instance": "string"
}
```

<h3 id="readdbstatus-responses">Responses</h3>

| Status | Meaning               | Description                                            | Schema                                                |
| ------ | --------------------- | ------------------------------------------------------ | ----------------------------------------------------- |
| 200    | OK                    | The request has succeeded.                             | [DbStatus](#schemadbstatus)                           |
| 500    | Internal Server Error | 500 Internal Server Error (`application/problem+json`) | [InternalServerProblem](#schemainternalserverproblem) |

<aside class="success">
This operation does not require authentication
</aside>

## readCounts

<a id="opIdreadCounts"></a>

> Code samples

```bash
curl http://127.0.0.1:4983/api/db/counts \
  -H 'Accept: application/json'
```

`GET /db/counts`

The row count of every table.

> Example responses

> 200 Response

```json
{
  "counts": {
    "property1": 0,
    "property2": 0
  }
}
```

> 500 Response

```json
{
  "type": "/problems/internal-server-error",
  "title": "Internal Server Error",
  "status": 500,
  "detail": "string",
  "instance": "string"
}
```

> 503 Response

```json
{
  "type": "/problems/service-unavailable",
  "title": "Service Unavailable",
  "status": 503,
  "detail": "No database is connected. Pass --url to sizuku studio or set DATABASE_URL.",
  "instance": "/api/db/counts"
}
```

<h3 id="readcounts-responses">Responses</h3>

| Status | Meaning               | Description                                            | Schema                                                        |
| ------ | --------------------- | ------------------------------------------------------ | ------------------------------------------------------------- |
| 200    | OK                    | The request has succeeded.                             | [Counts](#schemacounts)                                       |
| 500    | Internal Server Error | 500 Internal Server Error (`application/problem+json`) | [InternalServerProblem](#schemainternalserverproblem)         |
| 503    | Service Unavailable   | 503 Service Unavailable (`application/problem+json`)   | [ServiceUnavailableProblem](#schemaserviceunavailableproblem) |

<aside class="success">
This operation does not require authentication
</aside>

## readRows

<a id="opIdreadRows"></a>

> Code samples

```bash
curl 'http://127.0.0.1:4983/api/db/rows/string?skip=0&take=1' \
  -H 'Accept: application/json'
```

`GET /db/rows/{tableName}`

One page of a table's rows, ordered by its key.

<h3 id="readrows-parameters">Parameters</h3>

| Name      | In    | Type                          | Required | Description                  |
| --------- | ----- | ----------------------------- | -------- | ---------------------------- |
| tableName | path  | [tableName](#schematablename) | true     | none                         |
| skip      | query | [skip](#schemaskip)           | true     | Rows to skip before the page |
| take      | query | [take](#schematake)           | true     | Rows per page                |

> Example responses

> 200 Response

```json
{
  "rows": [
    {
      "property1": "string",
      "property2": "string"
    }
  ],
  "total": 0,
  "skip": 0,
  "take": 0
}
```

> 404 Response

```json
{
  "type": "/problems/not-found",
  "title": "Not Found",
  "status": 404,
  "detail": "Unknown table \"nope\".",
  "instance": "/api/db/rows/nope"
}
```

> 422 Response

```json
{
  "type": "/problems/validation-failed",
  "title": "Validation Failed",
  "status": 422,
  "detail": "string",
  "instance": "string",
  "errors": [
    {
      "field": "string",
      "message": "string"
    }
  ]
}
```

> 500 Response

```json
{
  "type": "/problems/internal-server-error",
  "title": "Internal Server Error",
  "status": 500,
  "detail": "string",
  "instance": "string"
}
```

> 503 Response

```json
{
  "type": "/problems/service-unavailable",
  "title": "Service Unavailable",
  "status": 503,
  "detail": "No database is connected. Pass --url to sizuku studio or set DATABASE_URL.",
  "instance": "/api/db/counts"
}
```

<h3 id="readrows-responses">Responses</h3>

| Status | Meaning               | Description                                            | Schema                                                        |
| ------ | --------------------- | ------------------------------------------------------ | ------------------------------------------------------------- |
| 200    | OK                    | The request has succeeded.                             | [Rows](#schemarows)                                           |
| 404    | Not Found             | 404 Not Found (`application/problem+json`)             | [NotFoundProblem](#schemanotfoundproblem)                     |
| 422    | Unprocessable Entity  | 422 Unprocessable Content (`application/problem+json`) | [ValidationProblem](#schemavalidationproblem)                 |
| 500    | Internal Server Error | 500 Internal Server Error (`application/problem+json`) | [InternalServerProblem](#schemainternalserverproblem)         |
| 503    | Service Unavailable   | 503 Service Unavailable (`application/problem+json`)   | [ServiceUnavailableProblem](#schemaserviceunavailableproblem) |

<aside class="success">
This operation does not require authentication
</aside>

## createRow

<a id="opIdcreateRow"></a>

> Code samples

```bash
curl http://127.0.0.1:4983/api/db/rows/string \
  -X POST \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  -d '{
    "values": {
      "property1": "string",
      "property2": "string"
    }
  }'
```

`POST /db/rows/{tableName}`

Insert one row.

> Body parameter

```json
{
  "values": {
    "property1": "string",
    "property2": "string"
  }
}
```

<h3 id="createrow-parameters">Parameters</h3>

| Name                         | In   | Type                                        | Required | Description                                  |
| ---------------------------- | ---- | ------------------------------------------- | -------- | -------------------------------------------- |
| tableName                    | path | [tableName](#schematablename)               | true     | none                                         |
| body                         | body | [InsertBody](#schemainsertbody)             | true     | none                                         |
| » values                     | body | object                                      | true     | The values to insert, keyed by property name |
| » » **additionalProperties** | body | string \| number(double) \| boolean \| null | false    | none                                         |
| » » » _anyOf_                | body | string                                      | false    | none                                         |
| » » » _anyOf_                | body | number(double)                              | false    | none                                         |
| » » » _anyOf_                | body | boolean                                     | false    | none                                         |

> Example responses

> 200 Response

```json
{
  "count": 0
}
```

> 404 Response

```json
{
  "type": "/problems/not-found",
  "title": "Not Found",
  "status": 404,
  "detail": "Unknown table \"nope\".",
  "instance": "/api/db/rows/nope"
}
```

> 422 Response

```json
{
  "type": "/problems/validation-failed",
  "title": "Validation Failed",
  "status": 422,
  "detail": "string",
  "instance": "string",
  "errors": [
    {
      "field": "string",
      "message": "string"
    }
  ]
}
```

> 500 Response

```json
{
  "type": "/problems/internal-server-error",
  "title": "Internal Server Error",
  "status": 500,
  "detail": "string",
  "instance": "string"
}
```

> 503 Response

```json
{
  "type": "/problems/service-unavailable",
  "title": "Service Unavailable",
  "status": 503,
  "detail": "No database is connected. Pass --url to sizuku studio or set DATABASE_URL.",
  "instance": "/api/db/counts"
}
```

<h3 id="createrow-responses">Responses</h3>

| Status | Meaning               | Description                                            | Schema                                                        |
| ------ | --------------------- | ------------------------------------------------------ | ------------------------------------------------------------- |
| 200    | OK                    | The request has succeeded.                             | [Affected](#schemaaffected)                                   |
| 404    | Not Found             | 404 Not Found (`application/problem+json`)             | [NotFoundProblem](#schemanotfoundproblem)                     |
| 422    | Unprocessable Entity  | 422 Unprocessable Content (`application/problem+json`) | [ValidationProblem](#schemavalidationproblem)                 |
| 500    | Internal Server Error | 500 Internal Server Error (`application/problem+json`) | [InternalServerProblem](#schemainternalserverproblem)         |
| 503    | Service Unavailable   | 503 Service Unavailable (`application/problem+json`)   | [ServiceUnavailableProblem](#schemaserviceunavailableproblem) |

<aside class="success">
This operation does not require authentication
</aside>

## deleteRow

<a id="opIddeleteRow"></a>

> Code samples

```bash
curl http://127.0.0.1:4983/api/db/rows/string \
  -X DELETE \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  -d '{
    "where": {
      "property1": "string",
      "property2": "string"
    }
  }'
```

`DELETE /db/rows/{tableName}`

Delete the row identified by `where`.

> Body parameter

```json
{
  "where": {
    "property1": "string",
    "property2": "string"
  }
}
```

<h3 id="deleterow-parameters">Parameters</h3>

| Name                         | In   | Type                                        | Required | Description                          |
| ---------------------------- | ---- | ------------------------------------------- | -------- | ------------------------------------ |
| tableName                    | path | [tableName](#schematablename)               | true     | none                                 |
| body                         | body | [DeleteBody](#schemadeletebody)             | true     | none                                 |
| » where                      | body | object                                      | true     | The key columns of the row to delete |
| » » **additionalProperties** | body | string \| number(double) \| boolean \| null | false    | none                                 |
| » » » _anyOf_                | body | string                                      | false    | none                                 |
| » » » _anyOf_                | body | number(double)                              | false    | none                                 |
| » » » _anyOf_                | body | boolean                                     | false    | none                                 |

> Example responses

> 200 Response

```json
{
  "count": 0
}
```

> 404 Response

```json
{
  "type": "/problems/not-found",
  "title": "Not Found",
  "status": 404,
  "detail": "Unknown table \"nope\".",
  "instance": "/api/db/rows/nope"
}
```

> 422 Response

```json
{
  "type": "/problems/validation-failed",
  "title": "Validation Failed",
  "status": 422,
  "detail": "string",
  "instance": "string",
  "errors": [
    {
      "field": "string",
      "message": "string"
    }
  ]
}
```

> 500 Response

```json
{
  "type": "/problems/internal-server-error",
  "title": "Internal Server Error",
  "status": 500,
  "detail": "string",
  "instance": "string"
}
```

> 503 Response

```json
{
  "type": "/problems/service-unavailable",
  "title": "Service Unavailable",
  "status": 503,
  "detail": "No database is connected. Pass --url to sizuku studio or set DATABASE_URL.",
  "instance": "/api/db/counts"
}
```

<h3 id="deleterow-responses">Responses</h3>

| Status | Meaning               | Description                                            | Schema                                                        |
| ------ | --------------------- | ------------------------------------------------------ | ------------------------------------------------------------- |
| 200    | OK                    | The request has succeeded.                             | [Affected](#schemaaffected)                                   |
| 404    | Not Found             | 404 Not Found (`application/problem+json`)             | [NotFoundProblem](#schemanotfoundproblem)                     |
| 422    | Unprocessable Entity  | 422 Unprocessable Content (`application/problem+json`) | [ValidationProblem](#schemavalidationproblem)                 |
| 500    | Internal Server Error | 500 Internal Server Error (`application/problem+json`) | [InternalServerProblem](#schemainternalserverproblem)         |
| 503    | Service Unavailable   | 503 Service Unavailable (`application/problem+json`)   | [ServiceUnavailableProblem](#schemaserviceunavailableproblem) |

<aside class="success">
This operation does not require authentication
</aside>

## updateRow

<a id="opIdupdateRow"></a>

> Code samples

```bash
curl http://127.0.0.1:4983/api/db/rows/string \
  -X PATCH \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  -d '{
    "where": {
      "property1": "string",
      "property2": "string"
    },
    "values": {
      "property1": "string",
      "property2": "string"
    }
  }'
```

`PATCH /db/rows/{tableName}`

Update the row identified by `where`.

> Body parameter

```json
{
  "where": {
    "property1": "string",
    "property2": "string"
  },
  "values": {
    "property1": "string",
    "property2": "string"
  }
}
```

<h3 id="updaterow-parameters">Parameters</h3>

| Name                         | In   | Type                                        | Required | Description                          |
| ---------------------------- | ---- | ------------------------------------------- | -------- | ------------------------------------ |
| tableName                    | path | [tableName](#schematablename)               | true     | none                                 |
| body                         | body | [UpdateBody](#schemaupdatebody)             | true     | none                                 |
| » where                      | body | object                                      | true     | The key columns of the row to change |
| » » **additionalProperties** | body | string \| number(double) \| boolean \| null | false    | none                                 |
| » » » _anyOf_                | body | string                                      | false    | none                                 |
| » » » _anyOf_                | body | number(double)                              | false    | none                                 |
| » » » _anyOf_                | body | boolean                                     | false    | none                                 |
| » values                     | body | object                                      | true     | The columns to set                   |
| » » **additionalProperties** | body | string \| number(double) \| boolean \| null | false    | none                                 |
| » » » _anyOf_                | body | string                                      | false    | none                                 |
| » » » _anyOf_                | body | number(double)                              | false    | none                                 |
| » » » _anyOf_                | body | boolean                                     | false    | none                                 |

> Example responses

> 200 Response

```json
{
  "count": 0
}
```

> 404 Response

```json
{
  "type": "/problems/not-found",
  "title": "Not Found",
  "status": 404,
  "detail": "Unknown table \"nope\".",
  "instance": "/api/db/rows/nope"
}
```

> 422 Response

```json
{
  "type": "/problems/validation-failed",
  "title": "Validation Failed",
  "status": 422,
  "detail": "string",
  "instance": "string",
  "errors": [
    {
      "field": "string",
      "message": "string"
    }
  ]
}
```

> 500 Response

```json
{
  "type": "/problems/internal-server-error",
  "title": "Internal Server Error",
  "status": 500,
  "detail": "string",
  "instance": "string"
}
```

> 503 Response

```json
{
  "type": "/problems/service-unavailable",
  "title": "Service Unavailable",
  "status": 503,
  "detail": "No database is connected. Pass --url to sizuku studio or set DATABASE_URL.",
  "instance": "/api/db/counts"
}
```

<h3 id="updaterow-responses">Responses</h3>

| Status | Meaning               | Description                                            | Schema                                                        |
| ------ | --------------------- | ------------------------------------------------------ | ------------------------------------------------------------- |
| 200    | OK                    | The request has succeeded.                             | [Affected](#schemaaffected)                                   |
| 404    | Not Found             | 404 Not Found (`application/problem+json`)             | [NotFoundProblem](#schemanotfoundproblem)                     |
| 422    | Unprocessable Entity  | 422 Unprocessable Content (`application/problem+json`) | [ValidationProblem](#schemavalidationproblem)                 |
| 500    | Internal Server Error | 500 Internal Server Error (`application/problem+json`) | [InternalServerProblem](#schemainternalserverproblem)         |
| 503    | Service Unavailable   | 503 Service Unavailable (`application/problem+json`)   | [ServiceUnavailableProblem](#schemaserviceunavailableproblem) |

<aside class="success">
This operation does not require authentication
</aside>

## runSql

<a id="opIdrunSql"></a>

> Code samples

```bash
curl http://127.0.0.1:4983/api/db/sql \
  -X POST \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  -d '{
    "sql": "string"
  }'
```

`POST /db/sql`

Run one SQL statement.

> Body parameter

```json
{
  "sql": "string"
}
```

<h3 id="runsql-parameters">Parameters</h3>

| Name  | In   | Type                      | Required | Description       |
| ----- | ---- | ------------------------- | -------- | ----------------- |
| body  | body | [SqlBody](#schemasqlbody) | true     | none              |
| » sql | body | string                    | true     | The SQL statement |

> Example responses

> 200 Response

```json
{
  "columns": ["string"],
  "rows": [
    {
      "property1": "string",
      "property2": "string"
    }
  ],
  "rowCount": 0,
  "durationMs": 0
}
```

> 422 Response

```json
{
  "type": "/problems/validation-failed",
  "title": "Validation Failed",
  "status": 422,
  "detail": "string",
  "instance": "string",
  "errors": [
    {
      "field": "string",
      "message": "string"
    }
  ]
}
```

> 500 Response

```json
{
  "type": "/problems/internal-server-error",
  "title": "Internal Server Error",
  "status": 500,
  "detail": "string",
  "instance": "string"
}
```

> 503 Response

```json
{
  "type": "/problems/service-unavailable",
  "title": "Service Unavailable",
  "status": 503,
  "detail": "No database is connected. Pass --url to sizuku studio or set DATABASE_URL.",
  "instance": "/api/db/counts"
}
```

<h3 id="runsql-responses">Responses</h3>

| Status | Meaning               | Description                                            | Schema                                                        |
| ------ | --------------------- | ------------------------------------------------------ | ------------------------------------------------------------- |
| 200    | OK                    | The request has succeeded.                             | [SqlResult](#schemasqlresult)                                 |
| 422    | Unprocessable Entity  | 422 Unprocessable Content (`application/problem+json`) | [ValidationProblem](#schemavalidationproblem)                 |
| 500    | Internal Server Error | 500 Internal Server Error (`application/problem+json`) | [InternalServerProblem](#schemainternalserverproblem)         |
| 503    | Service Unavailable   | 503 Service Unavailable (`application/problem+json`)   | [ServiceUnavailableProblem](#schemaserviceunavailableproblem) |

<aside class="success">
This operation does not require authentication
</aside>

<h1 id="sizuku-studio-api-language">language</h1>

## readLanguageStatus

<a id="opIdreadLanguageStatus"></a>

> Code samples

```bash
curl http://127.0.0.1:4983/api/language \
  -H 'Accept: application/json'
```

`GET /language`

Whether the project's TypeScript is loaded, and why not when it is not.

> Example responses

> 200 Response

```json
{
  "typescript": "string",
  "reason": "string"
}
```

> 500 Response

```json
{
  "type": "/problems/internal-server-error",
  "title": "Internal Server Error",
  "status": 500,
  "detail": "string",
  "instance": "string"
}
```

<h3 id="readlanguagestatus-responses">Responses</h3>

| Status | Meaning               | Description                                            | Schema                                                |
| ------ | --------------------- | ------------------------------------------------------ | ----------------------------------------------------- |
| 200    | OK                    | The request has succeeded.                             | [LanguageStatus](#schemalanguagestatus)               |
| 500    | Internal Server Error | 500 Internal Server Error (`application/problem+json`) | [InternalServerProblem](#schemainternalserverproblem) |

<aside class="success">
This operation does not require authentication
</aside>

## complete

<a id="opIdcomplete"></a>

> Code samples

```bash
curl http://127.0.0.1:4983/api/language/complete \
  -X POST \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  -d '{
    "source": "string",
    "offset": 0
  }'
```

`POST /language/complete`

The completions at the cursor.

> Body parameter

```json
{
  "source": "string",
  "offset": 0
}
```

<h3 id="complete-parameters">Parameters</h3>

| Name     | In   | Type                                | Required | Description                     |
| -------- | ---- | ----------------------------------- | -------- | ------------------------------- |
| body     | body | [PositionBody](#schemapositionbody) | true     | none                            |
| » source | body | string                              | true     | The schema source, saved or not |
| » offset | body | integer(int32)                      | true     | The UTF-16 offset of the cursor |

> Example responses

> 200 Response

```json
{
  "items": [
    {
      "label": "string",
      "kind": "string",
      "sortText": "string",
      "insertText": "string",
      "replacement": {
        "start": 0,
        "end": 0
      }
    }
  ]
}
```

> 422 Response

```json
{
  "type": "/problems/validation-failed",
  "title": "Validation Failed",
  "status": 422,
  "detail": "string",
  "instance": "string",
  "errors": [
    {
      "field": "string",
      "message": "string"
    }
  ]
}
```

> 500 Response

```json
{
  "type": "/problems/internal-server-error",
  "title": "Internal Server Error",
  "status": 500,
  "detail": "string",
  "instance": "string"
}
```

> 503 Response

```json
{
  "type": "/problems/service-unavailable",
  "title": "Service Unavailable",
  "status": 503,
  "detail": "No database is connected. Pass --url to sizuku studio or set DATABASE_URL.",
  "instance": "/api/db/counts"
}
```

<h3 id="complete-responses">Responses</h3>

| Status | Meaning               | Description                                            | Schema                                                        |
| ------ | --------------------- | ------------------------------------------------------ | ------------------------------------------------------------- |
| 200    | OK                    | The request has succeeded.                             | [Completions](#schemacompletions)                             |
| 422    | Unprocessable Entity  | 422 Unprocessable Content (`application/problem+json`) | [ValidationProblem](#schemavalidationproblem)                 |
| 500    | Internal Server Error | 500 Internal Server Error (`application/problem+json`) | [InternalServerProblem](#schemainternalserverproblem)         |
| 503    | Service Unavailable   | 503 Service Unavailable (`application/problem+json`)   | [ServiceUnavailableProblem](#schemaserviceunavailableproblem) |

<aside class="success">
This operation does not require authentication
</aside>

## completeDetail

<a id="opIdcompleteDetail"></a>

> Code samples

```bash
curl http://127.0.0.1:4983/api/language/complete/detail \
  -X POST \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  -d '{
    "source": "string",
    "offset": 0,
    "name": "string"
  }'
```

`POST /language/complete/detail`

The type and documentation of one completion.

> Body parameter

```json
{
  "source": "string",
  "offset": 0,
  "name": "string"
}
```

<h3 id="completedetail-parameters">Parameters</h3>

| Name     | In   | Type                                                | Required | Description                     |
| -------- | ---- | --------------------------------------------------- | -------- | ------------------------------- |
| body     | body | [CompletionDetailBody](#schemacompletiondetailbody) | true     | none                            |
| » source | body | string                                              | true     | The schema source, saved or not |
| » offset | body | integer(int32)                                      | true     | The UTF-16 offset of the cursor |
| » name   | body | string                                              | true     | The name of the completion      |

> Example responses

> 200 Response

```json
{
  "detail": "string",
  "documentation": "string"
}
```

> 422 Response

```json
{
  "type": "/problems/validation-failed",
  "title": "Validation Failed",
  "status": 422,
  "detail": "string",
  "instance": "string",
  "errors": [
    {
      "field": "string",
      "message": "string"
    }
  ]
}
```

> 500 Response

```json
{
  "type": "/problems/internal-server-error",
  "title": "Internal Server Error",
  "status": 500,
  "detail": "string",
  "instance": "string"
}
```

> 503 Response

```json
{
  "type": "/problems/service-unavailable",
  "title": "Service Unavailable",
  "status": 503,
  "detail": "No database is connected. Pass --url to sizuku studio or set DATABASE_URL.",
  "instance": "/api/db/counts"
}
```

<h3 id="completedetail-responses">Responses</h3>

| Status | Meaning               | Description                                            | Schema                                                        |
| ------ | --------------------- | ------------------------------------------------------ | ------------------------------------------------------------- |
| 200    | OK                    | The request has succeeded.                             | [CompletionDetail](#schemacompletiondetail)                   |
| 422    | Unprocessable Entity  | 422 Unprocessable Content (`application/problem+json`) | [ValidationProblem](#schemavalidationproblem)                 |
| 500    | Internal Server Error | 500 Internal Server Error (`application/problem+json`) | [InternalServerProblem](#schemainternalserverproblem)         |
| 503    | Service Unavailable   | 503 Service Unavailable (`application/problem+json`)   | [ServiceUnavailableProblem](#schemaserviceunavailableproblem) |

<aside class="success">
This operation does not require authentication
</aside>

## hover

<a id="opIdhover"></a>

> Code samples

```bash
curl http://127.0.0.1:4983/api/language/hover \
  -X POST \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  -d '{
    "source": "string",
    "offset": 0
  }'
```

`POST /language/hover`

What TypeScript says about the symbol at the cursor.

> Body parameter

```json
{
  "source": "string",
  "offset": 0
}
```

<h3 id="hover-parameters">Parameters</h3>

| Name     | In   | Type                                | Required | Description                     |
| -------- | ---- | ----------------------------------- | -------- | ------------------------------- |
| body     | body | [PositionBody](#schemapositionbody) | true     | none                            |
| » source | body | string                              | true     | The schema source, saved or not |
| » offset | body | integer(int32)                      | true     | The UTF-16 offset of the cursor |

> Example responses

> 200 Response

```json
{
  "contents": "string",
  "range": {
    "start": 0,
    "end": 0
  }
}
```

> 422 Response

```json
{
  "type": "/problems/validation-failed",
  "title": "Validation Failed",
  "status": 422,
  "detail": "string",
  "instance": "string",
  "errors": [
    {
      "field": "string",
      "message": "string"
    }
  ]
}
```

> 500 Response

```json
{
  "type": "/problems/internal-server-error",
  "title": "Internal Server Error",
  "status": 500,
  "detail": "string",
  "instance": "string"
}
```

> 503 Response

```json
{
  "type": "/problems/service-unavailable",
  "title": "Service Unavailable",
  "status": 503,
  "detail": "No database is connected. Pass --url to sizuku studio or set DATABASE_URL.",
  "instance": "/api/db/counts"
}
```

<h3 id="hover-responses">Responses</h3>

| Status | Meaning               | Description                                            | Schema                                                        |
| ------ | --------------------- | ------------------------------------------------------ | ------------------------------------------------------------- |
| 200    | OK                    | The request has succeeded.                             | [Hover](#schemahover)                                         |
| 422    | Unprocessable Entity  | 422 Unprocessable Content (`application/problem+json`) | [ValidationProblem](#schemavalidationproblem)                 |
| 500    | Internal Server Error | 500 Internal Server Error (`application/problem+json`) | [InternalServerProblem](#schemainternalserverproblem)         |
| 503    | Service Unavailable   | 503 Service Unavailable (`application/problem+json`)   | [ServiceUnavailableProblem](#schemaserviceunavailableproblem) |

<aside class="success">
This operation does not require authentication
</aside>

## signature

<a id="opIdsignature"></a>

> Code samples

```bash
curl http://127.0.0.1:4983/api/language/signature \
  -X POST \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  -d '{
    "source": "string",
    "offset": 0
  }'
```

`POST /language/signature`

The signatures of the call the cursor is in.

> Body parameter

```json
{
  "source": "string",
  "offset": 0
}
```

<h3 id="signature-parameters">Parameters</h3>

| Name     | In   | Type                                | Required | Description                     |
| -------- | ---- | ----------------------------------- | -------- | ------------------------------- |
| body     | body | [PositionBody](#schemapositionbody) | true     | none                            |
| » source | body | string                              | true     | The schema source, saved or not |
| » offset | body | integer(int32)                      | true     | The UTF-16 offset of the cursor |

> Example responses

> 200 Response

```json
{
  "signatures": [
    {
      "label": "string",
      "documentation": "string",
      "parameters": [
        {
          "label": "string",
          "documentation": "string"
        }
      ]
    }
  ],
  "activeSignature": 0,
  "activeParameter": 0
}
```

> 422 Response

```json
{
  "type": "/problems/validation-failed",
  "title": "Validation Failed",
  "status": 422,
  "detail": "string",
  "instance": "string",
  "errors": [
    {
      "field": "string",
      "message": "string"
    }
  ]
}
```

> 500 Response

```json
{
  "type": "/problems/internal-server-error",
  "title": "Internal Server Error",
  "status": 500,
  "detail": "string",
  "instance": "string"
}
```

> 503 Response

```json
{
  "type": "/problems/service-unavailable",
  "title": "Service Unavailable",
  "status": 503,
  "detail": "No database is connected. Pass --url to sizuku studio or set DATABASE_URL.",
  "instance": "/api/db/counts"
}
```

<h3 id="signature-responses">Responses</h3>

| Status | Meaning               | Description                                            | Schema                                                        |
| ------ | --------------------- | ------------------------------------------------------ | ------------------------------------------------------------- |
| 200    | OK                    | The request has succeeded.                             | [SignatureHelp](#schemasignaturehelp)                         |
| 422    | Unprocessable Entity  | 422 Unprocessable Content (`application/problem+json`) | [ValidationProblem](#schemavalidationproblem)                 |
| 500    | Internal Server Error | 500 Internal Server Error (`application/problem+json`) | [InternalServerProblem](#schemainternalserverproblem)         |
| 503    | Service Unavailable   | 503 Service Unavailable (`application/problem+json`)   | [ServiceUnavailableProblem](#schemaserviceunavailableproblem) |

<aside class="success">
This operation does not require authentication
</aside>

## diagnostics

<a id="opIddiagnostics"></a>

> Code samples

```bash
curl http://127.0.0.1:4983/api/language/diagnostics \
  -X POST \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  -d '{
    "source": "string"
  }'
```

`POST /language/diagnostics`

The type errors of the source.

> Body parameter

```json
{
  "source": "string"
}
```

<h3 id="diagnostics-parameters">Parameters</h3>

| Name     | In   | Type                            | Required | Description                     |
| -------- | ---- | ------------------------------- | -------- | ------------------------------- |
| body     | body | [SourceBody](#schemasourcebody) | true     | none                            |
| » source | body | string                          | true     | The schema source, saved or not |

> Example responses

> 200 Response

```json
{
  "diagnostics": [
    {
      "message": "string",
      "severity": "error",
      "range": {
        "start": 0,
        "end": 0
      }
    }
  ]
}
```

> 422 Response

```json
{
  "type": "/problems/validation-failed",
  "title": "Validation Failed",
  "status": 422,
  "detail": "string",
  "instance": "string",
  "errors": [
    {
      "field": "string",
      "message": "string"
    }
  ]
}
```

> 500 Response

```json
{
  "type": "/problems/internal-server-error",
  "title": "Internal Server Error",
  "status": 500,
  "detail": "string",
  "instance": "string"
}
```

> 503 Response

```json
{
  "type": "/problems/service-unavailable",
  "title": "Service Unavailable",
  "status": 503,
  "detail": "No database is connected. Pass --url to sizuku studio or set DATABASE_URL.",
  "instance": "/api/db/counts"
}
```

<h3 id="diagnostics-responses">Responses</h3>

| Status | Meaning               | Description                                            | Schema                                                        |
| ------ | --------------------- | ------------------------------------------------------ | ------------------------------------------------------------- |
| 200    | OK                    | The request has succeeded.                             | [Diagnostics](#schemadiagnostics)                             |
| 422    | Unprocessable Entity  | 422 Unprocessable Content (`application/problem+json`) | [ValidationProblem](#schemavalidationproblem)                 |
| 500    | Internal Server Error | 500 Internal Server Error (`application/problem+json`) | [InternalServerProblem](#schemainternalserverproblem)         |
| 503    | Service Unavailable   | 503 Service Unavailable (`application/problem+json`)   | [ServiceUnavailableProblem](#schemaserviceunavailableproblem) |

<aside class="success">
This operation does not require authentication
</aside>

# Schemas

<h2 id="tocS_ParseError">ParseError</h2>
<!-- backwards compatibility -->
<a id="schemaparseerror"></a>
<a id="schema_ParseError"></a>
<a id="tocSparseerror"></a>
<a id="tocsparseerror"></a>

```json
{
  "message": "Expected `)` but found `EOF`",
  "line": 12,
  "column": 3
}
```

Where a syntax error stopped the parser, 1-based.

### Properties

| Name    | Type           | Required | Restrictions | Description              |
| ------- | -------------- | -------- | ------------ | ------------------------ |
| message | string         | true     | none         | What the parser expected |
| line    | integer(int32) | true     | none         | The line of the error    |
| column  | integer(int32) | true     | none         | The column of the error  |

<h2 id="tocS_Snapshot">Snapshot</h2>
<!-- backwards compatibility -->
<a id="schemasnapshot"></a>
<a id="schema_Snapshot"></a>
<a id="tocSsnapshot"></a>
<a id="tocssnapshot"></a>

```json
{
  "path": "string",
  "file": "string",
  "source": "string",
  "parseError": {
    "message": "Expected `)` but found `EOF`",
    "line": 12,
    "column": 3
  }
}
```

The schema file as it is on disk.

### Properties

| Name       | Type           | Required | Restrictions | Description                                                |
| ---------- | -------------- | -------- | ------------ | ---------------------------------------------------------- |
| path       | string         | true     | none         | The path the studio was started with                       |
| file       | string         | true     | none         | The file name, for the title                               |
| source     | string         | true     | none         | The file's text                                            |
| parseError | object \| null | true     | none         | The first syntax error in the file, or null when it parses |

<h2 id="tocS_InternalServerProblem">InternalServerProblem</h2>
<!-- backwards compatibility -->
<a id="schemainternalserverproblem"></a>
<a id="schema_InternalServerProblem"></a>
<a id="tocSinternalserverproblem"></a>
<a id="tocsinternalserverproblem"></a>

```json
{
  "type": "/problems/internal-server-error",
  "title": "Internal Server Error",
  "status": 500,
  "detail": "string",
  "instance": "string"
}
```

RFC 9457 Problem Details for any unexpected failure.

### Properties

| Name     | Type   | Required | Restrictions | Description                                                  |
| -------- | ------ | -------- | ------------ | ------------------------------------------------------------ |
| type     | string | true     | none         | Problem type identifier (relative URI reference)             |
| title    | string | true     | none         | Short, human-readable summary of the problem type            |
| status   | number | true     | none         | HTTP status code, restated in the body per RFC 9457          |
| detail   | string | true     | none         | Human-readable explanation specific to this occurrence       |
| instance | string | true     | none         | URI reference identifying this occurrence (the request path) |

#### Enumerated Values

| Property | Value                           |
| -------- | ------------------------------- |
| type     | /problems/internal-server-error |
| title    | Internal Server Error           |
| status   | 500                             |

<h2 id="tocS_FieldError">FieldError</h2>
<!-- backwards compatibility -->
<a id="schemafielderror"></a>
<a id="schema_FieldError"></a>
<a id="tocSfielderror"></a>
<a id="tocsfielderror"></a>

```json
{
  "field": "string",
  "message": "string"
}
```

One field that failed validation.

### Properties

| Name    | Type   | Required | Restrictions | Description                  |
| ------- | ------ | -------- | ------------ | ---------------------------- |
| field   | string | true     | none         | The dotted path of the field |
| message | string | true     | none         | Why it failed                |

<h2 id="tocS_ValidationProblem">ValidationProblem</h2>
<!-- backwards compatibility -->
<a id="schemavalidationproblem"></a>
<a id="schema_ValidationProblem"></a>
<a id="tocSvalidationproblem"></a>
<a id="tocsvalidationproblem"></a>

```json
{
  "type": "/problems/validation-failed",
  "title": "Validation Failed",
  "status": 422,
  "detail": "string",
  "instance": "string",
  "errors": [
    {
      "field": "string",
      "message": "string"
    }
  ]
}
```

RFC 9457 Problem Details for a request that failed validation.

### Properties

| Name     | Type                              | Required | Restrictions | Description                                                  |
| -------- | --------------------------------- | -------- | ------------ | ------------------------------------------------------------ |
| type     | string                            | true     | none         | Problem type identifier (relative URI reference)             |
| title    | string                            | true     | none         | Short, human-readable summary of the problem type            |
| status   | number                            | true     | none         | HTTP status code, restated in the body per RFC 9457          |
| detail   | string                            | true     | none         | Human-readable explanation specific to this occurrence       |
| instance | string                            | true     | none         | URI reference identifying this occurrence (the request path) |
| errors   | [[FieldError](#schemafielderror)] | true     | none         | Extension member: one entry per field that failed validation |

#### Enumerated Values

| Property | Value                       |
| -------- | --------------------------- |
| type     | /problems/validation-failed |
| title    | Validation Failed           |
| status   | 422                         |

<h2 id="tocS_SaveBody">SaveBody</h2>
<!-- backwards compatibility -->
<a id="schemasavebody"></a>
<a id="schema_SaveBody"></a>
<a id="tocSsavebody"></a>
<a id="tocssavebody"></a>

```json
{
  "source": "string"
}
```

Text to write to the schema file.

### Properties

| Name   | Type   | Required | Restrictions | Description    |
| ------ | ------ | -------- | ------------ | -------------- |
| source | string | true     | none         | The whole file |

<h2 id="tocS_Diagram">Diagram</h2>
<!-- backwards compatibility -->
<a id="schemadiagram"></a>
<a id="schema_Diagram"></a>
<a id="tocSdiagram"></a>
<a id="tocsdiagram"></a>

```json
{
  "svg": "string",
  "parseError": {
    "message": "Expected `)` but found `EOF`",
    "line": 12,
    "column": 3
  }
}
```

The ER diagram of a schema, or why it could not be drawn.

### Properties

| Name       | Type           | Required | Restrictions | Description                                           |
| ---------- | -------------- | -------- | ------------ | ----------------------------------------------------- |
| svg        | string \| null | true     | none         | The SVG document, null when the source does not parse |
| parseError | object \| null | true     | none         | The syntax error that stopped the drawing             |

<h2 id="tocS_Theme">Theme</h2>
<!-- backwards compatibility -->
<a id="schematheme"></a>
<a id="schema_Theme"></a>
<a id="tocStheme"></a>
<a id="tocstheme"></a>

```json
"light"
```

The colour scheme a diagram is drawn in.

<h2 id="tocS_DiagramBody">DiagramBody</h2>
<!-- backwards compatibility -->
<a id="schemadiagrambody"></a>
<a id="schema_DiagramBody"></a>
<a id="tocSdiagrambody"></a>
<a id="tocsdiagrambody"></a>

```json
{
  "source": "string",
  "theme": {}
}
```

A schema to draw: the editor buffer, saved or not.

### Properties

| Name   | Type   | Required | Restrictions | Description                            |
| ------ | ------ | -------- | ------------ | -------------------------------------- |
| source | string | true     | none         | The schema source                      |
| theme  | object | false    | none         | The colour scheme; light when left out |

<h2 id="tocS_Png">Png</h2>
<!-- backwards compatibility -->
<a id="schemapng"></a>
<a id="schema_Png"></a>
<a id="tocSpng"></a>
<a id="tocspng"></a>

```json
{
  "base64": "string"
}
```

The ER diagram rasterised to PNG at 2x.

### Properties

| Name   | Type   | Required | Restrictions | Description                  |
| ------ | ------ | -------- | ------------ | ---------------------------- |
| base64 | string | true     | none         | The PNG file, base64-encoded |

<h2 id="tocS_Formatted">Formatted</h2>
<!-- backwards compatibility -->
<a id="schemaformatted"></a>
<a id="schema_Formatted"></a>
<a id="tocSformatted"></a>
<a id="tocsformatted"></a>

```json
{
  "source": "string"
}
```

The formatted text.

### Properties

| Name   | Type   | Required | Restrictions | Description                           |
| ------ | ------ | -------- | ------------ | ------------------------------------- |
| source | string | true     | none         | The source as the formatter prints it |

<h2 id="tocS_FormatOptions">FormatOptions</h2>
<!-- backwards compatibility -->
<a id="schemaformatoptions"></a>
<a id="schema_FormatOptions"></a>
<a id="tocSformatoptions"></a>
<a id="tocsformatoptions"></a>

```json
{
  "printWidth": 20,
  "tabWidth": 1,
  "useTabs": true,
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "bracketSpacing": true,
  "arrowParens": "always"
}
```

oxfmt options (a subset of Prettier's), as `.oxfmtrc.json` holds them.

### Properties

| Name           | Type           | Required | Restrictions | Description                                        |
| -------------- | -------------- | -------- | ------------ | -------------------------------------------------- |
| printWidth     | integer(int32) | false    | none         | The line length the printer wraps at               |
| tabWidth       | integer(int32) | false    | none         | Spaces per indentation level                       |
| useTabs        | boolean        | false    | none         | Indent with tabs instead of spaces                 |
| semi           | boolean        | false    | none         | End statements with a semicolon                    |
| singleQuote    | boolean        | false    | none         | Use single quotes for strings                      |
| trailingComma  | string         | false    | none         | Trailing commas where valid                        |
| bracketSpacing | boolean        | false    | none         | Spaces inside object braces                        |
| arrowParens    | string         | false    | none         | Parentheses around a sole arrow function parameter |

#### Enumerated Values

| Property      | Value  |
| ------------- | ------ |
| trailingComma | all    |
| trailingComma | es5    |
| trailingComma | none   |
| arrowParens   | always |
| arrowParens   | avoid  |

<h2 id="tocS_FormatBody">FormatBody</h2>
<!-- backwards compatibility -->
<a id="schemaformatbody"></a>
<a id="schema_FormatBody"></a>
<a id="tocSformatbody"></a>
<a id="tocsformatbody"></a>

```json
{
  "source": "string",
  "options": {
    "printWidth": 20,
    "tabWidth": 1,
    "useTabs": true,
    "semi": true,
    "singleQuote": true,
    "trailingComma": "all",
    "bracketSpacing": true,
    "arrowParens": "always"
  }
}
```

Text to format.

### Properties

| Name    | Type   | Required | Restrictions | Description                                            |
| ------- | ------ | -------- | ------------ | ------------------------------------------------------ |
| source  | string | true     | none         | The schema source                                      |
| options | object | false    | none         | Options for this run; the saved settings when left out |

<h2 id="tocS_FormatSettings">FormatSettings</h2>
<!-- backwards compatibility -->
<a id="schemaformatsettings"></a>
<a id="schema_FormatSettings"></a>
<a id="tocSformatsettings"></a>
<a id="tocsformatsettings"></a>

```json
{
  "options": {
    "printWidth": 20,
    "tabWidth": 1,
    "useTabs": true,
    "semi": true,
    "singleQuote": true,
    "trailingComma": "all",
    "bracketSpacing": true,
    "arrowParens": "always"
  },
  "configPath": "string"
}
```

The formatter settings in effect, and the file they come from.

### Properties

| Name       | Type           | Required | Restrictions | Description                                                          |
| ---------- | -------------- | -------- | ------------ | -------------------------------------------------------------------- |
| options    | object         | true     | none         | The options the formatter runs with                                  |
| configPath | string \| null | true     | none         | The `.oxfmtrc.json` they were read from, null when there is none yet |

<h2 id="tocS_FormatSettingsBody">FormatSettingsBody</h2>
<!-- backwards compatibility -->
<a id="schemaformatsettingsbody"></a>
<a id="schema_FormatSettingsBody"></a>
<a id="tocSformatsettingsbody"></a>
<a id="tocsformatsettingsbody"></a>

```json
{
  "options": {
    "printWidth": 20,
    "tabWidth": 1,
    "useTabs": true,
    "semi": true,
    "singleQuote": true,
    "trailingComma": "all",
    "bracketSpacing": true,
    "arrowParens": "always"
  }
}
```

Options to write to the project's `.oxfmtrc.json`.

### Properties

| Name    | Type   | Required | Restrictions | Description         |
| ------- | ------ | -------- | ------------ | ------------------- |
| options | object | true     | none         | The options to save |

<h2 id="tocS_ColumnReference">ColumnReference</h2>
<!-- backwards compatibility -->
<a id="schemacolumnreference"></a>
<a id="schema_ColumnReference"></a>
<a id="tocScolumnreference"></a>
<a id="tocscolumnreference"></a>

```json
{
  "table": "string",
  "column": "string"
}
```

What a column points at through a foreign key or a relation.

### Properties

| Name   | Type   | Required | Restrictions | Description              |
| ------ | ------ | -------- | ------------ | ------------------------ |
| table  | string | true     | none         | The table it references  |
| column | string | true     | none         | The column it references |

<h2 id="tocS_DocColumn">DocColumn</h2>
<!-- backwards compatibility -->
<a id="schemadoccolumn"></a>
<a id="schema_DocColumn"></a>
<a id="tocSdoccolumn"></a>
<a id="tocsdoccolumn"></a>

```json
{
  "name": "string",
  "dbName": "string",
  "type": "string",
  "nullable": true,
  "primaryKey": true,
  "unique": true,
  "isList": true,
  "enumName": "string",
  "defaults": ["string"],
  "description": "string",
  "references": {
    "table": "string",
    "column": "string"
  }
}
```

A column as the docs describe it.

### Properties

| Name        | Type           | Required | Restrictions | Description                                                 |
| ----------- | -------------- | -------- | ------------ | ----------------------------------------------------------- |
| name        | string         | true     | none         | The property name in the schema                             |
| dbName      | string         | true     | none         | The database column name                                    |
| type        | string         | true     | none         | The column builder (`varchar`, `uuid`, an enum's name, ...) |
| nullable    | boolean        | true     | none         | Whether the column may hold null                            |
| primaryKey  | boolean        | true     | none         | Whether it is the primary key or part of it                 |
| unique      | boolean        | true     | none         | Whether a unique constraint covers it alone                 |
| isList      | boolean        | true     | none         | Whether it is an array column                               |
| enumName    | string \| null | true     | none         | The enum it holds, null for a scalar                        |
| defaults    | [string]       | true     | none         | Its default and generated values, as written                |
| description | string \| null | true     | none         | The `///` description                                       |
| references  | object \| null | true     | none         | The column it references, null when it is not a foreign key |

<h2 id="tocS_DocIndex">DocIndex</h2>
<!-- backwards compatibility -->
<a id="schemadocindex"></a>
<a id="schema_DocIndex"></a>
<a id="tocSdocindex"></a>
<a id="tocsdocindex"></a>

```json
{
  "type": "id",
  "columns": ["string"]
}
```

An index or constraint over one or more columns.

### Properties

| Name    | Type     | Required | Restrictions | Description           |
| ------- | -------- | -------- | ------------ | --------------------- |
| type    | string   | true     | none         | What kind it is       |
| columns | [string] | true     | none         | The columns it covers |

#### Enumerated Values

| Property | Value    |
| -------- | -------- |
| type     | id       |
| type     | unique   |
| type     | normal   |
| type     | fulltext |

<h2 id="tocS_DocRelation">DocRelation</h2>
<!-- backwards compatibility -->
<a id="schemadocrelation"></a>
<a id="schema_DocRelation"></a>
<a id="tocSdocrelation"></a>
<a id="tocsdocrelation"></a>

```json
{
  "table": "string",
  "column": "string",
  "otherColumn": "string",
  "kind": "string",
  "origin": "string",
  "onDelete": "string",
  "onUpdate": "string"
}
```

A relation as seen from one table.

### Properties

| Name        | Type           | Required | Restrictions | Description                                                                        |
| ----------- | -------------- | -------- | ------------ | ---------------------------------------------------------------------------------- |
| table       | string         | true     | none         | The other table                                                                    |
| column      | string         | true     | none         | The column on this side                                                            |
| otherColumn | string         | true     | none         | The column on the other side                                                       |
| kind        | string         | true     | none         | How it reads from this side: `one to many`, `many to one`, ...                     |
| origin      | string         | true     | none         | Where it was found: a foreign key, a `relations()` block or a `/// @relation` note |
| onDelete    | string \| null | true     | none         | The action on delete of the parent row                                             |
| onUpdate    | string \| null | true     | none         | The action on update of the parent key                                             |

<h2 id="tocS_DocTable">DocTable</h2>
<!-- backwards compatibility -->
<a id="schemadoctable"></a>
<a id="schema_DocTable"></a>
<a id="tocSdoctable"></a>
<a id="tocsdoctable"></a>

```json
{
  "name": "string",
  "dbName": "string",
  "description": "string",
  "columns": [
    {
      "name": "string",
      "dbName": "string",
      "type": "string",
      "nullable": true,
      "primaryKey": true,
      "unique": true,
      "isList": true,
      "enumName": "string",
      "defaults": ["string"],
      "description": "string",
      "references": {
        "table": "string",
        "column": "string"
      }
    }
  ],
  "indexes": [
    {
      "type": "id",
      "columns": ["string"]
    }
  ],
  "references": [
    {
      "table": "string",
      "column": "string",
      "otherColumn": "string",
      "kind": "string",
      "origin": "string",
      "onDelete": "string",
      "onUpdate": "string"
    }
  ],
  "referencedBy": [
    {
      "table": "string",
      "column": "string",
      "otherColumn": "string",
      "kind": "string",
      "origin": "string",
      "onDelete": "string",
      "onUpdate": "string"
    }
  ]
}
```

One table of the docs.

### Properties

| Name         | Type                                | Required | Restrictions | Description                                          |
| ------------ | ----------------------------------- | -------- | ------------ | ---------------------------------------------------- |
| name         | string                              | true     | none         | The exported name                                    |
| dbName       | string                              | true     | none         | The database table name                              |
| description  | string \| null                      | true     | none         | The `///` description above it                       |
| columns      | [[DocColumn](#schemadoccolumn)]     | true     | none         | Its columns, in declaration order                    |
| indexes      | [[DocIndex](#schemadocindex)]       | true     | none         | Its indexes and constraints                          |
| references   | [[DocRelation](#schemadocrelation)] | true     | none         | The relations where this table holds the foreign key |
| referencedBy | [[DocRelation](#schemadocrelation)] | true     | none         | The relations where another table points here        |

<h2 id="tocS_DocEnum">DocEnum</h2>
<!-- backwards compatibility -->
<a id="schemadocenum"></a>
<a id="schema_DocEnum"></a>
<a id="tocSdocenum"></a>
<a id="tocsdocenum"></a>

```json
{
  "name": "string",
  "dbName": "string",
  "description": "string",
  "values": ["string"]
}
```

One enum of the docs.

### Properties

| Name        | Type           | Required | Restrictions | Description                    |
| ----------- | -------------- | -------- | ------------ | ------------------------------ |
| name        | string         | true     | none         | The exported name              |
| dbName      | string         | true     | none         | The database type name         |
| description | string \| null | true     | none         | The `///` description above it |
| values      | [string]       | true     | none         | Its values, in order           |

<h2 id="tocS_Docs">Docs</h2>
<!-- backwards compatibility -->
<a id="schemadocs"></a>
<a id="schema_Docs"></a>
<a id="tocSdocs"></a>
<a id="tocsdocs"></a>

```json
{
  "tables": [
    {
      "name": "string",
      "dbName": "string",
      "description": "string",
      "columns": [
        {
          "name": "string",
          "dbName": "string",
          "type": "string",
          "nullable": true,
          "primaryKey": true,
          "unique": true,
          "isList": true,
          "enumName": "string",
          "defaults": ["string"],
          "description": "string",
          "references": {
            "table": "string",
            "column": "string"
          }
        }
      ],
      "indexes": [
        {
          "type": "id",
          "columns": ["string"]
        }
      ],
      "references": [
        {
          "table": "string",
          "column": "string",
          "otherColumn": "string",
          "kind": "string",
          "origin": "string",
          "onDelete": "string",
          "onUpdate": "string"
        }
      ],
      "referencedBy": [
        {
          "table": "string",
          "column": "string",
          "otherColumn": "string",
          "kind": "string",
          "origin": "string",
          "onDelete": "string",
          "onUpdate": "string"
        }
      ]
    }
  ],
  "enums": [
    {
      "name": "string",
      "dbName": "string",
      "description": "string",
      "values": ["string"]
    }
  ],
  "parseError": {
    "message": "Expected `)` but found `EOF`",
    "line": 12,
    "column": 3
  }
}
```

The generated documentation of the saved schema.

### Properties

| Name       | Type                          | Required | Restrictions | Description                                         |
| ---------- | ----------------------------- | -------- | ------------ | --------------------------------------------------- |
| tables     | [[DocTable](#schemadoctable)] | true     | none         | Every table, in file order                          |
| enums      | [[DocEnum](#schemadocenum)]   | true     | none         | Every enum, in file order                           |
| parseError | object \| null                | true     | none         | The syntax error that kept the docs from being read |

<h2 id="tocS_DbColumn">DbColumn</h2>
<!-- backwards compatibility -->
<a id="schemadbcolumn"></a>
<a id="schema_DbColumn"></a>
<a id="tocSdbcolumn"></a>
<a id="tocsdbcolumn"></a>

```json
{
  "name": "string",
  "column": "string",
  "type": "string",
  "nullable": true
}
```

A column the data views read and write.

### Properties

| Name     | Type    | Required | Restrictions | Description                     |
| -------- | ------- | -------- | ------------ | ------------------------------- |
| name     | string  | true     | none         | The property name in the schema |
| column   | string  | true     | none         | The database column name        |
| type     | string  | true     | none         | The column builder              |
| nullable | boolean | true     | none         | Whether it may hold null        |

<h2 id="tocS_DbTable">DbTable</h2>
<!-- backwards compatibility -->
<a id="schemadbtable"></a>
<a id="schema_DbTable"></a>
<a id="tocSdbtable"></a>
<a id="tocsdbtable"></a>

```json
{
  "name": "string",
  "table": "string",
  "columns": [
    {
      "name": "string",
      "column": "string",
      "type": "string",
      "nullable": true
    }
  ],
  "key": ["string"]
}
```

A table of the schema as the data views see it.

### Properties

| Name    | Type                          | Required | Restrictions | Description                                                                         |
| ------- | ----------------------------- | -------- | ------------ | ----------------------------------------------------------------------------------- |
| name    | string                        | true     | none         | The exported name                                                                   |
| table   | string                        | true     | none         | The database table name                                                             |
| columns | [[DbColumn](#schemadbcolumn)] | true     | none         | Its columns, in declaration order                                                   |
| key     | [string]                      | true     | none         | The columns that identify a row: the primary key, else the unique columns, else all |

<h2 id="tocS_DbStatus">DbStatus</h2>
<!-- backwards compatibility -->
<a id="schemadbstatus"></a>
<a id="schema_DbStatus"></a>
<a id="tocSdbstatus"></a>
<a id="tocsdbstatus"></a>

```json
{
  "connected": true,
  "dialect": "sqlite",
  "url": "string",
  "error": "string",
  "tables": [
    {
      "name": "string",
      "table": "string",
      "columns": [
        {
          "name": "string",
          "column": "string",
          "type": "string",
          "nullable": true
        }
      ],
      "key": ["string"]
    }
  ]
}
```

The database connection, and the tables the schema declares.

### Properties

| Name      | Type                        | Required | Restrictions | Description                                     |
| --------- | --------------------------- | -------- | ------------ | ----------------------------------------------- |
| connected | boolean                     | true     | none         | Whether a database is connected                 |
| dialect   | string \| null              | true     | none         | The SQL dialect of the connection               |
| url       | string \| null              | true     | none         | The connection URL with its password hidden     |
| error     | string \| null              | true     | none         | Why the connection failed, null when it did not |
| tables    | [[DbTable](#schemadbtable)] | true     | none         | The tables of the saved schema                  |

#### Enumerated Values

| Property | Value      |
| -------- | ---------- |
| dialect  | sqlite     |
| dialect  | postgresql |
| dialect  | mysql      |

<h2 id="tocS_Counts">Counts</h2>
<!-- backwards compatibility -->
<a id="schemacounts"></a>
<a id="schema_Counts"></a>
<a id="tocScounts"></a>
<a id="tocscounts"></a>

```json
{
  "counts": {
    "property1": 0,
    "property2": 0
  }
}
```

Row counts by table name; a table whose count fails is left out.

### Properties

| Name   | Type   | Required | Restrictions | Description    |
| ------ | ------ | -------- | ------------ | -------------- |
| counts | object | true     | none         | Rows per table |

<h2 id="tocS_ServiceUnavailableProblem">ServiceUnavailableProblem</h2>
<!-- backwards compatibility -->
<a id="schemaserviceunavailableproblem"></a>
<a id="schema_ServiceUnavailableProblem"></a>
<a id="tocSserviceunavailableproblem"></a>
<a id="tocsserviceunavailableproblem"></a>

```json
{
  "type": "/problems/service-unavailable",
  "title": "Service Unavailable",
  "status": 503,
  "detail": "No database is connected. Pass --url to sizuku studio or set DATABASE_URL.",
  "instance": "/api/db/counts"
}
```

RFC 9457 Problem Details for a request that needs the database while none is connected,
or whose statement the database rejected.

### Properties

| Name     | Type   | Required | Restrictions | Description                                                  |
| -------- | ------ | -------- | ------------ | ------------------------------------------------------------ |
| type     | string | true     | none         | Problem type identifier (relative URI reference)             |
| title    | string | true     | none         | Short, human-readable summary of the problem type            |
| status   | number | true     | none         | HTTP status code, restated in the body per RFC 9457          |
| detail   | string | true     | none         | Human-readable explanation specific to this occurrence       |
| instance | string | true     | none         | URI reference identifying this occurrence (the request path) |

#### Enumerated Values

| Property | Value                         |
| -------- | ----------------------------- |
| type     | /problems/service-unavailable |
| title    | Service Unavailable           |
| status   | 503                           |

<h2 id="tocS_tableName">tableName</h2>
<!-- backwards compatibility -->
<a id="schematablename"></a>
<a id="schema_tableName"></a>
<a id="tocStablename"></a>
<a id="tocstablename"></a>

```json
"string"
```

A table as the schema exports it (`export const user = pgTable(...)` → `user`).

<h2 id="tocS_skip">skip</h2>
<!-- backwards compatibility -->
<a id="schemaskip"></a>
<a id="schema_skip"></a>
<a id="tocSskip"></a>
<a id="tocsskip"></a>

```json
0
```

Rows to skip before the page (0-based). Defaults to 0.

<h2 id="tocS_take">take</h2>
<!-- backwards compatibility -->
<a id="schematake"></a>
<a id="schema_take"></a>
<a id="tocStake"></a>
<a id="tocstake"></a>

```json
1
```

Rows per page (1-1000). Defaults to 100.

<h2 id="tocS_Row">Row</h2>
<!-- backwards compatibility -->
<a id="schemarow"></a>
<a id="schema_Row"></a>
<a id="tocSrow"></a>
<a id="tocsrow"></a>

```json
{
  "property1": "string",
  "property2": "string"
}
```

A row keyed by column property name.

### Properties

| Name                     | Type                                        | Required | Restrictions | Description |
| ------------------------ | ------------------------------------------- | -------- | ------------ | ----------- |
| **additionalProperties** | string \| number(double) \| boolean \| null | false    | none         | none        |

<h2 id="tocS_Rows">Rows</h2>
<!-- backwards compatibility -->
<a id="schemarows"></a>
<a id="schema_Rows"></a>
<a id="tocSrows"></a>
<a id="tocsrows"></a>

```json
{
  "rows": [
    {
      "property1": "string",
      "property2": "string"
    }
  ],
  "total": 0,
  "skip": 0,
  "take": 0
}
```

One page of a table's rows.

### Properties

| Name  | Type                | Required | Restrictions | Description                     |
| ----- | ------------------- | -------- | ------------ | ------------------------------- |
| rows  | [[Row](#schemarow)] | true     | none         | The rows of the page            |
| total | integer(int32)      | true     | none         | How many rows the table has     |
| skip  | integer(int32)      | true     | none         | The skip the page was read with |
| take  | integer(int32)      | true     | none         | The take the page was read with |

<h2 id="tocS_NotFoundProblem">NotFoundProblem</h2>
<!-- backwards compatibility -->
<a id="schemanotfoundproblem"></a>
<a id="schema_NotFoundProblem"></a>
<a id="tocSnotfoundproblem"></a>
<a id="tocsnotfoundproblem"></a>

```json
{
  "type": "/problems/not-found",
  "title": "Not Found",
  "status": 404,
  "detail": "Unknown table \"nope\".",
  "instance": "/api/db/rows/nope"
}
```

RFC 9457 Problem Details for a table the schema does not declare.

### Properties

| Name     | Type   | Required | Restrictions | Description                                                  |
| -------- | ------ | -------- | ------------ | ------------------------------------------------------------ |
| type     | string | true     | none         | Problem type identifier (relative URI reference)             |
| title    | string | true     | none         | Short, human-readable summary of the problem type            |
| status   | number | true     | none         | HTTP status code, restated in the body per RFC 9457          |
| detail   | string | true     | none         | Human-readable explanation specific to this occurrence       |
| instance | string | true     | none         | URI reference identifying this occurrence (the request path) |

#### Enumerated Values

| Property | Value               |
| -------- | ------------------- |
| type     | /problems/not-found |
| title    | Not Found           |
| status   | 404                 |

<h2 id="tocS_Affected">Affected</h2>
<!-- backwards compatibility -->
<a id="schemaaffected"></a>
<a id="schema_Affected"></a>
<a id="tocSaffected"></a>
<a id="tocsaffected"></a>

```json
{
  "count": 0
}
```

How many rows a write changed.

### Properties

| Name  | Type           | Required | Restrictions | Description  |
| ----- | -------------- | -------- | ------------ | ------------ |
| count | integer(int32) | true     | none         | Rows changed |

<h2 id="tocS_InsertBody">InsertBody</h2>
<!-- backwards compatibility -->
<a id="schemainsertbody"></a>
<a id="schema_InsertBody"></a>
<a id="tocSinsertbody"></a>
<a id="tocsinsertbody"></a>

```json
{
  "values": {
    "property1": "string",
    "property2": "string"
  }
}
```

A row to insert.

### Properties

| Name   | Type   | Required | Restrictions | Description                                  |
| ------ | ------ | -------- | ------------ | -------------------------------------------- |
| values | object | true     | none         | The values to insert, keyed by property name |

<h2 id="tocS_UpdateBody">UpdateBody</h2>
<!-- backwards compatibility -->
<a id="schemaupdatebody"></a>
<a id="schema_UpdateBody"></a>
<a id="tocSupdatebody"></a>
<a id="tocsupdatebody"></a>

```json
{
  "where": {
    "property1": "string",
    "property2": "string"
  },
  "values": {
    "property1": "string",
    "property2": "string"
  }
}
```

A row to change.

### Properties

| Name   | Type   | Required | Restrictions | Description                          |
| ------ | ------ | -------- | ------------ | ------------------------------------ |
| where  | object | true     | none         | The key columns of the row to change |
| values | object | true     | none         | The columns to set                   |

<h2 id="tocS_DeleteBody">DeleteBody</h2>
<!-- backwards compatibility -->
<a id="schemadeletebody"></a>
<a id="schema_DeleteBody"></a>
<a id="tocSdeletebody"></a>
<a id="tocsdeletebody"></a>

```json
{
  "where": {
    "property1": "string",
    "property2": "string"
  }
}
```

A row to delete.

### Properties

| Name  | Type   | Required | Restrictions | Description                          |
| ----- | ------ | -------- | ------------ | ------------------------------------ |
| where | object | true     | none         | The key columns of the row to delete |

<h2 id="tocS_SqlResult">SqlResult</h2>
<!-- backwards compatibility -->
<a id="schemasqlresult"></a>
<a id="schema_SqlResult"></a>
<a id="tocSsqlresult"></a>
<a id="tocssqlresult"></a>

```json
{
  "columns": ["string"],
  "rows": [
    {
      "property1": "string",
      "property2": "string"
    }
  ],
  "rowCount": 0,
  "durationMs": 0
}
```

What a statement returned.

### Properties

| Name       | Type                | Required | Restrictions | Description                          |
| ---------- | ------------------- | -------- | ------------ | ------------------------------------ |
| columns    | [string]            | true     | none         | The result columns, in order         |
| rows       | [[Row](#schemarow)] | true     | none         | The rows, keyed by column            |
| rowCount   | integer(int32)      | true     | none         | Rows returned, or changed by a write |
| durationMs | number(double)      | true     | none         | How long the statement took          |

<h2 id="tocS_SqlBody">SqlBody</h2>
<!-- backwards compatibility -->
<a id="schemasqlbody"></a>
<a id="schema_SqlBody"></a>
<a id="tocSsqlbody"></a>
<a id="tocssqlbody"></a>

```json
{
  "sql": "string"
}
```

A statement for the SQL console.

### Properties

| Name | Type   | Required | Restrictions | Description       |
| ---- | ------ | -------- | ------------ | ----------------- |
| sql  | string | true     | none         | The SQL statement |

<h2 id="tocS_LanguageStatus">LanguageStatus</h2>
<!-- backwards compatibility -->
<a id="schemalanguagestatus"></a>
<a id="schema_LanguageStatus"></a>
<a id="tocSlanguagestatus"></a>
<a id="tocslanguagestatus"></a>

```json
{
  "typescript": "string",
  "reason": "string"
}
```

Whether the editor has TypeScript behind it.

### Properties

| Name       | Type           | Required | Restrictions | Description                                                               |
| ---------- | -------------- | -------- | ------------ | ------------------------------------------------------------------------- |
| typescript | string \| null | true     | none         | The version of the project's TypeScript, null when it could not be loaded |
| reason     | string \| null | true     | none         | Why there is no language service, null when there is one                  |

<h2 id="tocS_TextRange">TextRange</h2>
<!-- backwards compatibility -->
<a id="schematextrange"></a>
<a id="schema_TextRange"></a>
<a id="tocStextrange"></a>
<a id="tocstextrange"></a>

```json
{
  "start": 0,
  "end": 0
}
```

A stretch of the source, as UTF-16 offsets.

### Properties

| Name  | Type           | Required | Restrictions | Description     |
| ----- | -------------- | -------- | ------------ | --------------- |
| start | integer(int32) | true     | none         | Where it starts |
| end   | integer(int32) | true     | none         | Where it ends   |

<h2 id="tocS_CompletionItem">CompletionItem</h2>
<!-- backwards compatibility -->
<a id="schemacompletionitem"></a>
<a id="schema_CompletionItem"></a>
<a id="tocScompletionitem"></a>
<a id="tocscompletionitem"></a>

```json
{
  "label": "string",
  "kind": "string",
  "sortText": "string",
  "insertText": "string",
  "replacement": {
    "start": 0,
    "end": 0
  }
}
```

One thing TypeScript offers at the cursor.

### Properties

| Name        | Type           | Required | Restrictions | Description                                                             |
| ----------- | -------------- | -------- | ------------ | ----------------------------------------------------------------------- |
| label       | string         | true     | none         | What is shown and inserted                                              |
| kind        | string         | true     | none         | TypeScript's kind of the entry: `method`, `property`, `function`, ...   |
| sortText    | string         | true     | none         | How TypeScript orders it                                                |
| insertText  | string \| null | true     | none         | Text to insert in place of the label, when it differs                   |
| replacement | object \| null | true     | none         | The text the completion replaces, when it is not the word at the cursor |

<h2 id="tocS_Completions">Completions</h2>
<!-- backwards compatibility -->
<a id="schemacompletions"></a>
<a id="schema_Completions"></a>
<a id="tocScompletions"></a>
<a id="tocscompletions"></a>

```json
{
  "items": [
    {
      "label": "string",
      "kind": "string",
      "sortText": "string",
      "insertText": "string",
      "replacement": {
        "start": 0,
        "end": 0
      }
    }
  ]
}
```

The completions at the cursor.

### Properties

| Name  | Type                                      | Required | Restrictions | Description                      |
| ----- | ----------------------------------------- | -------- | ------------ | -------------------------------- |
| items | [[CompletionItem](#schemacompletionitem)] | true     | none         | The items, in TypeScript's order |

<h2 id="tocS_PositionBody">PositionBody</h2>
<!-- backwards compatibility -->
<a id="schemapositionbody"></a>
<a id="schema_PositionBody"></a>
<a id="tocSpositionbody"></a>
<a id="tocspositionbody"></a>

```json
{
  "source": "string",
  "offset": 0
}
```

The editor buffer and a place in it.

### Properties

| Name   | Type           | Required | Restrictions | Description                     |
| ------ | -------------- | -------- | ------------ | ------------------------------- |
| source | string         | true     | none         | The schema source, saved or not |
| offset | integer(int32) | true     | none         | The UTF-16 offset of the cursor |

<h2 id="tocS_CompletionDetail">CompletionDetail</h2>
<!-- backwards compatibility -->
<a id="schemacompletiondetail"></a>
<a id="schema_CompletionDetail"></a>
<a id="tocScompletiondetail"></a>
<a id="tocscompletiondetail"></a>

```json
{
  "detail": "string",
  "documentation": "string"
}
```

The type and documentation of one completion.

### Properties

| Name          | Type           | Required | Restrictions | Description                  |
| ------------- | -------------- | -------- | ------------ | ---------------------------- |
| detail        | string \| null | true     | none         | Its signature or type        |
| documentation | string \| null | true     | none         | Its doc comment, as Markdown |

<h2 id="tocS_CompletionDetailBody">CompletionDetailBody</h2>
<!-- backwards compatibility -->
<a id="schemacompletiondetailbody"></a>
<a id="schema_CompletionDetailBody"></a>
<a id="tocScompletiondetailbody"></a>
<a id="tocscompletiondetailbody"></a>

```json
{
  "source": "string",
  "offset": 0,
  "name": "string"
}
```

A completion to describe in full.

### Properties

| Name   | Type           | Required | Restrictions | Description                     |
| ------ | -------------- | -------- | ------------ | ------------------------------- |
| source | string         | true     | none         | The schema source, saved or not |
| offset | integer(int32) | true     | none         | The UTF-16 offset of the cursor |
| name   | string         | true     | none         | The name of the completion      |

<h2 id="tocS_Hover">Hover</h2>
<!-- backwards compatibility -->
<a id="schemahover"></a>
<a id="schema_Hover"></a>
<a id="tocShover"></a>
<a id="tocshover"></a>

```json
{
  "contents": "string",
  "range": {
    "start": 0,
    "end": 0
  }
}
```

What TypeScript says about the symbol at the cursor.

### Properties

| Name     | Type           | Required | Restrictions | Description                                                |
| -------- | -------------- | -------- | ------------ | ---------------------------------------------------------- |
| contents | string \| null | true     | none         | The type and documentation, as Markdown; null over nothing |
| range    | object \| null | true     | none         | The symbol's range                                         |

<h2 id="tocS_SignatureParameter">SignatureParameter</h2>
<!-- backwards compatibility -->
<a id="schemasignatureparameter"></a>
<a id="schema_SignatureParameter"></a>
<a id="tocSsignatureparameter"></a>
<a id="tocssignatureparameter"></a>

```json
{
  "label": "string",
  "documentation": "string"
}
```

One parameter of a signature.

### Properties

| Name          | Type           | Required | Restrictions | Description                   |
| ------------- | -------------- | -------- | ------------ | ----------------------------- |
| label         | string         | true     | none         | How it reads in the signature |
| documentation | string \| null | true     | none         | Its doc comment               |

<h2 id="tocS_Signature">Signature</h2>
<!-- backwards compatibility -->
<a id="schemasignature"></a>
<a id="schema_Signature"></a>
<a id="tocSsignature"></a>
<a id="tocssignature"></a>

```json
{
  "label": "string",
  "documentation": "string",
  "parameters": [
    {
      "label": "string",
      "documentation": "string"
    }
  ]
}
```

One overload of the call.

### Properties

| Name          | Type                                              | Required | Restrictions | Description         |
| ------------- | ------------------------------------------------- | -------- | ------------ | ------------------- |
| label         | string                                            | true     | none         | The whole signature |
| documentation | string \| null                                    | true     | none         | Its doc comment     |
| parameters    | [[SignatureParameter](#schemasignatureparameter)] | true     | none         | Its parameters      |

<h2 id="tocS_SignatureHelp">SignatureHelp</h2>
<!-- backwards compatibility -->
<a id="schemasignaturehelp"></a>
<a id="schema_SignatureHelp"></a>
<a id="tocSsignaturehelp"></a>
<a id="tocssignaturehelp"></a>

```json
{
  "signatures": [
    {
      "label": "string",
      "documentation": "string",
      "parameters": [
        {
          "label": "string",
          "documentation": "string"
        }
      ]
    }
  ],
  "activeSignature": 0,
  "activeParameter": 0
}
```

The signatures of the call the cursor is in.

### Properties

| Name            | Type                            | Required | Restrictions | Description                    |
| --------------- | ------------------------------- | -------- | ------------ | ------------------------------ |
| signatures      | [[Signature](#schemasignature)] | true     | none         | The overloads                  |
| activeSignature | integer(int32)                  | true     | none         | The overload TypeScript picked |
| activeParameter | integer(int32)                  | true     | none         | The parameter the cursor is on |

<h2 id="tocS_Diagnostic">Diagnostic</h2>
<!-- backwards compatibility -->
<a id="schemadiagnostic"></a>
<a id="schema_Diagnostic"></a>
<a id="tocSdiagnostic"></a>
<a id="tocsdiagnostic"></a>

```json
{
  "message": "string",
  "severity": "error",
  "range": {
    "start": 0,
    "end": 0
  }
}
```

One problem TypeScript found.

### Properties

| Name     | Type   | Required | Restrictions | Description   |
| -------- | ------ | -------- | ------------ | ------------- |
| message  | string | true     | none         | What is wrong |
| severity | string | true     | none         | How bad it is |
| range    | object | true     | none         | Where it is   |

#### Enumerated Values

| Property | Value   |
| -------- | ------- |
| severity | error   |
| severity | warning |
| severity | info    |

<h2 id="tocS_Diagnostics">Diagnostics</h2>
<!-- backwards compatibility -->
<a id="schemadiagnostics"></a>
<a id="schema_Diagnostics"></a>
<a id="tocSdiagnostics"></a>
<a id="tocsdiagnostics"></a>

```json
{
  "diagnostics": [
    {
      "message": "string",
      "severity": "error",
      "range": {
        "start": 0,
        "end": 0
      }
    }
  ]
}
```

The type errors of a source; its syntax errors come from the parser, with the diagram.

### Properties

| Name        | Type                              | Required | Restrictions | Description                        |
| ----------- | --------------------------------- | -------- | ------------ | ---------------------------------- |
| diagnostics | [[Diagnostic](#schemadiagnostic)] | true     | none         | The problems, in order of position |

<h2 id="tocS_SourceBody">SourceBody</h2>
<!-- backwards compatibility -->
<a id="schemasourcebody"></a>
<a id="schema_SourceBody"></a>
<a id="tocSsourcebody"></a>
<a id="tocssourcebody"></a>

```json
{
  "source": "string"
}
```

A source to check.

### Properties

| Name   | Type   | Required | Restrictions | Description                     |
| ------ | ------ | -------- | ------------ | ------------------------------- |
| source | string | true     | none         | The schema source, saved or not |
