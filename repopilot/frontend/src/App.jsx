import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Terminal,
  ShieldAlert,
  ShieldCheck,
  GitBranch,
  Cpu,
  Zap,
  Search,
  ExternalLink,
  Copy,
  Check,
  Play,
  Key,
  RefreshCw,
  Code2,
  Layers,
  AlertTriangle,
  CheckCircle2,
  FileCode,
  ArrowRight,
  Sparkles,
  BookOpen,
  Server,
  Activity,
  X,
  ChevronRight,
  GitPullRequest,
  Box,
  Filter,
  Smartphone,
  Monitor,
  Command,
  ArrowUpRight,
  SlidersHorizontal,
  User,
  LogOut,
  Lock,
  Mail,
  Shield
} from 'lucide-react';

// Built-in fallback repositories so the UI works immediately in preview mode
// AND connects automatically to FastAPI (http://localhost:8000/api/v1) when running locally!
const PRESET_REPOS = [
  {
    label: 'psf/requests',
    url: 'https://github.com/psf/requests',
    badge: 'Python HTTP SDK'
  },
  {
    label: 'tiangolo/fastapi',
    url: 'https://github.com/tiangolo/fastapi',
    badge: 'Async Web Framework'
  },
  {
    label: 'pallets/flask',
    url: 'https://github.com/pallets/flask',
    badge: 'WSGI Microframework'
  }
];

const DEMO_DATA_BY_REPO = {
  'psf/requests': {
    cached: true,
    latencyMs: 42,
    overview: {
      owner: 'psf',
      repo: 'requests',
      full_name: 'psf/requests',
      description: 'A simple, yet elegant, HTTP library for Python.',
      stars: 52480,
      forks: 9410,
      open_issues_count: 142,
      default_branch: 'main',
      latest_commit_sha: '9a40d127c8e5170e9012f891a2e47f023c6c09f1',
      languages: { Python: 98420, Makefile: 1420 },
      topics: ['python', 'http', 'client', 'cookies', 'sessions']
    },
    xray: {
      one_line_summary:
        'Requests is a modular Python HTTP client library providing persistent sessions, connection pooling via urllib3, authentication handlers, and automatic cookie persistence.',
      architectural_pattern: 'Modular Layered SDK (Public API → Session Orchestrator → Transport Adapter)',
      mermaid_diagram: `graph TD
  A[User Application] --> B[requests.api]
  B --> C[Session Orchestrator]
  C --> D[Request & PreparedRequest]
  C --> E[RequestsCookieJar]
  C --> F[HTTPAdapter]
  F --> G[urllib3 PoolManager]`,
      core_components: [
        {
          name: 'Public Functional API',
          role: 'Exposes stateless top-level convenience methods (get, post, put, delete, request) that instantiate an ephemeral Session context.',
          key_files: ['src/requests/api.py', 'src/requests/__init__.py']
        },
        {
          name: 'Session & Redirect Orchestrator',
          role: 'Manages persistent HTTP configuration, cookie merging, environment proxies, auth injection, and redirect traversal across calls.',
          key_files: ['src/requests/sessions.py', 'src/requests/cookies.py']
        },
        {
          name: 'HTTP Transport Adapter',
          role: 'Bridges PreparedRequest objects to urllib3 connection pools, TLS/SSL certificate verification, and retry policies.',
          key_files: ['src/requests/adapters.py', 'src/requests/certs.py']
        },
        {
          name: 'Request / Response Domain Models',
          role: 'Encapsulates raw HTTP payloads, header normalization, URL preparation, streaming content iteration, and JSON decoding.',
          key_files: ['src/requests/models.py', 'src/requests/structures.py', 'src/requests/status_codes.py']
        },
        {
          name: 'Authentication & Security Utilities',
          role: 'Implements HTTPBasicAuth, HTTPDigestAuth, proxy auth headers, and netrc credential resolution.',
          key_files: ['src/requests/auth.py', 'src/requests/utils.py', 'src/requests/_internal_utils.py']
        }
      ],
      request_lifecycle: [
        'Caller invokes `requests.get(url, params=...)` in `src/requests/api.py`, which opens a context-managed `Session()` instance.',
        '`Session.request()` in `src/requests/sessions.py` constructs a `Request` model and merges request-level cookies, headers, and proxies with session defaults.',
        '`Session.prepare_request()` transforms `Request` into an immutable `PreparedRequest`, normalizing URLs, encoding body payloads, and applying `auth` hooks.',
        '`Session.send()` resolves the matching prefix mount (`https://` or `http://`) and dispatches the `PreparedRequest` to `HTTPAdapter.send()` in `src/requests/adapters.py`.',
        '`HTTPAdapter` acquires a pooled connection from `urllib3.PoolManager`, transmits the payload, and wraps the low-level response into a `requests.Response` object.',
        '`SessionRedirectMixin.resolve_redirects()` inspects 3xx status codes, strips sensitive headers on cross-origin hops, and yields the final `Response`.'
      ],
      onboarding: {
        prerequisites: ['Python 3.8+', 'pip & virtualenv', 'pytest (for test suite)'],
        setup_commands: [
          'git clone https://github.com/psf/requests.git && cd requests',
          'python -m venv .venv && source .venv/bin/activate',
          'pip install -e . -r requirements-dev.txt',
          'pytest tests/'
        ],
        required_env_vars: ['None required (Optional: HTTP_PROXY, HTTPS_PROXY, REQUESTS_CA_BUNDLE)'],
        where_to_start:
          'Start at `src/requests/sessions.py` inside `Session.request()` (line 557) — every HTTP call in the library flows through this single method.'
      }
    },
    dependencies: {
      overall_health_summary:
        '4 core runtime dependencies analyzed via Google OSV.dev batch scanner. 3 packages are clean; 1 historical pinned package (urllib3 1.26.4) flagged for header stripping advisory on cross-origin redirects.',
      packages: [
        {
          package_name: 'urllib3',
          version: '1.26.4',
          ecosystem: 'PyPI',
          category: 'HTTP/Networking',
          vulnerable: true,
          cve_ids: ['GHSA-v845-jxx5-vc9f', 'PYSEC-2023-192'],
          purpose_in_repo: 'Provides low-level thread-safe HTTP connection pooling, TLS socket management, and retry control inside HTTPAdapter.',
          remediation_advice: 'pip install "urllib3>=1.26.18,<3" to patch Cookie header leakage on cross-origin redirects.'
        },
        {
          package_name: 'certifi',
          version: '2024.8.30',
          ecosystem: 'PyPI',
          category: 'Auth/Security',
          vulnerable: false,
          cve_ids: [],
          purpose_in_repo: 'Supplies Mozilla curated collection of Root Certificates for verifying the trustworthiness of SSL/TLS certificates.',
          remediation_advice: null
        },
        {
          package_name: 'idna',
          version: '3.7',
          ecosystem: 'PyPI',
          category: 'HTTP/Networking',
          vulnerable: false,
          cve_ids: [],
          purpose_in_repo: 'Handles Internationalized Domain Names in Applications (IDNA 2008) encoding for non-ASCII hostnames.',
          remediation_advice: null
        },
        {
          package_name: 'charset-normalizer',
          version: '3.3.2',
          ecosystem: 'PyPI',
          category: 'Core Framework',
          vulnerable: false,
          cve_ids: [],
          purpose_in_repo: 'Detects character encoding on HTTP response byte streams when no explicit charset header is present.',
          remediation_advice: null
        }
      ]
    },
    issues: [
      {
        number: 6792,
        title: 'Session.merge_environment_settings overrides explicit verify=False when REQUESTS_CA_BUNDLE is set',
        state: 'open',
        labels: ['bug', 'sessions', 'ssl'],
        created_at: '2026-09-14',
        comments_count: 6,
        body: 'When a caller explicitly passes `verify=False` to `session.get(url, verify=False)` while `REQUESTS_CA_BUNDLE` is set in the environment, `merge_environment_settings` replaces `verify=False` with the CA bundle path because `merge_setting` only checks truthiness or falsy defaults.'
      },
      {
        number: 6784,
        title: 'Cookie persistence leaks domain-less cookies across redirect hops in SessionRedirectMixin',
        state: 'open',
        labels: ['security', 'cookies'],
        created_at: '2026-09-02',
        comments_count: 4,
        body: 'In `src/requests/cookies.py` and `src/requests/sessions.py`, `merge_cookies` copies dict cookies into `RequestsCookieJar` without binding them to the origin request host.'
      },
      {
        number: 6751,
        title: 'HTTPAdapter max_retries does not expose backoff_factor configuration directly on Session mount',
        state: 'open',
        labels: ['enhancement', 'adapter'],
        created_at: '2026-08-19',
        comments_count: 9,
        body: 'Developers have to manually import `urllib3.util.Retry` to configure retry backoff instead of passing retry arguments cleanly.'
      }
    ]
  },
  'tiangolo/fastapi': {
    cached: true,
    latencyMs: 38,
    overview: {
      owner: 'tiangolo',
      repo: 'fastapi',
      full_name: 'tiangolo/fastapi',
      description: 'FastAPI framework, high performance, easy to learn, fast to code, ready for production',
      stars: 78900,
      forks: 6720,
      open_issues_count: 218,
      default_branch: 'master',
      latest_commit_sha: '4e8c91a03b5490a11c33d7a109e2f88c71b02d11',
      languages: { Python: 142800 },
      topics: ['fastapi', 'pydantic', 'starlette', 'openapi', 'asyncio']
    },
    xray: {
      one_line_summary:
        'FastAPI is a modern, high-performance ASGI web framework built on Starlette and Pydantic that generates OpenAPI schemas and validates request/response types automatically from Python type hints.',
      architectural_pattern: 'Declarative ASGI Decorator & Dependency Injection Graph over Starlette',
      mermaid_diagram: `graph TD
  A[ASGI Server Uvicorn] --> B[FastAPI App]
  B --> C[APIRouter & APIRoute]
  C --> D[Dependant Graph Solver]
  D --> E[Pydantic TypeAdapter Validation]
  C --> F[OpenAPI Schema Generator]`,
      core_components: [
        {
          name: 'FastAPI Core Application',
          role: 'Subclasses Starlette to register global middleware, exception handlers, lifespan context, and automatic `/docs` Swagger UI.',
          key_files: ['fastapi/applications.py', 'fastapi/__init__.py']
        },
        {
          name: 'APIRouter & APIRoute Dispatch',
          role: 'Converts path operation functions into Starlette Route endpoints wrapped with automatic parameter parsing and serialization.',
          key_files: ['fastapi/routing.py', 'fastapi/params.py']
        },
        {
          name: 'Hierarchical Dependency Injection Engine',
          role: 'Introspects `Depends()` and `Security()` callables, builds a DAG of sub-dependencies, caches results per request, and cleans up yield dependencies.',
          key_files: ['fastapi/dependencies/utils.py', 'fastapi/dependencies/models.py']
        },
        {
          name: 'OpenAPI 3.1 Schema Synthesizer',
          role: 'Walks registered APIRoutes and Pydantic JSON schemas to emit compliant OpenAPI specifications.',
          key_files: ['fastapi/openapi/utils.py', 'fastapi/openapi/models.py']
        }
      ],
      request_lifecycle: [
        'Uvicorn receives an incoming HTTP connection and invokes `FastAPI.__call__(scope, receive, send)` in `fastapi/applications.py`.',
        'Starlette middleware stack processes CORS and exceptions before matching the URL path to an `APIRoute` instance in `fastapi/routing.py`.',
        '`get_request_handler()` runs `solve_dependencies()` in `fastapi/dependencies/utils.py` to extract path, query, header, cookie, and body fields.',
        'Pydantic validates extracted values against type annotations; any mismatch raises `RequestValidationError` (HTTP 422).',
        'The endpoint coroutine or sync function (via threadpool) executes and returns a Python object or Pydantic model.',
        '`serialize_response()` validates and converts the return payload via `jsonable_encoder` into a `JSONResponse`.'
      ],
      onboarding: {
        prerequisites: ['Python 3.9+', 'Hatch or pip', 'Uvicorn'],
        setup_commands: [
          'git clone https://github.com/tiangolo/fastapi.git && cd fastapi',
          'python -m venv .venv && source .venv/bin/activate',
          'pip install -e ".[all]"',
          'pytest'
        ],
        required_env_vars: ['None required'],
        where_to_start:
          'Start at `fastapi/routing.py` inside `get_request_handler()` — it connects Pydantic validation, `solve_dependencies()`, and route execution.'
      }
    },
    dependencies: {
      overall_health_summary:
        '3 core runtime dependencies scanned via Google OSV.dev. All current versions pass security checks with 0 unpatched CVEs.',
      packages: [
        {
          package_name: 'starlette',
          version: '0.40.0',
          ecosystem: 'PyPI',
          category: 'Core Framework',
          vulnerable: false,
          cve_ids: [],
          purpose_in_repo: 'Provides the underlying ASGI routing, WebSocket handling, Request/Response primitives, and middleware lifecycle.',
          remediation_advice: null
        },
        {
          package_name: 'pydantic',
          version: '2.9.2',
          ecosystem: 'PyPI',
          category: 'Core Framework',
          vulnerable: false,
          cve_ids: [],
          purpose_in_repo: 'Powers Rust-backed runtime data validation, serialization, and JSON Schema generation for all request/response models.',
          remediation_advice: null
        },
        {
          package_name: 'typing-extensions',
          version: '4.12.2',
          ecosystem: 'PyPI',
          category: 'Build/Utility',
          vulnerable: false,
          cve_ids: [],
          purpose_in_repo: 'Backports `Annotated` and modern typing constructs across Python 3.8+ versions.',
          remediation_advice: null
        }
      ]
    },
    issues: [
      {
        number: 11842,
        title: 'Yield dependencies with background tasks raise context error when exception occurs in streaming response',
        state: 'open',
        labels: ['bug', 'dependencies'],
        created_at: '2026-10-01',
        comments_count: 5,
        body: 'In `fastapi/dependencies/utils.py`, `solve_dependencies` exits the AsyncExitStack before `StreamingResponse` finishes consuming the generator.'
      },
      {
        number: 11790,
        title: 'Pydantic v2 RootModel response_model generates duplicate component schema definitions in OpenAPI',
        state: 'open',
        labels: ['openapi', 'pydantic-v2'],
        created_at: '2026-09-21',
        comments_count: 3,
        body: 'Using a `RootModel[List[Item]]` in `APIRoute` causes `fastapi/openapi/utils.py` to emit redundant `$defs` keys.'
      }
    ]
  },
  'pallets/flask': {
    cached: true,
    latencyMs: 35,
    overview: {
      owner: 'pallets',
      repo: 'flask',
      full_name: 'pallets/flask',
      description: 'The Python micro framework for building web applications.',
      stars: 67800,
      forks: 16200,
      open_issues_count: 48,
      default_branch: 'main',
      latest_commit_sha: '7c2e19a81f49a01b22c44d8f01a2e47f023c6c09',
      languages: { Python: 89400 },
      topics: ['flask', 'wsgi', 'werkzeug', 'jinja2', 'python']
    },
    xray: {
      one_line_summary:
        'Flask is a lightweight WSGI web application framework built on Werkzeug and Jinja2 that uses context-local proxies for request, session, and application state.',
      architectural_pattern: 'Context-Local WSGI Microframework (App Context + Blueprints)',
      mermaid_diagram: `graph TD
  A[WSGI Server] --> B[Flask.wsgi_app]
  B --> C[RequestContext & AppContext]
  C --> D[Werkzeug MapAdapter Routing]
  D --> E[Blueprint View Function]
  E --> F[Jinja2 Template & Response]`,
      core_components: [
        {
          name: 'Flask WSGI Application Core',
          role: 'Implements the central `Flask` class, URL route registration, error handling, and WSGI callable dispatch.',
          key_files: ['src/flask/app.py', 'src/flask/sansio/app.py']
        },
        {
          name: 'Context Locals & Proxies',
          role: 'Manages thread/coroutine-safe `current_app`, `request`, `session`, and `g` proxies via Python contextvars.',
          key_files: ['src/flask/ctx.py', 'src/flask/globals.py']
        },
        {
          name: 'Modular Blueprints',
          role: 'Allows applications to be factored into reusable route, template, and static asset components.',
          key_files: ['src/flask/blueprints.py', 'src/flask/sansio/blueprints.py']
        }
      ],
      request_lifecycle: [
        'WSGI server invokes `Flask.__call__(environ, start_response)` in `src/flask/app.py`.',
        '`wsgi_app()` pushes a `RequestContext` (and `AppContext`), binding `request` and `session` contextvars.',
        '`full_dispatch_request()` runs `before_request` hooks and matches the URL rule via Werkzeug `MapAdapter`.',
        'The matched view function executes and returns a tuple, string, dict, or `Response` instance.',
        '`make_response()` normalizes the return value, runs `after_request` hooks, saves the signed cookie session, and pops contexts.'
      ],
      onboarding: {
        prerequisites: ['Python 3.9+', 'pip & virtualenv', 'pytest'],
        setup_commands: [
          'git clone https://github.com/pallets/flask.git && cd flask',
          'python -m venv .venv && source .venv/bin/activate',
          'pip install -e .',
          'pytest'
        ],
        required_env_vars: ['FLASK_APP (Optional)', 'FLASK_DEBUG (Optional)'],
        where_to_start:
          'Start at `src/flask/app.py` inside `wsgi_app()` — it shows the entire request/response context lifecycle in 40 lines.'
      }
    },
    dependencies: {
      overall_health_summary:
        '3 core runtime dependencies scanned via Google OSV.dev. All packages pass security audit with 0 active CVEs.',
      packages: [
        {
          package_name: 'werkzeug',
          version: '3.0.4',
          ecosystem: 'PyPI',
          category: 'HTTP/Networking',
          vulnerable: false,
          cve_ids: [],
          purpose_in_repo: 'Supplies WSGI request/response objects, URL routing (`Map`, `Rule`), and development debugger.',
          remediation_advice: null
        },
        {
          package_name: 'jinja2',
          version: '3.1.4',
          ecosystem: 'PyPI',
          category: 'Core Framework',
          vulnerable: false,
          cve_ids: [],
          purpose_in_repo: 'Renders sandboxed HTML templates with auto-escaping.',
          remediation_advice: null
        },
        {
          package_name: 'itsdangerous',
          version: '2.2.0',
          ecosystem: 'PyPI',
          category: 'Auth/Security',
          vulnerable: false,
          cve_ids: [],
          purpose_in_repo: 'Cryptographically signs client-side session cookies using HMAC-SHA1.',
          remediation_advice: null
        }
      ]
    },
    issues: [
      {
        number: 5512,
        title: 'Blueprint nested url_prefix double-slashes when child route is empty string',
        state: 'open',
        labels: ['blueprints', 'routing'],
        created_at: '2026-09-28',
        comments_count: 3,
        body: 'Registering a child blueprint with `url_prefix="/api"` and route `""` produces `/api/` instead of `/api`.'
      }
    ]
  }
};

// Parse simple Mermaid `graph TD` into visual nodes & edges for the interactive Architecture Canvas
function parseMermaidGraph(mermaidStr) {
  if (!mermaidStr) return { nodes: [], edges: [] };
  const lines = mermaidStr
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('graph ') && !l.startsWith('flowchart ') && !l.startsWith('```'));

  const nodeMap = new Map();
  const edges = [];

  const ensureNode = (id, label) => {
    const cleanId = id.trim();
    const cleanLabel = (label || cleanId).replace(/^["'(\[]+|["')\]]+$/g, '').trim();
    if (!nodeMap.has(cleanId)) {
      nodeMap.set(cleanId, { id: cleanId, label: cleanLabel });
    } else if (label && nodeMap.get(cleanId).label === cleanId) {
      nodeMap.set(cleanId, { id: cleanId, label: cleanLabel });
    }
  };

  const edgeRegex = /([A-Za-z0-9_]+)(?:\s*[\[\(\{]([^\]\)\}]+)[\]\)\}])?\s*--+>?\|?[^|]*\|?\s*([A-Za-z0-9_]+)(?:\s*[\[\(\{]([^\]\)\}]+)[\]\)\}])?/;

  lines.forEach((line) => {
    const match = line.match(edgeRegex);
    if (match) {
      const [, fromId, fromLabel, toId, toLabel] = match;
      ensureNode(fromId, fromLabel);
      ensureNode(toId, toLabel);
      edges.push({ from: fromId.trim(), to: toId.trim() });
    }
  });

  return {
    nodes: Array.from(nodeMap.values()),
    edges
  };
}

// Syntax-highlighted Unified Diff & Engineering Report Renderer
function renderEngineeringReport(reportText) {
  if (!reportText) return null;
  const parts = reportText.split(/(```diff[\s\S]*?```)/g);

  return parts.map((block, idx) => {
    if (block.startsWith('```diff')) {
      const diffLines = block
        .replace(/^```diff\n?/, '')
        .replace(/```$/, '')
        .split('\n');
      return (
        <div
          key={idx}
          className="my-4 rounded-xl overflow-hidden border border-white/15 bg-black/90 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)]"
        >
          <div className="px-3.5 py-2 border-b border-white/10 bg-white/[0.03] flex items-center justify-between text-[11px] font-mono text-zinc-400">
            <span>UNIFIED GIT PATCH PREVIEW</span>
            <span className="text-zinc-300">diff --git</span>
          </div>
          <div className="p-3 overflow-x-auto font-mono text-xs leading-relaxed space-y-0.5">
            {diffLines.map((line, lIdx) => {
              let lineClass = 'text-zinc-400';
              if (line.startsWith('+') && !line.startsWith('+++')) {
                lineClass = 'bg-emerald-500/15 text-emerald-300 border-l-2 border-emerald-400 pl-2';
              } else if (line.startsWith('-') && !line.startsWith('---')) {
                lineClass = 'bg-rose-500/15 text-rose-300 border-l-2 border-rose-400 pl-2';
              } else if (line.startsWith('@@')) {
                lineClass = 'text-zinc-200 bg-white/[0.05] py-0.5 px-2 rounded my-1';
              } else if (line.startsWith('---') || line.startsWith('+++')) {
                lineClass = 'text-white font-semibold';
              }
              return (
                <div key={lIdx} className={`whitespace-pre ${lineClass}`}>
                  {line || ' '}
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    return (
      <div key={idx} className="space-y-2 text-xs sm:text-sm text-zinc-300 leading-relaxed font-sans">
        {block.split('\n').map((line, lIdx) => {
          const trimmed = line.trim();
          if (!trimmed) return <div key={lIdx} className="h-1.5" />;
          if (trimmed.startsWith('### ')) {
            return (
              <h4
                key={lIdx}
                className="text-white font-semibold tracking-tight text-sm sm:text-base pt-2 border-b border-white/10 pb-1.5"
              >
                {trimmed.replace('### ', '')}
              </h4>
            );
          }
          if (trimmed.startsWith('- ')) {
            return (
              <div key={lIdx} className="flex items-start gap-2.5 pl-1">
                <span className="w-1.5 h-1.5 rounded-full bg-white/70 mt-2 shrink-0" />
                <span className="text-zinc-300">{trimmed.slice(2)}</span>
              </div>
            );
          }
          return <p key={lIdx}>{line}</p>;
        })}
      </div>
    );
  });
}

export default function App() {
  // Backend & API Configuration State
  const [apiBaseUrl, setApiBaseUrl] = useState('http://localhost:8000/api/v1');
  const [backendStatus, setBackendStatus] = useState('checking'); // 'online' | 'demo' | 'checking'
  const [keyMode, setKeyMode] = useState('server'); // 'server' (default free tier) | 'custom' (optional personal key)
  const [userGroqKey, setUserGroqKey] = useState('');
  const [userGoogleKey, setUserGoogleKey] = useState('');
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showCmdPalette, setShowCmdPalette] = useState(false);

  // User Authentication State (Real Google OAuth2 Popup + Interactive Google Setup + Email/Password)
  const [currentUser, setCurrentUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authTab, setAuthTab] = useState('login'); // 'login' | 'signup'
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // Real Google OAuth Client ID State (`accounts.google.com/gsi/client`)
  const [googleClientId, setGoogleClientId] = useState('');
  const [showGoogleConfigDrawer, setShowGoogleConfigDrawer] = useState(false);
  const [gsiReady, setGsiReady] = useState(false);

  // Viewport adaptive preview toggle ('auto' adapts to device screen; 'mobile' previews phone frame on desktop)
  const [viewportMode, setViewportMode] = useState('auto'); // 'auto' | 'mobile'

  // Repo & Navigation State
  const [repoInput, setRepoInput] = useState('https://github.com/psf/requests');
  const [activeTab, setActiveTab] = useState('xray'); // 'xray' | 'deps' | 'agent'
  const [isLoadingXray, setIsLoadingXray] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // Telemetry Counters (`GET /api/v1/stats`)
  const [telemetry, setTelemetry] = useState({
    registered_users: 14,
    total_analyses: 18,
    unique_repos: 6,
    issues_solved: 11
  });

  // Active Repository Analysis Payload
  const [repoData, setRepoData] = useState(DEMO_DATA_BY_REPO['psf/requests']);
  const [selectedComponentIdx, setSelectedComponentIdx] = useState(0);
  const [showRawMermaid, setShowRawMermaid] = useState(false);

  // Dependency Matrix Filters
  const [depCategoryFilter, setDepCategoryFilter] = useState('ALL');
  const [depStatusFilter, setDepStatusFilter] = useState('ALL'); // 'ALL' | 'VULNERABLE' | 'SAFE'

  // Issue-to-PR Agent State (`POST /api/v1/solve-issue` SSE Stream)
  const [selectedIssue, setSelectedIssue] = useState(DEMO_DATA_BY_REPO['psf/requests'].issues[0]);
  const [agentQuery, setAgentQuery] = useState(
    'Investigate Issue #6792 in `src/requests/sessions.py`: check how `merge_environment_settings` and `Session.request` handle `verify=False`, check the blast radius of `src/requests/sessions.py`, and provide a unified diff fix.'
  );
  const [isAgentRunning, setIsAgentRunning] = useState(false);
  const [agentStatusMsg, setAgentStatusMsg] = useState('IDLE • READY FOR DISPATCH');
  const [agentToolSteps, setAgentToolSteps] = useState([
    {
      step_number: 1,
      tool: 'search_files_in_tree',
      input: { keyword: 'sessions.py' },
      preview: 'src/requests/sessions.py\ntests/test_requests.py'
    },
    {
      step_number: 2,
      tool: 'search_inside_file',
      input: { filepath: 'src/requests/sessions.py', code_query: 'def merge_environment_settings' },
      preview: 'Match at Line 758 (showing lines 755-770):\n 758 |     def merge_environment_settings(self, url, proxies, stream, verify, cert):\n 759 |         if self.trust_env:\n 766 |             verify = merge_setting(verify, env_verify)'
    },
    {
      step_number: 3,
      tool: 'read_code_window',
      input: { filepath: 'src/requests/sessions.py', start_line: 550, end_line: 615 },
      preview: '--- src/requests/sessions.py (Lines 550-615 of 832) ---\n 557 |     def request(self, method, url, params=None, data=None, headers=None, ...):\n 589 |         settings = self.merge_environment_settings(prep.url, proxies, stream, verify, cert)'
    },
    {
      step_number: 4,
      tool: 'check_file_blast_radius',
      input: { filepath: 'src/requests/sessions.py' },
      preview: "Downstream files importing 'src/requests/sessions.py': [{'dependent_file': 'src/requests/api.py', 'matched_import': 'requests/sessions'}, {'dependent_file': 'src/requests/__init__.py', 'matched_import': 'sessions'}]"
    }
  ]);
  const [agentFinalReport, setAgentFinalReport] = useState(
    `### 1. Root Cause & Code Flow Analysis
- Entry Point: When \`requests.get(url, verify=False)\` is called in \`src/requests/api.py\`, it delegates to \`Session.request()\` at \`src/requests/sessions.py:557\`.
- Bug Location: At \`src/requests/sessions.py:589\`, \`Session.request()\` calls \`self.merge_environment_settings(prep.url, proxies, stream, verify, cert)\`.
- Faulty Condition: Inside \`merge_environment_settings\` (lines 758–774), when \`self.trust_env\` is \`True\` and \`verify\` is \`True\` or \`None\`, environment variables \`REQUESTS_CA_BUNDLE\` or \`CURL_CA_BUNDLE\` are looked up.

### 2. Cross-File Blast Radius
- \`src/requests/api.py\` (imports \`sessions.Session\` for all top-level HTTP verbs)
- \`src/requests/__init__.py\` (exports \`Session\` and \`session\` factory)

### 3. Proposed Unified Diff Patch
\`\`\`diff
--- a/src/requests/sessions.py
+++ b/src/requests/sessions.py
@@ -762,8 +762,10 @@ class Session(SessionRedirectMixin):
             no_proxy = proxies.get("no_proxy") if proxies is not None else None
             env_proxies = get_environ_proxies(url, no_proxy=no_proxy)
             for k, v in env_proxies.items():
                 proxies.setdefault(k, v)
 
-            if verify is True or verify is None:
+            # Preserve explicit verify=False from caller even when REQUESTS_CA_BUNDLE is set
+            if verify is not False and (verify is True or verify is None):
                 verify = (
                     os.environ.get("REQUESTS_CA_BUNDLE")
                     or os.environ.get("CURL_CA_BUNDLE")
+                    or verify
                 )
\`\`\``
  );

  const traceTimerRef = useRef(null);

  // Restore saved user session & Google Client ID from localStorage AND auto-load Google Identity SDK
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('repopilot_user');
      if (savedUser) setCurrentUser(JSON.parse(savedUser));
      const savedClientId = localStorage.getItem('repopilot_google_client_id');
      if (savedClientId) setGoogleClientId(savedClientId);
    } catch (_) {}

    // Dynamically load Google Identity Services script (\`https://accounts.google.com/gsi/client\`)
    if (typeof window !== 'undefined') {
      if (window.google?.accounts) {
        setGsiReady(true);
      } else {
        const existingScript = document.querySelector(
          'script[src="https://accounts.google.com/gsi/client"]'
        );
        if (!existingScript) {
          const script = document.createElement('script');
          script.src = 'https://accounts.google.com/gsi/client';
          script.async = true;
          script.defer = true;
          script.onload = () => setGsiReady(true);
          document.head.appendChild(script);
        } else {
          existingScript.addEventListener('load', () => setGsiReady(true));
        }
      }
    }
  }, []);

  // Keyboard shortcut \`Cmd+K\` / \`Ctrl+K\` for Command Palette
  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowCmdPalette((prev) => !prev);
      } else if (e.key === 'Escape') {
        setShowCmdPalette(false);
        setShowKeyModal(false);
        setShowSetupModal(false);
        setShowAuthModal(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Helper: trigger temporary toast notification
  const triggerToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? null : prev));
    }, 3400);
  };

  // Safe clipboard helper
  const handleCopy = (text, id) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1800);
    } catch (e) {
      triggerToast('Copied to clipboard');
    }
  };

  // Check live FastAPI backend connectivity & fetch live \`/api/v1/stats\`
  const checkBackendConnection = async (customBaseUrl = apiBaseUrl) => {
    setBackendStatus('checking');
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2200);
      const res = await fetch(`${customBaseUrl}/stats`, {
        method: 'GET',
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const statsData = await res.json();
        setTelemetry({
          registered_users: statsData.registered_users ?? 1,
          total_analyses: statsData.total_analyses ?? 0,
          unique_repos: statsData.unique_repos ?? 0,
          issues_solved: statsData.issues_solved ?? 0
        });
        setBackendStatus('online');
        return true;
      }
    } catch (err) {
      // Seamless fallback in preview mode
    }
    setBackendStatus('demo');
    return false;
  };

  useEffect(() => {
    checkBackendConnection();
    return () => {
      if (traceTimerRef.current) clearInterval(traceTimerRef.current);
    };
  }, []);

  // Helper: Complete Google login with backend (\`POST /api/v1/auth/google\`)
  const finalizeGoogleBackendLogin = async (payload) => {
    setIsAuthLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Google authentication failed');

      setCurrentUser(data.user);
      try {
        localStorage.setItem('repopilot_user', JSON.stringify(data.user));
      } catch (_) {}
      checkBackendConnection();
      setShowAuthModal(false);
      setShowGoogleConfigDrawer(false);
      triggerToast(`Signed in with Google as ${data.user.name} (${data.user.email})`);
    } catch (err) {
      if (backendStatus === 'online' && payload.access_token) {
        triggerToast(`Google Auth Error: ${err.message}`);
      } else {
        // Fallback when testing inside Canvas iframe
        const fallbackName = payload.name || (payload.email ? payload.email.split('@')[0] : 'Google User');
        const fallbackEmail = payload.email || 'user@gmail.com';
        const demoUser = {
          name: fallbackName,
          email: fallbackEmail,
          avatar_url:
            payload.avatar_url ||
            `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fallbackName)}`,
          auth_provider: 'google'
        };
        setCurrentUser(demoUser);
        try {
          localStorage.setItem('repopilot_user', JSON.stringify(demoUser));
        } catch (_) {}
        setTelemetry((prev) => ({
          ...prev,
          registered_users: prev.registered_users + 1
        }));
        setShowAuthModal(false);
        setShowGoogleConfigDrawer(false);
        triggerToast(`Signed in with Google as ${demoUser.name}`);
      }
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Handler: Real Google Account Chooser Popup (\`window.google.accounts.oauth2.initTokenClient\`)
  const handleGoogleSignIn = async () => {
    const cleanClientId = googleClientId.trim();

    // Save Client ID if provided
    if (cleanClientId) {
      try {
        localStorage.setItem('repopilot_google_client_id', cleanClientId);
      } catch (_) {}
    }

    // 1. If a real Google OAuth Client ID is configured AND Google SDK is loaded in browser:
    //    Launch the real \`accounts.google.com\` account chooser popup window!
    if (cleanClientId && typeof window !== 'undefined' && window.google?.accounts?.oauth2) {
      try {
        setIsAuthLoading(true);
        const tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: cleanClientId,
          scope: 'openid email profile',
          prompt: 'select_account',
          callback: async (tokenResponse) => {
            if (tokenResponse && tokenResponse.access_token) {
              await finalizeGoogleBackendLogin({
                access_token: tokenResponse.access_token
              });
            } else {
              setIsAuthLoading(false);
              triggerToast('Google sign-in popup was closed or cancelled');
            }
          },
          error_callback: (err) => {
            setIsAuthLoading(false);
            triggerToast(`Google Popup Notice: ${err?.message || 'Popup blocked or closed'}`);
          }
        });
        tokenClient.requestAccessToken({ prompt: 'select_account' });
        return;
      } catch (err) {
        setIsAuthLoading(false);
        triggerToast(`Check your Google Client ID: ${err.message}`);
        return;
      }
    }

    // 2. If user hasn't entered a Google Client ID yet (or hasn't typed their Gmail in the drawer):
    //    Open the interactive Google Setup & Account drawer instead of silently using dummy data!
    if (!showGoogleConfigDrawer) {
      setShowGoogleConfigDrawer(true);
      triggerToast('Enter your Google Client ID for real OAuth popup, or type your Gmail below');
      return;
    }

    // 3. If drawer is open and user entered their Gmail address for instant dev login:
    if (!authEmail.trim() || !authEmail.includes('@')) {
      triggerToast('Please paste your Google OAuth Client ID OR enter your Gmail address below');
      return;
    }

    await finalizeGoogleBackendLogin({
      email: authEmail.trim(),
      name: authName.trim() || authEmail.trim().split('@')[0]
    });
  };

  // Handler: Email/Password Login or Sign-Up (\`POST /api/v1/auth/login\` or \`/auth/signup\`)
  const handleEmailAuth = async (e) => {
    e.preventDefault();
    if (!authEmail.trim() || !authPassword.trim()) {
      triggerToast('Please enter both email and password');
      return;
    }
    if (authTab === 'signup' && !authName.trim()) {
      triggerToast('Please enter your name to create an account');
      return;
    }

    setIsAuthLoading(true);
    const endpoint = authTab === 'signup' ? 'signup' : 'login';
    const bodyPayload =
      authTab === 'signup'
        ? { name: authName.trim(), email: authEmail.trim(), password: authPassword }
        : { email: authEmail.trim(), password: authPassword };

    try {
      const res = await fetch(`${apiBaseUrl}/auth/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Authentication error');
      }
      setCurrentUser(data.user);
      try {
        localStorage.setItem('repopilot_user', JSON.stringify(data.user));
      } catch (_) {}
      checkBackendConnection();
      setShowAuthModal(false);
      triggerToast(
        authTab === 'signup'
          ? `Account created! Welcome, ${data.user.name}`
          : `Welcome back, ${data.user.name}`
      );
    } catch (err) {
      if (backendStatus === 'online') {
        triggerToast(err.message);
      } else {
        const fallbackUser = {
          name: authName.trim() || authEmail.split('@')[0],
          email: authEmail.trim(),
          auth_provider: 'email'
        };
        setCurrentUser(fallbackUser);
        try {
          localStorage.setItem('repopilot_user', JSON.stringify(fallbackUser));
        } catch (_) {}
        setTelemetry((prev) => ({
          ...prev,
          registered_users: prev.registered_users + (authTab === 'signup' ? 1 : 0)
        }));
        setShowAuthModal(false);
        triggerToast(`Signed in as ${fallbackUser.name}`);
      }
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleSignOut = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('repopilot_user');
    } catch (_) {}
    triggerToast('Signed out of RepoPilot');
  };

  // Build request headers: only attach custom keys if user switched to 'custom' mode
  const buildHeaders = () => {
    const headers = { 'Content-Type': 'application/json' };
    if (keyMode === 'custom') {
      if (userGroqKey.trim()) headers['X-User-Groq-Key'] = userGroqKey.trim();
      if (userGoogleKey.trim()) headers['X-User-Google-Key'] = userGoogleKey.trim();
    }
    return headers;
  };

  // Handler: Run Repository X-Ray + OSV.dev CVE Scan + Load Issues
  const handleAnalyzeRepo = async (targetUrl = repoInput) => {
    const cleanedUrl = targetUrl.trim();
    if (!cleanedUrl) {
      triggerToast('Enter a valid GitHub repository URL');
      return;
    }
    setRepoInput(cleanedUrl);
    setIsLoadingXray(true);
    setSelectedComponentIdx(0);

    const t0 = performance.now();

    try {
      const xrayRes = await fetch(`${apiBaseUrl}/xray`, {
        method: 'POST',
        headers: buildHeaders(),
        body: JSON.stringify({ repo_url: cleanedUrl })
      });

      if (!xrayRes.ok) {
        const errBody = await xrayRes.json().catch(() => ({}));
        throw new Error(errBody.detail || `HTTP ${xrayRes.status}`);
      }

      const xrayPayload = await xrayRes.json();
      const latencyMs = Math.round(performance.now() - t0);

      let fetchedIssues = [];
      try {
        const issuesRes = await fetch(
          `${apiBaseUrl}/issues?repo_url=${encodeURIComponent(cleanedUrl)}`
        );
        if (issuesRes.ok) {
          const issuesJson = await issuesRes.json();
          fetchedIssues = issuesJson.issues || [];
        }
      } catch (_) {}

      const rawOsvMap = new Map();
      (xrayPayload.dependencies?.raw_osv_results || []).forEach((item) => {
        rawOsvMap.set(item.name?.toLowerCase(), item);
      });

      const mergedPackages = (xrayPayload.dependencies?.packages || []).map((pkg) => {
        const osvMatch = rawOsvMap.get(pkg.package_name?.toLowerCase()) || {};
        return {
          package_name: pkg.package_name,
          version: osvMatch.version || 'latest',
          ecosystem: osvMatch.ecosystem || 'PyPI/npm',
          category: pkg.category || 'Core Framework',
          vulnerable: Boolean(osvMatch.vulnerable),
          cve_ids: osvMatch.cve_ids || [],
          purpose_in_repo: pkg.purpose_in_repo,
          remediation_advice: pkg.remediation_advice
        };
      });

      setRepoData({
        cached: Boolean(xrayPayload.cached),
        latencyMs,
        overview: xrayPayload.overview,
        xray: xrayPayload.xray,
        dependencies: {
          overall_health_summary:
            xrayPayload.dependencies?.overall_health_summary ||
            'Dependencies scanned via OSV.dev.',
          packages: mergedPackages
        },
        issues: fetchedIssues
      });

      if (fetchedIssues.length > 0) {
        setSelectedIssue(fetchedIssues[0]);
        setAgentQuery(
          `Investigate Issue #${fetchedIssues[0].number} ("${fetchedIssues[0].title}"): locate the root cause in the codebase, check the blast radius of impacted files, and provide a step-by-step fix.`
        );
      }

      setBackendStatus('online');
      checkBackendConnection();
      triggerToast(
        xrayPayload.cached
          ? `0-Token Commit-SHA Cache Hit (${latencyMs}ms)`
          : `Live LangChain X-Ray & OSV.dev Scan completed in ${(latencyMs / 1000).toFixed(1)}s`
      );
    } catch (err) {
      const matchKey = Object.keys(DEMO_DATA_BY_REPO).find((k) =>
        cleanedUrl.toLowerCase().includes(k.toLowerCase())
      );
      const fallback = matchKey
        ? DEMO_DATA_BY_REPO[matchKey]
        : DEMO_DATA_BY_REPO['psf/requests'];

      setRepoData(fallback);
      if (fallback.issues?.length > 0) {
        setSelectedIssue(fallback.issues[0]);
        setAgentQuery(
          `Investigate Issue #${fallback.issues[0].number} ("${fallback.issues[0].title}"): locate the exact file & line numbers, check the blast radius, and propose a unified diff.`
        );
      }
      setTelemetry((prev) => ({
        ...prev,
        total_analyses: prev.total_analyses + 1
      }));
      triggerToast(
        backendStatus === 'online'
          ? `Backend notice: ${err.message}`
          : `Loaded ${fallback.overview.full_name} (Interactive Preview — Start FastAPI on :8000 for live repos)`
      );
    } finally {
      setIsLoadingXray(false);
    }
  };

  // Handler: Run Issue-to-PR Agent with real-time Server-Sent Events (SSE) stream reader
  const handleRunIssueAgent = async () => {
    if (!agentQuery.trim() || isAgentRunning) return;
    if (traceTimerRef.current) clearInterval(traceTimerRef.current);

    setIsAgentRunning(true);
    setAgentToolSteps([]);
    setAgentFinalReport('');
    setAgentStatusMsg(`STREAMING SSE • ${repoData.overview.full_name.toUpperCase()}`);

    try {
      const response = await fetch(`${apiBaseUrl}/solve-issue`, {
        method: 'POST',
        headers: buildHeaders(),
        body: JSON.stringify({
          repo_url: `https://github.com/${repoData.overview.full_name}`,
          query: agentQuery
        })
      });

      if (!response.ok || !response.body) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const events = buffer.split('\n\n');
        buffer = events.pop() || '';

        for (const evtBlock of events) {
          const line = evtBlock
            .split('\n')
            .find((l) => l.startsWith('data: '));
          if (!line) continue;

          try {
            const payload = JSON.parse(line.slice(6));
            if (payload.type === 'status') {
              setAgentStatusMsg(payload.message.toUpperCase());
            } else if (payload.type === 'tool_step') {
              setAgentStatusMsg(`STEP 0${payload.step_number} • ${payload.tool.toUpperCase()}`);
              setAgentToolSteps((prev) => [...prev, payload]);
            } else if (payload.type === 'complete') {
              setAgentFinalReport(payload.answer || 'Investigation complete.');
              setAgentStatusMsg('COMPLETE • REPORT SYNTHESIZED');
            }
          } catch (_) {}
        }
      }

      setBackendStatus('online');
      checkBackendConnection();
    } catch (_) {
      const simulatedSteps = [
        {
          step_number: 1,
          tool: 'search_files_in_tree',
          input: { keyword: selectedIssue ? selectedIssue.labels?.[0] || 'sessions' : 'sessions' },
          preview:
            repoData.overview.full_name === 'tiangolo/fastapi'
              ? 'fastapi/routing.py\nfastapi/dependencies/utils.py\nfastapi/openapi/utils.py'
              : 'src/requests/sessions.py\nsrc/requests/cookies.py\nsrc/requests/adapters.py'
        },
        {
          step_number: 2,
          tool: 'search_code_across_repo',
          input: {
            symbol_or_func:
              repoData.overview.full_name === 'tiangolo/fastapi'
                ? 'def solve_dependencies'
                : 'def merge_environment_settings'
          },
          preview:
            repoData.overview.full_name === 'tiangolo/fastapi'
              ? 'fastapi/dependencies/utils.py [Line 542]: async def solve_dependencies('
              : 'src/requests/sessions.py [Line 758]: def merge_environment_settings(self, url, proxies, stream, verify, cert):'
        },
        {
          step_number: 3,
          tool: 'read_code_window',
          input: {
            filepath:
              repoData.overview.full_name === 'tiangolo/fastapi'
                ? 'fastapi/dependencies/utils.py'
                : 'src/requests/sessions.py',
            start_line: 540,
            end_line: 610
          },
          preview:
            repoData.overview.full_name === 'tiangolo/fastapi'
              ? '--- fastapi/dependencies/utils.py (Lines 540-610) ---\n 542 | async def solve_dependencies(*, request: Union[Request, WebSocket], dependant: Dependant, ...)'
              : '--- src/requests/sessions.py (Lines 540-610) ---\n 557 | def request(self, method, url, ...):\n 589 | settings = self.merge_environment_settings(prep.url, proxies, stream, verify, cert)'
        },
        {
          step_number: 4,
          tool: 'check_file_blast_radius',
          input: {
            filepath:
              repoData.overview.full_name === 'tiangolo/fastapi'
                ? 'fastapi/dependencies/utils.py'
                : 'src/requests/sessions.py'
          },
          preview:
            repoData.overview.full_name === 'tiangolo/fastapi'
              ? "Downstream files importing 'fastapi/dependencies/utils.py': [{'dependent_file': 'fastapi/routing.py', 'matched_import': 'fastapi/dependencies/utils'}]"
              : "Downstream files importing 'src/requests/sessions.py': [{'dependent_file': 'src/requests/api.py', 'matched_import': 'requests/sessions'}, {'dependent_file': 'src/requests/__init__.py', 'matched_import': 'sessions'}]"
        }
      ];

      let i = 0;
      traceTimerRef.current = setInterval(() => {
        if (i < simulatedSteps.length) {
          const nextStep = simulatedSteps[i];
          setAgentStatusMsg(`STEP 0${nextStep.step_number} • ${nextStep.tool.toUpperCase()}()`);
          setAgentToolSteps((prev) => [...prev, nextStep]);
          i += 1;
        } else {
          clearInterval(traceTimerRef.current);
          setAgentStatusMsg('COMPLETE • UNIFIED DIFF READY');
          setAgentFinalReport(
            `### 1. Root Cause & Surgical Code Flow Analysis (${repoData.overview.full_name})
- Query Investigated: ${agentQuery}
- Exact File & Line Window: Inspected via \`search_code_across_repo\` and \`read_code_window\` (120-line surgical window cap — 2,450 total tokens used).
- Technical Finding: The target function resolves default configuration before checking whether the caller explicitly passed an override parameter, allowing environment-level settings or exit-stack teardown to override per-call state.

### 2. Static AST Blast Radius Report
- Modifying the target module affects 2 direct downstream importers in the package tree.
- Regression test suite should target unit tests covering session/dependency lifecycle overrides.

### 3. Proposed Unified Diff Patch
\`\`\`diff
--- a/src/requests/sessions.py
+++ b/src/requests/sessions.py
@@ -762,7 +762,9 @@
-            if verify is True or verify is None:
+            # Ensure explicit caller override is preserved prior to environment fallback
+            if verify is not False and (verify is True or verify is None):
                 verify = (
                     os.environ.get("REQUESTS_CA_BUNDLE")
                     or os.environ.get("CURL_CA_BUNDLE")
+                    or verify
                 )
\`\`\``
          );
          setTelemetry((prev) => ({
            ...prev,
            issues_solved: prev.issues_solved + 1
          }));
          setIsAgentRunning(false);
        }
      }, 420);
      return;
    }

    setIsAgentRunning(false);
  };

  // Language percentage calculation
  const languageBreakdown = useMemo(() => {
    const langs = repoData.overview?.languages || {};
    const total = Object.values(langs).reduce((acc, v) => acc + v, 0) || 1;
    return Object.entries(langs).map(([name, bytes]) => ({
      name,
      bytes,
      pct: Math.max(1, Math.round((bytes / total) * 100))
    }));
  }, [repoData]);

  // Filtered dependencies
  const filteredDependencies = useMemo(() => {
    const list = repoData.dependencies?.packages || [];
    return list.filter((item) => {
      const matchesCat =
        depCategoryFilter === 'ALL' ||
        item.category?.toLowerCase() === depCategoryFilter.toLowerCase();
      const matchesStatus =
        depStatusFilter === 'ALL' ||
        (depStatusFilter === 'VULNERABLE' && item.vulnerable) ||
        (depStatusFilter === 'SAFE' && !item.vulnerable);
      return matchesCat && matchesStatus;
    });
  }, [repoData, depCategoryFilter, depStatusFilter]);

  const categories = useMemo(() => {
    const set = new Set((repoData.dependencies?.packages || []).map((p) => p.category));
    return ['ALL', ...Array.from(set)];
  }, [repoData]);

  const mermaidGraph = useMemo(
    () => parseMermaidGraph(repoData.xray?.mermaid_diagram || ''),
    [repoData]
  );

  const vulnerableCount = useMemo(
    () => (repoData.dependencies?.packages || []).filter((p) => p.vulnerable).length,
    [repoData]
  );

  // Reusable Liquid Glass surface classes (Obsidian + Specular Hairline Border + Frosted Blur)
  const glassCard =
    'backdrop-blur-2xl bg-white/[0.025] border border-white/[0.09] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),0_20px_50px_rgba(0,0,0,0.85)] rounded-2xl';
  const glassInteractive =
    'backdrop-blur-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.09] hover:border-white/[0.24] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] transition-all duration-200';

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 font-sans selection:bg-white selection:text-black relative overflow-x-hidden pb-24 lg:pb-12">
      {/* Subtle Monochrome Ambient Glass Spotlights & Architectural Dot Matrix */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-35"
        style={{
          backgroundImage:
            'radial-gradient(rgba(255, 255, 255, 0.14) 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }}
      />
      <div className="pointer-events-none fixed -top-48 left-1/2 -translate-x-1/2 w-[780px] h-[340px] bg-white/[0.07] blur-[130px] rounded-full z-0" />
      <div className="pointer-events-none fixed bottom-0 right-0 w-[450px] h-[300px] bg-zinc-400/[0.04] blur-[120px] rounded-full z-0" />

      {/* Floating Glass Toast Notification */}
      {toastMsg && (
        <div className="fixed top-20 right-4 sm:right-6 z-50 flex items-center gap-3 backdrop-blur-2xl bg-zinc-900/90 border border-white/20 text-white px-4 py-3 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.9)] text-xs font-medium tracking-wide">
          <span className="w-2 h-2 rounded-full bg-white animate-ping" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* =====================================================================
          TOP LIQUID GLASS FLOATING NAVBAR (DESKTOP & MOBILE ADAPTIVE)
      ===================================================================== */}
      <header className="sticky top-0 z-30 backdrop-blur-2xl bg-black/75 border-b border-white/[0.08]">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 flex items-center justify-between gap-2">
          {/* Monochrome Geometric Brand Emblem */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white text-black flex items-center justify-center shadow-[0_0_25px_rgba(255,255,255,0.35)] shrink-0">
              <Terminal className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold tracking-tight text-sm sm:text-base text-white">
                  REPOPILOT
                </span>
                <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-full bg-white/[0.06] text-zinc-300 border border-white/15">
                  OSV • AST • SSE
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 hidden sm:block">
                Autonomous Codebase X-Ray & Surgical Issue-to-PR Engine
              </p>
            </div>
          </div>

          {/* Center Live SQLite Telemetry Pill (Desktop) */}
          <div className="hidden xl:flex items-center gap-4 backdrop-blur-xl bg-white/[0.03] border border-white/[0.09] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] px-4 py-1.5 rounded-full text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-500 font-mono uppercase text-[10px]">Users</span>
              <span className="font-mono font-semibold text-white">
                {telemetry.registered_users}
              </span>
            </div>
            <div className="w-px h-3 bg-white/10" />
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-500 font-mono uppercase text-[10px]">Scans</span>
              <span className="font-mono font-semibold text-white">{telemetry.total_analyses}</span>
            </div>
            <div className="w-px h-3 bg-white/10" />
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-500 font-mono uppercase text-[10px]">SHA Cache</span>
              <span className="font-mono font-semibold text-white">{telemetry.unique_repos}</span>
            </div>
            <div className="w-px h-3 bg-white/10" />
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-500 font-mono uppercase text-[10px]">PR Diffs</span>
              <span className="font-mono font-semibold text-white">{telemetry.issues_solved}</span>
            </div>
          </div>

          {/* Right Controls: Command Palette, Viewport Switcher, Engine Mode, Google Auth */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Command Palette Trigger (`⌘K`) */}
            <button
              type="button"
              onClick={() => setShowCmdPalette(true)}
              className={`${glassInteractive} px-2.5 py-1.5 rounded-xl text-xs text-zinc-300 flex items-center gap-1.5 cursor-pointer`}
              title="Open Quick Command Palette (Ctrl+K / Cmd+K)"
            >
              <Command className="w-3.5 h-3.5 text-white" />
              <kbd className="hidden sm:inline-block text-[10px] font-mono bg-white/10 px-1.5 py-0.5 rounded text-zinc-200">
                ⌘K
              </kbd>
            </button>

            {/* Mobile / Desktop Frame Preview Switcher */}
            <button
              type="button"
              onClick={() =>
                setViewportMode((prev) => (prev === 'auto' ? 'mobile' : 'auto'))
              }
              className={`${glassInteractive} px-2.5 py-1.5 rounded-xl text-xs text-zinc-300 hidden sm:flex items-center gap-1.5 cursor-pointer`}
              title="Toggle Mobile Glass Preview vs Full Responsive View"
            >
              {viewportMode === 'mobile' ? (
                <>
                  <Monitor className="w-3.5 h-3.5 text-white" />
                  <span>Full View</span>
                </>
              ) : (
                <>
                  <Smartphone className="w-3.5 h-3.5 text-zinc-300" />
                  <span className="hidden lg:inline">Mobile View</span>
                </>
              )}
            </button>

            {/* Live FastAPI Status Pill */}
            <button
              type="button"
              onClick={() => checkBackendConnection()}
              className={`${glassInteractive} px-2.5 py-1.5 rounded-xl text-xs font-mono flex items-center gap-1.5 cursor-pointer`}
              title="Click to ping FastAPI GET /api/v1/stats"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  backendStatus === 'online'
                    ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                    : 'bg-white animate-pulse'
                }`}
              />
              <span className="text-[11px] text-zinc-200 hidden md:inline">
                {backendStatus === 'online' ? 'API :8000' : 'PREVIEW'}
              </span>
            </button>

            {/* AI Engine Mode (Default Server Tier vs Custom Personal Key) */}
            <button
              type="button"
              onClick={() => setShowKeyModal(true)}
              className={`${glassInteractive} px-2.5 py-1.5 rounded-xl text-xs text-zinc-200 flex items-center gap-1.5 cursor-pointer`}
              title="Configure AI Engine Mode (Server Default vs Custom Key)"
            >
              <Key className="w-3.5 h-3.5 text-zinc-300" />
              <span className="hidden md:inline">
                {keyMode === 'server' ? 'Server Free Tier' : 'Custom Key'}
              </span>
            </button>

            {/* Google / Email Login Button OR Logged-in User Profile Pill */}
            {currentUser ? (
              <div className="flex items-center gap-2 backdrop-blur-xl bg-white/[0.06] border border-white/20 pl-2 pr-1.5 py-1 rounded-xl">
                {currentUser.avatar_url ? (
                  <img
                    src={currentUser.avatar_url}
                    alt={currentUser.name}
                    className="w-5 h-5 rounded-full object-cover border border-white/30"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-white text-black font-bold text-[10px] flex items-center justify-center uppercase">
                    {currentUser.name?.slice(0, 1) || 'U'}
                  </div>
                )}
                <span className="text-xs font-medium text-white max-w-[100px] truncate hidden sm:inline">
                  {currentUser.name}
                </span>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="p-1 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowAuthModal(true)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white text-black hover:bg-zinc-200 transition flex items-center gap-1.5 shadow-[0_0_25px_rgba(255,255,255,0.25)] cursor-pointer"
              >
                <User className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Wrapper that adapts between Full Responsive Layout and 420px Mobile Glass Simulator */}
      <div
        className={
          viewportMode === 'mobile'
            ? 'max-w-[420px] mx-auto my-6 border-[6px] border-zinc-800 rounded-[40px] shadow-[0_0_90px_rgba(255,255,255,0.08)] bg-[#050505] overflow-hidden relative z-10'
            : 'relative z-10'
        }
      >
        {/* =====================================================================
            HERO COMMAND DOCK: GLASS URL INPUT + MONOCHROME REPO PILLS
        ===================================================================== */}
        <section className="max-w-7xl mx-auto px-3 sm:px-6 pt-5 sm:pt-7 pb-4">
          <div className={`${glassCard} p-4 sm:p-6`}>
            {/* Top Command Input Row */}
            <div className="flex flex-col md:flex-row gap-2.5">
              <div className="relative flex-1">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
                  <GitBranch className="w-4 h-4 text-zinc-400" />
                </div>
                <input
                  type="text"
                  value={repoInput}
                  onChange={(e) => setRepoInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAnalyzeRepo(repoInput);
                  }}
                  placeholder="https://github.com/owner/repository"
                  className="w-full pl-10 pr-4 py-3 bg-black/70 border border-white/15 rounded-xl text-xs sm:text-sm font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-white/50 focus:bg-black transition"
                />
              </div>

              <button
                type="button"
                disabled={isLoadingXray}
                onClick={() => handleAnalyzeRepo(repoInput)}
                className="px-6 py-3 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-xs sm:text-sm tracking-tight flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(255,255,255,0.22)] disabled:opacity-50 transition cursor-pointer shrink-0"
              >
                {isLoadingXray ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Scanning Tree & OSV...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 fill-black" />
                    <span>Execute X-Ray</span>
                  </>
                )}
              </button>
            </div>

            {/* Preset Repositories & Cache Hit Telemetry Strip */}
            <div className="mt-4 pt-3.5 border-t border-white/[0.07] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Horizontal scrollable presets on mobile */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
                <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 shrink-0">
                  Targets
                </span>
                {PRESET_REPOS.map((preset) => {
                  const isSelected = repoInput
                    .toLowerCase()
                    .includes(preset.label.toLowerCase());
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => handleAnalyzeRepo(preset.url)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono transition flex items-center gap-2 shrink-0 cursor-pointer ${
                        isSelected
                          ? 'bg-white text-black font-semibold shadow-[0_0_15px_rgba(255,255,255,0.25)]'
                          : 'bg-white/[0.04] hover:bg-white/[0.09] text-zinc-300 border border-white/10'
                      }`}
                    >
                      <span>{preset.label}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded ${
                          isSelected ? 'bg-black/15 text-black' : 'bg-white/5 text-zinc-400'
                        }`}
                      >
                        {preset.badge}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Commit-SHA Cache Badge */}
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-mono px-3 py-1 rounded-full bg-white/[0.05] border border-white/15 text-zinc-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  {repoData.cached
                    ? `0-TOKEN SHA CACHE • ${repoData.latencyMs}ms`
                    : `LIVE SCAN • ${repoData.latencyMs}ms`}
                </span>
                <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-black/80 border border-white/10 text-zinc-400">
                  #{repoData.overview?.latest_commit_sha?.slice(0, 7)}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================================
            BENTO REPOSITORY IDENTITY & METRICS BAR
        ===================================================================== */}
        <section className="max-w-7xl mx-auto px-3 sm:px-6 pb-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            {/* Repo Name Card */}
            <div className={`${glassCard} p-3.5 sm:p-4 col-span-2 sm:col-span-1 flex flex-col justify-between`}>
              <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-zinc-400">
                <span>Repository</span>
                <a
                  href={`https://github.com/${repoData.overview?.full_name}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-zinc-300 hover:text-white inline-flex items-center gap-0.5"
                >
                  <span>GitHub</span>
                  <ArrowUpRight className="w-3 h-3" />
                </a>
              </div>
              <div className="mt-1.5 font-bold text-sm sm:text-base text-white truncate">
                {repoData.overview?.full_name}
              </div>
              <div className="mt-1 text-[11px] text-zinc-400 truncate">
                Branch: <span className="font-mono text-zinc-200">{repoData.overview?.default_branch}</span>
              </div>
            </div>

            {/* Stars & Forks Card */}
            <div className={`${glassCard} p-3.5 sm:p-4 flex flex-col justify-between`}>
              <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">
                Community Impact
              </span>
              <div className="mt-1.5 text-base sm:text-lg font-bold font-mono text-white">
                {repoData.overview?.stars?.toLocaleString()}{' '}
                <span className="text-xs font-normal text-zinc-400">stars</span>
              </div>
              <div className="mt-1 text-[11px] font-mono text-zinc-400">
                {repoData.overview?.forks?.toLocaleString()} forks • {repoData.overview?.open_issues_count} open issues
              </div>
            </div>

            {/* OSV Security Posture Card */}
            <div
              onClick={() => setActiveTab('deps')}
              className={`${glassCard} p-3.5 sm:p-4 flex flex-col justify-between cursor-pointer hover:border-white/25 transition`}
            >
              <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-zinc-400">
                <span>OSV.dev Security</span>
                {vulnerableCount > 0 ? (
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                ) : (
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                )}
              </div>
              <div className="mt-1.5 text-base sm:text-lg font-bold font-mono text-white">
                {vulnerableCount > 0 ? (
                  <span className="text-rose-300">{vulnerableCount} Flagged CVE</span>
                ) : (
                  <span className="text-emerald-300">0 Active CVEs</span>
                )}
              </div>
              <div className="mt-1 text-[11px] text-zinc-400">
                {(repoData.dependencies?.packages || []).length} manifest packages audited
              </div>
            </div>

            {/* Language Distribution Card */}
            <div className={`${glassCard} p-3.5 sm:p-4 col-span-2 sm:col-span-1 flex flex-col justify-between`}>
              <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">
                Code Composition
              </span>
              <div className="mt-2 w-full h-1.5 rounded-full bg-white/10 overflow-hidden flex">
                {languageBreakdown.map((l, idx) => (
                  <div
                    key={l.name}
                    style={{ width: `${l.pct}%` }}
                    className={idx === 0 ? 'bg-white' : 'bg-zinc-500'}
                  />
                ))}
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] font-mono text-zinc-300">
                {languageBreakdown.slice(0, 2).map((l) => (
                  <span key={l.name}>
                    {l.name} <strong className="text-white">{l.pct}%</strong>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================================
            DESKTOP GLASS SEGMENTED MODE SWITCHER
        ===================================================================== */}
        <div className="max-w-7xl mx-auto px-3 sm:px-6 pb-4">
          <div className="backdrop-blur-2xl bg-white/[0.03] border border-white/[0.09] p-1.5 rounded-2xl flex items-center justify-between gap-1.5">
            <div className="flex items-center gap-1.5 flex-1 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => setActiveTab('xray')}
                className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-semibold tracking-wide flex items-center justify-center gap-2 transition cursor-pointer ${
                  activeTab === 'xray'
                    ? 'bg-white text-black shadow-[0_0_25px_rgba(255,255,255,0.2)]'
                    : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>01 / Architecture X-Ray</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('deps')}
                className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-semibold tracking-wide flex items-center justify-center gap-2 transition cursor-pointer ${
                  activeTab === 'deps'
                    ? 'bg-white text-black shadow-[0_0_25px_rgba(255,255,255,0.2)]'
                    : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>02 / CVE Matrix</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                    activeTab === 'deps'
                      ? 'bg-black/15 text-black'
                      : vulnerableCount > 0
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : 'bg-white/10 text-zinc-300'
                  }`}
                >
                  {vulnerableCount > 0 ? `${vulnerableCount} CVE` : 'CLEAN'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('agent')}
                className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-semibold tracking-wide flex items-center justify-center gap-2 transition cursor-pointer ${
                  activeTab === 'agent'
                    ? 'bg-white text-black shadow-[0_0_25px_rgba(255,255,255,0.2)]'
                    : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>03 / Issue-to-PR Agent</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                    activeTab === 'agent' ? 'bg-black/15 text-black' : 'bg-white/10 text-zinc-300'
                  }`}
                >
                  SSE
                </span>
              </button>
            </div>

            <div className="hidden lg:flex items-center gap-2 pr-3 text-[11px] font-mono text-zinc-400">
              <span>PATTERN:</span>
              <span className="text-white">{repoData.xray?.architectural_pattern}</span>
            </div>
          </div>
        </div>

        {/* =====================================================================
            WORKSPACE 01: ARCHITECTURE X-RAY, TOPOLOGY GRAPH & ONBOARDING
        ===================================================================== */}
        {activeTab === 'xray' && (
          <main className="max-w-7xl mx-auto px-3 sm:px-6 space-y-5">
            {/* Executive Architecture Glass Banner */}
            <div className={`${glassCard} p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4`}>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-widest text-zinc-400">
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                  <span>Structured LangChain X-Ray Synthesis</span>
                </div>
                <p className="text-sm sm:text-base text-zinc-100 leading-relaxed max-w-4xl">
                  {repoData.xray?.one_line_summary}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('agent')}
                className="self-start lg:self-center shrink-0 px-4 py-2.5 rounded-xl bg-white/[0.07] hover:bg-white text-white hover:text-black border border-white/20 text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
              >
                <span>Launch Surgical Agent</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Responsive Bento Grid: Topology Canvas + Core Modules + Onboarding */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Left 7 Columns: Monochrome Glass Topology + Execution Lifecycle */}
              <div className="lg:col-span-7 space-y-5">
                {/* Interactive Monochrome Node Topology */}
                <div className={`${glassCard} p-5`}>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                    <div>
                      <h2 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-2">
                        <GitBranch className="w-4 h-4 text-zinc-300" />
                        <span>System Execution Topology</span>
                      </h2>
                      <p className="text-xs text-zinc-400">
                        Interactive module graph generated from filtered Git tree
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowRawMermaid(!showRawMermaid)}
                        className={`${glassInteractive} px-3 py-1.5 rounded-lg text-xs font-mono text-zinc-200 cursor-pointer`}
                      >
                        {showRawMermaid ? 'Visual Nodes' : 'Mermaid Code'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopy(repoData.xray?.mermaid_diagram || '', 'mermaid')}
                        className={`${glassInteractive} px-3 py-1.5 rounded-lg text-xs font-mono text-zinc-200 flex items-center gap-1.5 cursor-pointer`}
                      >
                        {copiedId === 'mermaid' ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {showRawMermaid ? (
                    <pre className="bg-black/90 border border-white/10 rounded-xl p-4 text-xs font-mono text-zinc-200 overflow-x-auto leading-relaxed">
                      {repoData.xray?.mermaid_diagram}
                    </pre>
                  ) : (
                    <div className="bg-black/70 border border-white/[0.08] rounded-xl p-4 sm:p-6 relative overflow-hidden">
                      <div className="flex flex-col items-center space-y-2.5">
                        {mermaidGraph.nodes.map((node, idx) => {
                          const outgoing = mermaidGraph.edges
                            .filter((e) => e.from === node.id)
                            .map(
                              (e) =>
                                mermaidGraph.nodes.find((n) => n.id === e.to)?.label || e.to
                            );

                          return (
                            <React.Fragment key={node.id}>
                              <div className="w-full max-w-lg backdrop-blur-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/15 hover:border-white/35 rounded-xl px-4 py-3 flex items-center justify-between gap-3 transition shadow-[0_8px_30px_rgba(0,0,0,0.6)]">
                                <div className="flex items-center gap-3 min-w-0">
                                  <span className="w-6 h-6 rounded-lg bg-white text-black text-xs font-mono font-bold flex items-center justify-center shrink-0">
                                    {node.id}
                                  </span>
                                  <span className="text-xs sm:text-sm font-semibold text-white truncate">
                                    {node.label}
                                  </span>
                                </div>
                                {outgoing.length > 0 && (
                                  <span className="text-[11px] text-zinc-400 font-mono truncate hidden sm:inline">
                                    → {outgoing.join(', ')}
                                  </span>
                                )}
                              </div>
                              {idx < mermaidGraph.nodes.length - 1 && (
                                <div className="flex flex-col items-center">
                                  <div className="w-px h-4 bg-gradient-to-b from-white/50 to-white/10" />
                                  <div className="w-1.5 h-1.5 rounded-full bg-white/60" />
                                </div>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Request Lifecycle Timeline */}
                <div className={`${glassCard} p-5`}>
                  <h3 className="text-sm sm:text-base font-bold text-white mb-4 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-zinc-300" />
                    <span>End-to-End Request Execution Trace</span>
                  </h3>
                  <div className="space-y-2.5">
                    {(repoData.xray?.request_lifecycle || []).map((step, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-3.5 text-xs sm:text-sm text-zinc-300 bg-black/50 border border-white/[0.07] rounded-xl p-3.5"
                      >
                        <span className="w-6 h-6 rounded-lg bg-white/[0.08] border border-white/15 text-white text-xs font-mono font-semibold flex items-center justify-center shrink-0">
                          0{idx + 1}
                        </span>
                        <span className="leading-relaxed">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right 5 Columns: Core Modules + 5-Minute Contributor Setup */}
              <div className="lg:col-span-5 space-y-5">
                {/* Core Architectural Components */}
                <div className={`${glassCard} p-5`}>
                  <div className="mb-3.5">
                    <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                      <Code2 className="w-4 h-4 text-zinc-300" />
                      <span>Core Architectural Modules</span>
                    </h2>
                    <p className="text-xs text-zinc-400">
                      Tap any file chip to dispatch the surgical agent on that module
                    </p>
                  </div>

                  <div className="space-y-2.5">
                    {(repoData.xray?.core_components || []).map((comp, idx) => {
                      const isSelected = selectedComponentIdx === idx;
                      return (
                        <div
                          key={comp.name}
                          onClick={() => setSelectedComponentIdx(idx)}
                          className={`p-4 rounded-xl border transition cursor-pointer ${
                            isSelected
                              ? 'bg-white/[0.08] border-white/30 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2)]'
                              : 'bg-black/50 border-white/[0.07] hover:border-white/15'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-xs sm:text-sm text-white">
                              {comp.name}
                            </span>
                            <ChevronRight
                              className={`w-4 h-4 text-zinc-400 transition-transform ${
                                isSelected ? 'rotate-90 text-white' : ''
                              }`}
                            />
                          </div>
                          <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                            {comp.role}
                          </p>
                          <div className="flex flex-wrap gap-1.5 mt-3">
                            {(comp.key_files || []).map((file) => (
                              <button
                                key={file}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setAgentQuery(
                                    `Inspect file \`${file}\` in ${repoData.overview.full_name}: explain its core classes/functions and check its blast radius (which other files import \`${file}\`).`
                                  );
                                  setActiveTab('agent');
                                }}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.05] hover:bg-white hover:text-black border border-white/15 text-[11px] font-mono text-zinc-200 transition cursor-pointer"
                              >
                                <FileCode className="w-3 h-3" />
                                <span>{file}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 5-Minute Contributor Setup Terminal */}
                <div className={`${glassCard} p-5 space-y-4`}>
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-zinc-300" />
                      <span>5-Minute Contributor Setup</span>
                    </h2>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopy(
                          (repoData.xray?.onboarding?.setup_commands || []).join('\n'),
                          'onboarding-cmds'
                        )
                      }
                      className={`${glassInteractive} px-2.5 py-1 rounded-lg text-xs font-mono text-zinc-200 flex items-center gap-1.5 cursor-pointer`}
                    >
                      {copiedId === 'onboarding-cmds' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Shell</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {(repoData.xray?.onboarding?.prerequisites || []).map((req) => (
                      <span
                        key={req}
                        className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-white/[0.05] border border-white/15 text-zinc-200"
                      >
                        ✓ {req}
                      </span>
                    ))}
                  </div>

                  <div className="bg-black/90 border border-white/10 rounded-xl p-3.5 font-mono text-xs text-zinc-200 space-y-1.5 overflow-x-auto">
                    {(repoData.xray?.onboarding?.setup_commands || []).map((cmd, i) => (
                      <div key={i} className="flex items-center gap-2.5">
                        <span className="text-zinc-500 select-none">$</span>
                        <span className="text-zinc-100">{cmd}</span>
                      </div>
                    ))}
                  </div>

                  <div className="bg-white/[0.04] border border-white/15 rounded-xl p-3.5 text-xs text-zinc-300 leading-relaxed">
                    <strong className="text-white font-mono uppercase text-[10px] tracking-wider block mb-1">
                      Entry-Point Guidance
                    </strong>
                    {repoData.xray?.onboarding?.where_to_start}
                  </div>
                </div>
              </div>
            </div>
          </main>
        )}

        {/* =====================================================================
            WORKSPACE 02: DEPENDENCY & LIVE GOOGLE OSV.DEV CVE SECURITY MATRIX
        ===================================================================== */}
        {activeTab === 'deps' && (
          <main className="max-w-7xl mx-auto px-3 sm:px-6 space-y-5">
            {/* Security Summary & Status Filter Bar */}
            <div className={`${glassCard} p-5 flex flex-col md:flex-row md:items-center justify-between gap-4`}>
              <div className="space-y-1">
                <div className="text-[11px] font-mono uppercase tracking-widest text-zinc-400">
                  Google OSV.dev Batch Vulnerability Audit (`api.osv.dev/v1/querybatch`)
                </div>
                <p className="text-sm sm:text-base text-zinc-100">
                  {repoData.dependencies?.overall_health_summary}
                </p>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {['ALL', 'VULNERABLE', 'SAFE'].map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setDepStatusFilter(status)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-mono transition cursor-pointer ${
                      depStatusFilter === status
                        ? 'bg-white text-black font-semibold'
                        : 'bg-white/[0.04] text-zinc-400 border border-white/10 hover:text-white'
                    }`}
                  >
                    {status === 'ALL'
                      ? 'ALL'
                      : status === 'VULNERABLE'
                      ? `VULNERABLE (${vulnerableCount})`
                      : 'SAFE'}
                  </button>
                ))}
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              <span className="text-xs font-mono text-zinc-500 flex items-center gap-1 shrink-0">
                <Filter className="w-3.5 h-3.5" /> LAYER:
              </span>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setDepCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono transition shrink-0 cursor-pointer ${
                    depCategoryFilter === cat
                      ? 'bg-white/15 border border-white/40 text-white font-semibold'
                      : 'bg-white/[0.03] border border-white/10 text-zinc-400 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Responsive Dependency Glass Table */}
            <div className={`${glassCard} overflow-hidden`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 bg-black/60 text-[10px] font-mono uppercase tracking-widest text-zinc-400">
                      <th className="py-3.5 px-4">Package</th>
                      <th className="py-3.5 px-4">Layer</th>
                      <th className="py-3.5 px-4">OSV.dev Status</th>
                      <th className="py-3.5 px-4">Architectural Role</th>
                      <th className="py-3.5 px-4">Remediation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.07] text-xs sm:text-sm">
                    {filteredDependencies.map((pkg) => (
                      <tr key={pkg.package_name} className="hover:bg-white/[0.03] transition">
                        <td className="py-4 px-4 font-mono">
                          <div className="font-bold text-white">{pkg.package_name}</div>
                          <div className="text-[11px] text-zinc-400">
                            v{pkg.version} • {pkg.ecosystem || 'PyPI'}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-white/[0.05] border border-white/10 text-zinc-200">
                            {pkg.category}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          {pkg.vulnerable ? (
                            <div className="space-y-1.5">
                              <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-semibold px-2.5 py-1 rounded-full bg-rose-500/15 border border-rose-500/40 text-rose-300">
                                <AlertTriangle className="w-3 h-3" />
                                VULNERABLE
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {(pkg.cve_ids || []).map((id) => (
                                  <a
                                    key={id}
                                    href={`https://osv.dev/vulnerability/${id}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[11px] font-mono text-rose-300 underline hover:text-white"
                                  >
                                    {id}
                                  </a>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                              <ShieldCheck className="w-3.5 h-3.5" />
                              0 CVEs
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-xs text-zinc-300 max-w-md leading-relaxed">
                          {pkg.purpose_in_repo}
                        </td>
                        <td className="py-4 px-4 text-xs">
                          {pkg.remediation_advice ? (
                            <div className="bg-rose-950/30 border border-rose-500/30 rounded-xl p-2.5 font-mono text-[11px] text-rose-200">
                              {pkg.remediation_advice}
                            </div>
                          ) : (
                            <span className="text-zinc-500 font-mono text-xs">No patch needed</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </main>
        )}

        {/* =====================================================================
            WORKSPACE 03: AUTONOMOUS ISSUE-TO-PR AGENT STUDIO (SSE STREAM)
        ===================================================================== */}
        {activeTab === 'agent' && (
          <main className="max-w-7xl mx-auto px-3 sm:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* LEFT PANE (4 Cols): Open GitHub Issues Selector */}
              <div className={`lg:col-span-4 ${glassCard} p-4 sm:p-5 flex flex-col justify-between space-y-4`}>
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h2 className="text-sm font-bold text-white flex items-center gap-2">
                        <GitPullRequest className="w-4 h-4 text-zinc-300" />
                        <span>Open Repository Issues</span>
                      </h2>
                      <p className="text-xs text-zinc-400">
                        Select an issue to auto-configure the surgical agent
                      </p>
                    </div>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-white/10 text-zinc-200">
                      {(repoData.issues || []).length}
                    </span>
                  </div>

                  <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                    {(repoData.issues || []).map((iss) => {
                      const isSelected = selectedIssue?.number === iss.number;
                      return (
                        <div
                          key={iss.number}
                          onClick={() => {
                            setSelectedIssue(iss);
                            setAgentQuery(
                              `Investigate GitHub Issue #${iss.number} ("${iss.title}"): search the repository for the relevant module, read the exact line window, check the cross-file blast radius, and generate a unified diff patch.`
                            );
                          }}
                          className={`p-3.5 rounded-xl border transition cursor-pointer ${
                            isSelected
                              ? 'bg-white/[0.09] border-white/35 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2)]'
                              : 'bg-black/50 border-white/[0.07] hover:border-white/20'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 text-xs font-mono">
                            <span className="font-bold text-white">#{iss.number}</span>
                            <span className="text-zinc-500">{iss.created_at?.slice(0, 10)}</span>
                          </div>
                          <h3 className="text-xs sm:text-sm font-semibold text-zinc-100 mt-1 leading-snug">
                            {iss.title}
                          </h3>
                          <p className="text-xs text-zinc-400 mt-1.5 line-clamp-2">{iss.body}</p>
                          <div className="flex flex-wrap gap-1.5 mt-2.5">
                            {(iss.labels || []).map((lbl) => (
                              <span
                                key={lbl}
                                className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/10 text-zinc-300"
                              >
                                {lbl}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Bound Tools Specification Box */}
                <div className="p-3.5 rounded-xl bg-black/80 border border-white/10 text-xs">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-zinc-400 mb-1.5">
                    5 Bound LangChain `@tool` Functions
                  </div>
                  <div className="font-mono text-[11px] text-zinc-300 space-y-1">
                    <div>01. search_files_in_tree(keyword)</div>
                    <div>02. search_code_across_repo(symbol)</div>
                    <div>03. read_code_window(path, start, end)</div>
                    <div>04. check_file_blast_radius(path)</div>
                    <div>05. read_github_issue(number)</div>
                  </div>
                </div>
              </div>

              {/* RIGHT PANE (8 Cols): Agent Dispatch + Live SSE Trace + Formatted Diff Report */}
              <div className="lg:col-span-8 space-y-5">
                {/* Agent Query Input & Dispatch */}
                <div className={`${glassCard} p-4 sm:p-5 space-y-3.5`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] font-mono uppercase tracking-widest text-zinc-400">
                      Surgical Agent Prompt (`POST /api/v1/solve-issue`)
                    </span>
                    <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-white/[0.06] border border-white/15 text-zinc-200">
                      {agentStatusMsg}
                    </span>
                  </div>

                  <textarea
                    rows={3}
                    value={agentQuery}
                    onChange={(e) => setAgentQuery(e.target.value)}
                    className="w-full bg-black/80 border border-white/15 rounded-xl p-3.5 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-white/50 font-mono leading-relaxed"
                    placeholder="Ask the agent to investigate an issue, trace a function, or calculate blast radius..."
                  />

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="text-xs text-zinc-400 font-mono">
                      150-line surgical window cap • Groq → Gemini `.with_fallbacks()`
                    </div>
                    <button
                      type="button"
                      disabled={isAgentRunning}
                      onClick={handleRunIssueAgent}
                      className="px-5 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(255,255,255,0.25)] disabled:opacity-50 cursor-pointer transition"
                    >
                      {isAgentRunning ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Streaming SSE Trace...</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-black" />
                          <span>Dispatch Agent</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Real-Time Server-Sent Events (SSE) Tool Execution Terminal */}
                <div className={`${glassCard} p-4 sm:p-5 space-y-3`}>
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div className="flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-white" />
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                        Live SSE Tool-Call Execution Trace ({agentToolSteps.length} steps)
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-zinc-400">
                      text/event-stream
                    </span>
                  </div>

                  <div className="space-y-2.5 max-h-64 overflow-y-auto font-mono text-xs pr-1">
                    {agentToolSteps.map((step) => (
                      <div
                        key={step.step_number}
                        className="bg-black/75 border border-white/10 rounded-xl p-3 space-y-1.5"
                      >
                        <div className="flex items-center justify-between text-white">
                          <span className="font-semibold">
                            0{step.step_number} / {step.tool}(
                            <span className="text-zinc-400">{JSON.stringify(step.input)}</span>)
                          </span>
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        </div>
                        <pre className="text-[11px] text-zinc-400 whitespace-pre-wrap overflow-x-auto bg-white/[0.02] p-2.5 rounded-lg border border-white/[0.06]">
                          {step.preview}
                        </pre>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Synthesized Engineering Report & Syntax-Highlighted Diff Viewer */}
                {agentFinalReport && (
                  <div className={`${glassCard} p-5 space-y-4`}>
                    <div className="flex items-center justify-between border-b border-white/10 pb-3">
                      <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-white" />
                        <span>Engineering Root-Cause Report & Patch</span>
                      </h3>
                      <button
                        type="button"
                        onClick={() => handleCopy(agentFinalReport, 'agent-report')}
                        className={`${glassInteractive} px-3 py-1.5 rounded-lg text-xs font-mono text-zinc-200 flex items-center gap-1.5 cursor-pointer`}
                      >
                        {copiedId === 'agent-report' ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Markdown</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div>{renderEngineeringReport(agentFinalReport)}</div>
                  </div>
                )}
              </div>
            </div>
          </main>
        )}
      </div>

      {/* =====================================================================
          FLOATING LIQUID GLASS MOBILE BOTTOM NAVIGATION DOCK (< lg screens)
      ===================================================================== */}
      <nav className="fixed bottom-3 left-3 right-3 z-40 lg:hidden backdrop-blur-2xl bg-black/85 border border-white/20 rounded-2xl p-1.5 shadow-[0_15px_50px_rgba(0,0,0,0.95)] flex items-center justify-around">
        <button
          type="button"
          onClick={() => setActiveTab('xray')}
          className={`flex-1 py-2 rounded-xl flex flex-col items-center gap-1 text-[11px] font-medium transition ${
            activeTab === 'xray' ? 'bg-white text-black font-semibold' : 'text-zinc-400'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>X-Ray</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('deps')}
          className={`flex-1 py-2 rounded-xl flex flex-col items-center gap-1 text-[11px] font-medium transition ${
            activeTab === 'deps' ? 'bg-white text-black font-semibold' : 'text-zinc-400'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>CVE ({vulnerableCount})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('agent')}
          className={`flex-1 py-2 rounded-xl flex flex-col items-center gap-1 text-[11px] font-medium transition ${
            activeTab === 'agent' ? 'bg-white text-black font-semibold' : 'text-zinc-400'
          }`}
        >
          <Terminal className="w-4 h-4" />
          <span>Agent</span>
        </button>

        <button
          type="button"
          onClick={() => setShowAuthModal(true)}
          className="flex-1 py-2 rounded-xl flex flex-col items-center gap-1 text-[11px] font-medium text-zinc-400"
        >
          <User className="w-4 h-4" />
          <span>{currentUser ? currentUser.name.slice(0, 6) : 'Sign In'}</span>
        </button>
      </nav>

      {/* =====================================================================
          MODAL A: MONOCHROME LIQUID GLASS GOOGLE & EMAIL AUTHENTICATION PORTAL
      ===================================================================== */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="backdrop-blur-2xl bg-zinc-950/90 border border-white/20 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2),0_30px_90px_rgba(0,0,0,0.95)] rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-5 relative overflow-hidden max-h-[90vh] overflow-y-auto">
            {/* Ambient Top Glow */}
            <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-36 bg-white/10 blur-3xl rounded-full" />

            {/* Header */}
            <div className="flex items-start justify-between relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white text-black flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.3)]">
                  <Terminal className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white tracking-tight">
                    {authTab === 'login' ? 'Sign in to RepoPilot' : 'Create Developer Account'}
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Sync repository audits & surgical PR sessions
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAuthModal(false)}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 1-Click Continue with Google Button + Real Google OAuth Client ID Drawer */}
            <div className="space-y-3 relative z-10">
              <button
                type="button"
                disabled={isAuthLoading}
                onClick={handleGoogleSignIn}
                className="w-full py-3 px-4 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-xs sm:text-sm flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(255,255,255,0.2)] transition cursor-pointer"
              >
                {/* Official Google 'G' SVG Vector */}
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#000000"
                    d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 15.65 5 12c0-3.65 3.36-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81Z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>

              {/* Toggle to configure real Google Cloud OAuth Client ID */}
              <div className="flex items-center justify-between text-[11px] font-mono px-1">
                <span className="text-zinc-400">
                  {gsiReady ? '✓ Google SDK Ready' : 'Loading Google SDK...'}
                </span>
                <button
                  type="button"
                  onClick={() => setShowGoogleConfigDrawer(!showGoogleConfigDrawer)}
                  className="text-zinc-300 hover:text-white underline cursor-pointer"
                >
                  {showGoogleConfigDrawer ? 'Hide Google Setup' : 'Configure Google OAuth ID'}
                </button>
              </div>

              {/* Expandable Drawer: Real Google Client ID Input + Interactive Gmail Input */}
              {showGoogleConfigDrawer && (
                <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/15 space-y-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-mono text-white mb-1">
                      Option A: Real Google OAuth Client ID (Opens Official Google Popup)
                    </label>
                    <input
                      type="text"
                      value={googleClientId}
                      onChange={(e) => setGoogleClientId(e.target.value)}
                      placeholder="123456789-abc.apps.googleusercontent.com"
                      className="w-full px-3 py-2 rounded-xl bg-black border border-white/15 text-xs font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-white/50"
                    />
                    <p className="text-[10px] text-zinc-400 mt-1 leading-relaxed">
                      Add <code className="text-zinc-200">http://localhost:5173</code> under Authorized JavaScript Origins in Google Cloud Console, paste your Client ID above, and click <strong>Continue with Google</strong>.
                    </p>
                  </div>

                  <div className="pt-2 border-t border-white/10">
                    <div className="text-[11px] font-mono text-zinc-300 mb-1.5">
                      Option B: No Client ID Yet? Enter Your Real Gmail Below & Click "Continue with Google"
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={authName}
                        onChange={(e) => setAuthName(e.target.value)}
                        placeholder="Your Name"
                        className="px-3 py-2 rounded-xl bg-black border border-white/15 text-xs text-white placeholder-zinc-600"
                      />
                      <input
                        type="email"
                        value={authEmail}
                        onChange={(e) => setAuthEmail(e.target.value)}
                        placeholder="yourname@gmail.com"
                        className="px-3 py-2 rounded-xl bg-black border border-white/15 text-xs text-white placeholder-zinc-600"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 py-1">
                <div className="h-px bg-white/10 flex-1" />
                <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                  OR CONTINUE WITH EMAIL
                </span>
                <div className="h-px bg-white/10 flex-1" />
              </div>

              {/* Segmented Switcher: Sign In vs Sign Up */}
              <div className="grid grid-cols-2 p-1 rounded-xl bg-black border border-white/10 text-xs font-mono">
                <button
                  type="button"
                  onClick={() => setAuthTab('login')}
                  className={`py-2 rounded-lg transition cursor-pointer ${
                    authTab === 'login'
                      ? 'bg-white/15 text-white font-semibold'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setAuthTab('signup')}
                  className={`py-2 rounded-lg transition cursor-pointer ${
                    authTab === 'signup'
                      ? 'bg-white/15 text-white font-semibold'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  Create Account
                </button>
              </div>

              {/* Email & Password Form */}
              <form onSubmit={handleEmailAuth} className="space-y-3 pt-1">
                {authTab === 'signup' && (
                  <div>
                    <label className="block text-[11px] font-mono text-zinc-400 mb-1">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="w-3.5 h-3.5 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={authName}
                        onChange={(e) => setAuthName(e.target.value)}
                        placeholder="Aarav Sharma"
                        className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-black border border-white/15 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-white/50"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-mono text-zinc-400 mb-1">
                    Developer Email
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      placeholder="you@domain.com"
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-black border border-white/15 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-white/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-zinc-400 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-black border border-white/15 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-white/50"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isAuthLoading}
                  className="w-full py-2.5 rounded-xl bg-white/[0.08] hover:bg-white hover:text-black border border-white/20 text-white font-semibold text-xs transition cursor-pointer"
                >
                  {isAuthLoading
                    ? 'Authenticating...'
                    : authTab === 'signup'
                    ? 'Create Account & Continue'
                    : 'Sign In with Email'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 0: COMMAND PALETTE (`⌘K`) FOR FAST REPO & TAB JUMPING
      ===================================================================== */}
      {showCmdPalette && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-start justify-center pt-20 p-4">
          <div className="backdrop-blur-2xl bg-zinc-950/95 border border-white/20 rounded-2xl max-w-lg w-full p-4 space-y-3 shadow-[0_25px_70px_rgba(0,0,0,0.95)]">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <div className="flex items-center gap-2 text-xs font-mono text-zinc-300">
                <Command className="w-4 h-4 text-white" />
                <span>QUICK COMMAND PALETTE</span>
              </div>
              <button
                type="button"
                onClick={() => setShowCmdPalette(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="text-[10px] font-mono uppercase text-zinc-500 px-2">
                Switch Workspace
              </div>
              {[
                { id: 'xray', label: '01 / Architecture X-Ray & Topology' },
                { id: 'deps', label: '02 / OSV.dev CVE Dependency Matrix' },
                { id: 'agent', label: '03 / Autonomous Issue-to-PR Agent (SSE)' }
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(item.id);
                    setShowCmdPalette(false);
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-white hover:text-black text-zinc-200 font-mono transition flex items-center justify-between"
                >
                  <span>{item.label}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ))}

              <div className="text-[10px] font-mono uppercase text-zinc-500 px-2 pt-2">
                Analyze Preset Repository
              </div>
              {PRESET_REPOS.map((r) => (
                <button
                  key={r.label}
                  type="button"
                  onClick={() => {
                    setShowCmdPalette(false);
                    handleAnalyzeRepo(r.url);
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-white hover:text-black text-zinc-300 font-mono transition flex items-center justify-between"
                >
                  <span>{r.label}</span>
                  <span className="text-[10px] opacity-75">{r.badge}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 1: 2-TIER AI ENGINE MODE (SERVER DEFAULT VS OPTIONAL CUSTOM KEY)
      ===================================================================== */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="backdrop-blur-2xl bg-zinc-950/95 border border-white/20 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-white" />
                <span>AI Engine Mode & API Gateway</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowKeyModal(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 2-Tier Selector Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div
                onClick={() => setKeyMode('server')}
                className={`p-3.5 rounded-xl border cursor-pointer transition ${
                  keyMode === 'server'
                    ? 'bg-white text-black border-white font-semibold'
                    : 'bg-black/60 border-white/10 text-zinc-300 hover:border-white/30'
                }`}
              >
                <div className="text-xs font-mono uppercase">Mode 01 (Default)</div>
                <div className="text-sm font-bold mt-0.5">Server Free Tier</div>
                <p
                  className={`text-[11px] mt-1 leading-relaxed ${
                    keyMode === 'server' ? 'text-zinc-800' : 'text-zinc-400'
                  }`}
                >
                  Uses your backend `.env` Groq & Gemini keys + 0-token SHA cache. Visitors need 0 keys.
                </p>
              </div>

              <div
                onClick={() => setKeyMode('custom')}
                className={`p-3.5 rounded-xl border cursor-pointer transition ${
                  keyMode === 'custom'
                    ? 'bg-white text-black border-white font-semibold'
                    : 'bg-black/60 border-white/10 text-zinc-300 hover:border-white/30'
                }`}
              >
                <div className="text-xs font-mono uppercase">Mode 02 (Optional)</div>
                <div className="text-sm font-bold mt-0.5">Custom Personal Key</div>
                <p
                  className={`text-[11px] mt-1 leading-relaxed ${
                    keyMode === 'custom' ? 'text-zinc-800' : 'text-zinc-400'
                  }`}
                >
                  Power users can optionally supply their own free Groq/Gemini key for dedicated quota.
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-mono text-zinc-300 mb-1">
                  FastAPI Base URL
                </label>
                <input
                  type="text"
                  value={apiBaseUrl}
                  onChange={(e) => setApiBaseUrl(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-black border border-white/15 text-xs font-mono text-white"
                />
              </div>

              {keyMode === 'custom' && (
                <>
                  <div>
                    <label className="block text-xs font-mono text-zinc-300 mb-1">
                      Personal Groq API Key (`X-User-Groq-Key`)
                    </label>
                    <input
                      type="password"
                      value={userGroqKey}
                      onChange={(e) => setUserGroqKey(e.target.value)}
                      placeholder="gsk_..."
                      className="w-full px-3 py-2.5 rounded-xl bg-black border border-white/15 text-xs font-mono text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-zinc-300 mb-1">
                      Personal Gemini API Key (`X-User-Google-Key`)
                    </label>
                    <input
                      type="password"
                      value={userGoogleKey}
                      onChange={(e) => setUserGoogleKey(e.target.value)}
                      placeholder="AIza..."
                      className="w-full px-3 py-2.5 rounded-xl bg-black border border-white/15 text-xs font-mono text-white"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowKeyModal(false);
                  setShowSetupModal(true);
                }}
                className="text-xs font-mono text-zinc-400 hover:text-white underline cursor-pointer"
              >
                View VS Code Terminal Commands
              </button>
              <button
                type="button"
                onClick={() => {
                  checkBackendConnection(apiBaseUrl);
                  setShowKeyModal(false);
                  triggerToast(
                    keyMode === 'server'
                      ? 'Using Default Server Free-Tier Engine'
                      : 'Using Custom Personal API Keys'
                  );
                }}
                className="px-5 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-semibold transition cursor-pointer"
              >
                Save & Ping Backend
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 2: VS CODE STAGE 4 SETUP & CORS CONNECTION GUIDE
      ===================================================================== */}
      {showSetupModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="backdrop-blur-2xl bg-zinc-950/95 border border-white/20 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Server className="w-4 h-4 text-white" />
                <span>VS Code Local Launch & CORS Wiring</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowSetupModal(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-zinc-300 leading-relaxed">
              <div className="bg-black border border-white/10 rounded-xl p-4 space-y-1.5">
                <div className="font-mono font-semibold text-white">
                  01 / Terminal 1 — Start Stage 3 FastAPI Server (Port 8000)
                </div>
                <pre className="font-mono text-[11px] text-zinc-300 overflow-x-auto">
{`cd repopilot/backend
.\venv\Scripts\activate
uvicorn app.main:app --reload --port 8000`}
                </pre>
              </div>

              <div className="bg-black border border-white/10 rounded-xl p-4 space-y-1.5">
                <div className="font-mono font-semibold text-white">
                  02 / Terminal 2 — Start Stage 4 React + Tailwind App (Port 5173)
                </div>
                <pre className="font-mono text-[11px] text-zinc-300 overflow-x-auto">
{`cd repopilot
npm create vite@latest frontend -- --template react
cd frontend
npm install lucide-react
npm install -D tailwindcss @tailwindcss/vite
npm run dev`}
                </pre>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowSetupModal(false)}
                className="px-4 py-2 rounded-xl bg-white text-black text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
