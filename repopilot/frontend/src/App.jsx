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

const PRESET_REPOS = [
  { label: 'psf/requests', url: 'https://github.com/psf/requests', badge: 'Python HTTP SDK' },
  { label: 'tiangolo/fastapi', url: 'https://github.com/tiangolo/fastapi', badge: 'Async Web Framework' },
  { label: 'pallets/flask', url: 'https://github.com/pallets/flask', badge: 'WSGI Microframework' }
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
        'Caller invokes requests.get(url) in api.py, which opens an ephemeral Session().',
        'Session.request() constructs Request and merges request cookies and proxies with session defaults.',
        'Session.prepare_request() transforms Request into an immutable PreparedRequest.',
        'Session.send() dispatches PreparedRequest to HTTPAdapter.send().',
        'HTTPAdapter acquires a pooled connection from urllib3.PoolManager and transmits payload.',
        'SessionRedirectMixin.resolve_redirects() handles 3xx redirects and returns final Response.'
      ],
      onboarding: {
        prerequisites: ['Python 3.8+', 'pip & virtualenv', 'pytest'],
        setup_commands: [
          'git clone https://github.com/psf/requests.git && cd requests',
          'python -m venv .venv && source .venv/bin/activate',
          'pip install -e . -r requirements-dev.txt',
          'pytest tests/'
        ],
        required_env_vars: ['None required'],
        where_to_start: 'Start at src/requests/sessions.py inside Session.request() (line 557).'
      }
    },
    dependencies: {
      overall_health_summary: '4 core runtime dependencies analyzed. 0 active CVEs.',
      packages: [
        {
          package_name: 'urllib3',
          version: '1.26.18',
          ecosystem: 'PyPI',
          category: 'HTTP/Networking',
          vulnerable: false,
          cve_ids: [],
          purpose_in_repo: 'Provides connection pooling and TLS socket management.',
          remediation_advice: null
        },
        {
          package_name: 'certifi',
          version: '2024.8.30',
          ecosystem: 'PyPI',
          category: 'Auth/Security',
          vulnerable: false,
          cve_ids: [],
          purpose_in_repo: 'Root Certificates for verifying SSL/TLS certificates.',
          remediation_advice: null
        }
      ]
    },
    issues: [
      {
        number: 6792,
        title: 'Session.merge_environment_settings overrides explicit verify=False when REQUESTS_CA_BUNDLE is set',
        state: 'open',
        labels: ['bug', 'sessions'],
        created_at: '2026-09-14',
        comments_count: 6,
        body: 'When caller explicitly passes verify=False while REQUESTS_CA_BUNDLE is set, verify=False is replaced.'
      }
    ]
  }
};

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

  return { nodes: Array.from(nodeMap.values()), edges };
}

function renderEngineeringReport(reportText) {
  if (!reportText) return null;
  const parts = reportText.split(/(```diff[\s\S]*?```)/g);

  return parts.map((block, idx) => {
    if (block.startsWith('```diff')) {
      const diffLines = block.replace(/^```diff\n?/, '').replace(/```$/, '').split('\n');
      return (
        <div key={idx} className="my-4 rounded-xl overflow-hidden border border-white/15 bg-black/90">
          <div className="px-3.5 py-2 border-b border-white/10 bg-white/[0.03] flex items-center justify-between text-[11px] font-mono text-zinc-400">
            <span>UNIFIED GIT PATCH PREVIEW</span>
            <span>diff --git</span>
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
              }
              return <div key={lIdx} className={`whitespace-pre ${lineClass}`}>{line || ' '}</div>;
            })}
          </div>
        </div>
      );
    }
    return (
      <div key={idx} className="space-y-2 text-xs sm:text-sm text-zinc-300 leading-relaxed font-sans">
        {block.split('\n').map((line, lIdx) => (
          <p key={lIdx}>{line}</p>
        ))}
      </div>
    );
  });
}

export default function App() {
  const [apiBaseUrl, setApiBaseUrl] = useState(
    import.meta.env.VITE_API_BASE_URL || 'https://repopilot-backend-84on.onrender.com/api/v1'
  );
  const [backendStatus, setBackendStatus] = useState('checking');
  const [keyMode, setKeyMode] = useState('server');
  const [userGroqKey, setUserGroqKey] = useState('');
  const [userGoogleKey, setUserGoogleKey] = useState('');
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [showCmdPalette, setShowCmdPalette] = useState(false);

  // Authentication State
  const [currentUser, setCurrentUser] = useState(null);
  const [authToken, setAuthToken] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authTab, setAuthTab] = useState('login');
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // Google OAuth Client ID directly from Environment Variable (Never show to visitor)
  const googleClientId =
    import.meta.env.VITE_GOOGLE_CLIENT_ID ||
    '577042884746-6dh1g341sibctke4ihdgb4199nlqeuan.apps.googleusercontent.com';
  const [gsiReady, setGsiReady] = useState(false);

  // Viewport mode
  const [viewportMode, setViewportMode] = useState('auto');

  // Repo State
  const [repoInput, setRepoInput] = useState('https://github.com/psf/requests');
  const [activeTab, setActiveTab] = useState('xray');
  const [isLoadingXray, setIsLoadingXray] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // Telemetry Counters
  const [telemetry, setTelemetry] = useState({
    storage_engine: 'postgresql_permanent',
    registered_users: 1,
    total_analyses: 0,
    unique_repos: 0,
    issues_solved: 0
  });

  const [repoData, setRepoData] = useState(DEMO_DATA_BY_REPO['psf/requests']);
  const [selectedComponentIdx, setSelectedComponentIdx] = useState(0);
  const [showRawMermaid, setShowRawMermaid] = useState(false);

  const [depCategoryFilter, setDepCategoryFilter] = useState('ALL');
  const [depStatusFilter, setDepStatusFilter] = useState('ALL');

  // Agent State
  const [selectedIssue, setSelectedIssue] = useState(DEMO_DATA_BY_REPO['psf/requests'].issues[0]);
  const [agentQuery, setAgentQuery] = useState(
    'Investigate Issue #6792 in src/requests/sessions.py and provide a unified diff patch.'
  );
  const [isAgentRunning, setIsAgentRunning] = useState(false);
  const [agentStatusMsg, setAgentStatusMsg] = useState('IDLE • READY FOR DISPATCH');
  const [agentToolSteps, setAgentToolSteps] = useState([]);
  const [agentFinalReport, setAgentFinalReport] = useState('');
  const traceTimerRef = useRef(null);

  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('repopilot_user');
      if (savedUser) setCurrentUser(JSON.parse(savedUser));
      const savedToken = localStorage.getItem('repopilot_token');
      if (savedToken) setAuthToken(savedToken);
    } catch (_) {}

    // Load Google Identity Services dynamically
    if (typeof window !== 'undefined') {
      if (window.google?.accounts) {
        setGsiReady(true);
      } else {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => setGsiReady(true);
        document.head.appendChild(script);
      }
    }
  }, []);

  const triggerToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? null : prev));
    }, 3400);
  };

  const handleCopy = (text, id) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1800);
    } catch (_) {
      triggerToast('Copied to clipboard');
    }
  };

  const checkBackendConnection = async (customBaseUrl = apiBaseUrl) => {
    setBackendStatus('checking');
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);
      const res = await fetch(`${customBaseUrl}/stats`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const statsData = await res.json();
        setTelemetry({
          storage_engine: statsData.storage_engine || 'postgresql_permanent',
          registered_users: statsData.registered_users ?? 1,
          total_analyses: statsData.total_analyses ?? 0,
          unique_repos: statsData.unique_repos ?? 0,
          issues_solved: statsData.issues_solved ?? 0
        });
        setBackendStatus('online');
        return true;
      }
    } catch (_) {}
    setBackendStatus('demo');
    return false;
  };

  useEffect(() => {
    checkBackendConnection();
  }, []);

  // Real Google Sign In popup (Opens Google's official account chooser)
  const handleGoogleSignIn = () => {
    if (!googleClientId) {
      triggerToast('Google Client ID is not configured on the server yet');
      return;
    }

    if (typeof window !== 'undefined' && window.google?.accounts?.oauth2) {
      try {
        setIsAuthLoading(true);
        const tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: googleClientId,
          scope: 'openid email profile',
          prompt: 'select_account',
          callback: async (tokenResponse) => {
            if (tokenResponse && tokenResponse.access_token) {
              await finalizeGoogleLogin({ access_token: tokenResponse.access_token });
            } else {
              setIsAuthLoading(false);
            }
          },
          error_callback: () => {
            setIsAuthLoading(false);
            triggerToast('Google sign-in popup was cancelled');
          }
        });
        tokenClient.requestAccessToken({ prompt: 'select_account' });
      } catch (err) {
        setIsAuthLoading(false);
        triggerToast('Could not open Google Sign-In popup');
      }
    } else {
      triggerToast('Google Sign-In is initializing. You can sign in with Email below.');
    }
  };

  const finalizeGoogleLogin = async (payload) => {
    try {
      const res = await fetch(`${apiBaseUrl}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Authentication failed');

      setCurrentUser(data.user);
      if (data.token) {
        setAuthToken(data.token);
        localStorage.setItem('repopilot_token', data.token);
      }
      localStorage.setItem('repopilot_user', JSON.stringify(data.user));
      setShowAuthModal(false);
      checkBackendConnection();
      triggerToast(`Welcome, ${data.user.name}!`);
    } catch (err) {
      triggerToast(err.message);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    if (!authEmail.trim() || !authPassword.trim()) {
      triggerToast('Please enter both email and password');
      return;
    }
    if (authTab === 'signup' && !authName.trim()) {
      triggerToast('Please enter your name');
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
      if (!res.ok) throw new Error(data.detail || 'Authentication error');

      setCurrentUser(data.user);
      if (data.token) {
        setAuthToken(data.token);
        localStorage.setItem('repopilot_token', data.token);
      }
      localStorage.setItem('repopilot_user', JSON.stringify(data.user));
      setShowAuthModal(false);
      checkBackendConnection();
      triggerToast(authTab === 'signup' ? `Account created! Welcome, ${data.user.name}` : `Welcome back, ${data.user.name}!`);
    } catch (err) {
      triggerToast(err.message);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleSignOut = () => {
    setCurrentUser(null);
    setAuthToken('');
    try {
      localStorage.removeItem('repopilot_user');
      localStorage.removeItem('repopilot_token');
    } catch (_) {}
    triggerToast('Signed out of RepoPilot');
  };

  const buildHeaders = () => {
    const headers = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    if (currentUser?.email) headers['X-User-Email'] = currentUser.email;
    if (keyMode === 'custom') {
      if (userGroqKey.trim()) headers['X-User-Groq-Key'] = userGroqKey.trim();
      if (userGoogleKey.trim()) headers['X-User-Google-Key'] = userGoogleKey.trim();
    }
    return headers;
  };

  const handleAnalyzeRepo = async (targetUrl = repoInput) => {
    if (!currentUser) {
      setShowAuthModal(true);
      triggerToast('Please sign in or create an account to analyze repositories');
      return;
    }
    const cleanedUrl = targetUrl.trim();
    if (!cleanedUrl) return;

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
        const err = await xrayRes.json().catch(() => ({}));
        throw new Error(err.detail || `HTTP ${xrayRes.status}`);
      }

      const xrayPayload = await xrayRes.json();
      const latencyMs = Math.round(performance.now() - t0);

      let fetchedIssues = [];
      try {
        const issuesRes = await fetch(`${apiBaseUrl}/issues?repo_url=${encodeURIComponent(cleanedUrl)}`);
        if (issuesRes.ok) {
          const issuesJson = await issuesRes.json();
          fetchedIssues = issuesJson.issues || [];
        }
      } catch (_) {}

      setRepoData({
        cached: Boolean(xrayPayload.cached),
        latencyMs,
        overview: xrayPayload.overview,
        xray: xrayPayload.xray,
        dependencies: xrayPayload.dependencies || { overall_health_summary: 'Clean', packages: [] },
        issues: fetchedIssues
      });

      if (fetchedIssues.length > 0) {
        setSelectedIssue(fetchedIssues[0]);
        setAgentQuery(`Investigate Issue #${fetchedIssues[0].number} ("${fetchedIssues[0].title}") and propose a fix.`);
      }

      checkBackendConnection();
      triggerToast(xrayPayload.cached ? `0-Token Cache Hit (${latencyMs}ms)` : `Live X-Ray completed (${(latencyMs / 1000).toFixed(1)}s)`);
    } catch (err) {
      triggerToast(err.message);
    } finally {
      setIsLoadingXray(false);
    }
  };

  const handleRunIssueAgent = async () => {
    if (!currentUser) {
      setShowAuthModal(true);
      triggerToast('Please sign in or create an account to dispatch the Issue-to-PR Agent');
      return;
    }
    if (!agentQuery.trim() || isAgentRunning) return;

    setIsAgentRunning(true);
    setAgentToolSteps([]);
    setAgentFinalReport('');
    setAgentStatusMsg(`DISPATCHING AGENT • ${repoData.overview?.full_name?.toUpperCase()}`);

    try {
      const response = await fetch(`${apiBaseUrl}/solve-issue`, {
        method: 'POST',
        headers: buildHeaders(),
        body: JSON.stringify({
          repo_url: `https://github.com/${repoData.overview?.full_name}`,
          query: agentQuery
        })
      });

      if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`);

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
          const line = evtBlock.split('\n').find((l) => l.startsWith('data: '));
          if (!line) continue;
          try {
            const payload = JSON.parse(line.slice(6));
            if (payload.type === 'status') setAgentStatusMsg(payload.message.toUpperCase());
            else if (payload.type === 'tool_step') {
              setAgentStatusMsg(`STEP 0${payload.step_number} • ${payload.tool.toUpperCase()}`);
              setAgentToolSteps((prev) => [...prev, payload]);
            } else if (payload.type === 'complete') {
              setAgentFinalReport(payload.answer || 'Investigation complete.');
              setAgentStatusMsg('COMPLETE • REPORT GENERATED');
            }
          } catch (_) {}
        }
      }
      checkBackendConnection();
    } catch (err) {
      triggerToast(`Agent error: ${err.message}`);
    } finally {
      setIsAgentRunning(false);
    }
  };

  const mermaidGraph = useMemo(() => parseMermaidGraph(repoData.xray?.mermaid_diagram || ''), [repoData]);
  const vulnerableCount = useMemo(() => (repoData.dependencies?.packages || []).filter((p) => p.vulnerable).length, [repoData]);

  const glassCard = 'backdrop-blur-2xl bg-white/[0.025] border border-white/[0.09] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),0_20px_50px_rgba(0,0,0,0.85)] rounded-2xl';
  const glassInteractive = 'backdrop-blur-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.09] hover:border-white/[0.24] transition-all duration-200';

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 font-sans selection:bg-white selection:text-black relative overflow-x-hidden pb-24 lg:pb-12">
      {/* Background Dot Matrix */}
      <div className="pointer-events-none fixed inset-0 z-0 opacity-30" style={{ backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.12) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-20 right-4 sm:right-6 z-50 flex items-center gap-3 backdrop-blur-2xl bg-zinc-900/90 border border-white/20 text-white px-4 py-3 rounded-2xl shadow-2xl text-xs font-medium">
          <span className="w-2 h-2 rounded-full bg-white animate-ping" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Floating Navbar */}
      <header className="sticky top-0 z-30 backdrop-blur-2xl bg-black/75 border-b border-white/[0.08]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white text-black flex items-center justify-center font-bold text-sm shadow-[0_0_25px_rgba(255,255,255,0.35)] shrink-0">
              <Terminal className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold tracking-tight text-sm sm:text-base text-white">REPOPILOT</span>
                <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-full bg-white/[0.06] text-zinc-300 border border-white/15">
                  POSTGRES • AST • SSE
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 hidden sm:block">Autonomous Codebase X-Ray & Surgical Issue-to-PR Engine</p>
            </div>
          </div>

          {/* Telemetry pill */}
          <div className="hidden xl:flex items-center gap-4 backdrop-blur-xl bg-white/[0.03] border border-white/[0.09] px-4 py-1.5 rounded-full text-xs">
            <span className="text-zinc-500 font-mono text-[10px]">USERS: <strong className="text-white">{telemetry.registered_users}</strong></span>
            <div className="w-px h-3 bg-white/10" />
            <span className="text-zinc-500 font-mono text-[10px]">SCANS: <strong className="text-white">{telemetry.total_analyses}</strong></span>
            <div className="w-px h-3 bg-white/10" />
            <span className="text-zinc-500 font-mono text-[10px]">PR DIFFS: <strong className="text-white">{telemetry.issues_solved}</strong></span>
          </div>

          {/* User Auth & Controls */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => checkBackendConnection()}
              className={`${glassInteractive} px-2.5 py-1.5 rounded-xl text-xs font-mono flex items-center gap-1.5 cursor-pointer`}
            >
              <span className={`w-2 h-2 rounded-full ${backendStatus === 'online' ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-white animate-pulse'}`} />
              <span className="text-[11px] text-zinc-300 hidden md:inline">{backendStatus === 'online' ? 'API ONLINE' : 'CHECKING'}</span>
            </button>

            {currentUser ? (
              <div className="flex items-center gap-2 backdrop-blur-xl bg-white/[0.06] border border-white/20 pl-2 pr-1.5 py-1 rounded-xl">
                {currentUser.avatar_url ? (
                  <img src={currentUser.avatar_url} alt={currentUser.name} className="w-5 h-5 rounded-full object-cover border border-white/30" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-white text-black font-bold text-[10px] flex items-center justify-center uppercase">
                    {currentUser.name?.slice(0, 1) || 'U'}
                  </div>
                )}
                <span className="text-xs font-medium text-white max-w-[100px] truncate hidden sm:inline">{currentUser.name}</span>
                <button type="button" onClick={handleSignOut} className="p-1 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition cursor-pointer">
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowAuthModal(true)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white text-black hover:bg-zinc-200 transition flex items-center gap-1.5 shadow-[0_0_20px_rgba(255,255,255,0.25)] cursor-pointer"
              >
                <User className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Command Search Bar */}
        <div className={`${glassCard} p-5 space-y-4`}>
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <GitBranch className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={repoInput}
                onChange={(e) => setRepoInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAnalyzeRepo(repoInput)}
                placeholder="https://github.com/owner/repository"
                className="w-full pl-10 pr-4 py-3 bg-black/70 border border-white/15 rounded-xl text-xs sm:text-sm font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-white/50"
              />
            </div>
            <button
              type="button"
              disabled={isLoadingXray}
              onClick={() => handleAnalyzeRepo(repoInput)}
              className="px-6 py-3 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-xs sm:text-sm tracking-tight flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 cursor-pointer shrink-0"
            >
              {isLoadingXray ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 fill-black" />}
              <span>{isLoadingXray ? 'Analyzing...' : 'Scan Architecture'}</span>
            </button>
          </div>

          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/[0.08]">
            <span className="text-[11px] font-mono text-zinc-500">SAMPLE REPOS:</span>
            {PRESET_REPOS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => handleAnalyzeRepo(preset.url)}
                className="px-3 py-1 rounded-lg text-xs font-mono bg-white/[0.04] hover:bg-white/[0.09] text-zinc-300 border border-white/10 hover:border-white/30 transition cursor-pointer"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 backdrop-blur-2xl bg-white/[0.03] border border-white/[0.09] p-1.5 rounded-2xl">
          <button
            type="button"
            onClick={() => setActiveTab('xray')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${activeTab === 'xray' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'}`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>01 / Architecture X-Ray</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('agent')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${activeTab === 'agent' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'}`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>02 / Issue-to-PR Agent</span>
          </button>
        </div>

        {/* Tab 01: X-Ray */}
        {activeTab === 'xray' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-7 space-y-5">
              <div className={`${glassCard} p-5 space-y-3`}>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-zinc-300" />
                  <span>Execution Topology</span>
                </h3>
                <div className="bg-black/70 border border-white/[0.08] rounded-xl p-5 flex flex-col items-center space-y-3">
                  {mermaidGraph.nodes.map((node, i) => (
                    <React.Fragment key={node.id}>
                      <div className="w-full max-w-md bg-white/[0.04] border border-white/15 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs font-semibold text-white">
                        <span>{node.label}</span>
                        <span className="text-[10px] font-mono text-zinc-500">#{node.id}</span>
                      </div>
                      {i < mermaidGraph.nodes.length - 1 && <div className="w-px h-3 bg-white/20" />}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 space-y-5">
              <div className={`${glassCard} p-5 space-y-3`}>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-zinc-300" />
                  <span>Core Architecture Modules</span>
                </h3>
                <div className="space-y-2">
                  {(repoData.xray?.core_components || []).map((comp, idx) => (
                    <div key={comp.name} className="p-3.5 rounded-xl bg-black/50 border border-white/[0.07] space-y-1">
                      <div className="font-semibold text-xs text-white">{comp.name}</div>
                      <p className="text-[11px] text-zinc-400 leading-relaxed">{comp.role}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 02: Agent */}
        {activeTab === 'agent' && (
          <div className="space-y-5">
            <div className={`${glassCard} p-5 space-y-3.5`}>
              <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
                <span>AGENT PROMPT</span>
                <span>{agentStatusMsg}</span>
              </div>
              <textarea
                rows={3}
                value={agentQuery}
                onChange={(e) => setAgentQuery(e.target.value)}
                className="w-full bg-black/80 border border-white/15 rounded-xl p-3.5 text-xs sm:text-sm text-white font-mono placeholder-zinc-500 focus:outline-none focus:border-white/50"
                placeholder="Ask the agent to investigate an issue or write a fix..."
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={isAgentRunning}
                  onClick={handleRunIssueAgent}
                  className="px-5 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-xs flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isAgentRunning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-black" />}
                  <span>{isAgentRunning ? 'Streaming Agent Steps...' : 'Dispatch Agent'}</span>
                </button>
              </div>
            </div>

            {agentToolSteps.length > 0 && (
              <div className={`${glassCard} p-5 space-y-2`}>
                <div className="text-xs font-mono text-white font-bold">TOOL EXECUTION TRACE</div>
                <div className="space-y-2 max-h-60 overflow-y-auto font-mono text-xs">
                  {agentToolSteps.map((step, idx) => (
                    <div key={idx} className="bg-black/75 border border-white/10 rounded-xl p-3 space-y-1">
                      <div className="text-emerald-400 font-semibold">{step.tool}()</div>
                      <div className="text-[11px] text-zinc-400">{step.preview}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {agentFinalReport && (
              <div className={`${glassCard} p-5 space-y-3`}>
                <div className="text-sm font-bold text-white flex items-center justify-between">
                  <span>Surgical Report & Patch</span>
                  <button type="button" onClick={() => handleCopy(agentFinalReport, 'report')} className="text-xs font-mono text-zinc-400 hover:text-white">
                    {copiedId === 'report' ? 'Copied' : 'Copy'}
                  </button>
                </div>
                {renderEngineeringReport(agentFinalReport)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* =====================================================================
          CLEAN AUTH MODAL (REAL USERS ONLY — NO DEBUG DRAWERS)
      ===================================================================== */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="backdrop-blur-2xl bg-zinc-950/95 border border-white/20 shadow-[0_30px_90px_rgba(0,0,0,0.95)] rounded-3xl max-w-sm w-full p-6 sm:p-7 space-y-5 relative">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  {authTab === 'login' ? 'Sign in to RepoPilot' : 'Create an Account'}
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Save your repository audits and issue fixes
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAuthModal(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 1-Click Official Google Button */}
            <button
              type="button"
              disabled={isAuthLoading}
              onClick={handleGoogleSignIn}
              className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-xs flex items-center justify-center gap-2.5 shadow-lg transition cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#000000"
                  d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 15.65 5 12c0-3.65 3.36-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81Z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            <div className="flex items-center gap-3 py-0.5">
              <div className="h-px bg-white/10 flex-1" />
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">OR EMAIL</span>
              <div className="h-px bg-white/10 flex-1" />
            </div>

            {/* Tab switch */}
            <div className="grid grid-cols-2 p-1 rounded-xl bg-black border border-white/10 text-xs font-mono">
              <button
                type="button"
                onClick={() => setAuthTab('login')}
                className={`py-1.5 rounded-lg transition cursor-pointer ${authTab === 'login' ? 'bg-white/15 text-white font-semibold' : 'text-zinc-500'}`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setAuthTab('signup')}
                className={`py-1.5 rounded-lg transition cursor-pointer ${authTab === 'signup' ? 'bg-white/15 text-white font-semibold' : 'text-zinc-500'}`}
              >
                Sign Up
              </button>
            </div>

            {/* Email form */}
            <form onSubmit={handleEmailAuth} className="space-y-3">
              {authTab === 'signup' && (
                <div>
                  <label className="block text-[11px] font-mono text-zinc-400 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    placeholder="Your Name"
                    className="w-full px-3 py-2 rounded-xl bg-black border border-white/15 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-white/50"
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-mono text-zinc-400 mb-1">Email</label>
                <input
                  type="email"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="name@domain.com"
                  className="w-full px-3 py-2 rounded-xl bg-black border border-white/15 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-white/50"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-zinc-400 mb-1">Password</label>
                <input
                  type="password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 rounded-xl bg-black border border-white/15 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-white/50"
                />
              </div>

              <button
                type="submit"
                disabled={isAuthLoading}
                className="w-full py-2.5 rounded-xl bg-white/[0.08] hover:bg-white hover:text-black border border-white/20 text-white font-semibold text-xs transition cursor-pointer mt-1"
              >
                {isAuthLoading ? 'Authenticating...' : authTab === 'signup' ? 'Create Account' : 'Sign In'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
