'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from '@xyflow/react';
import dagre from '@dagrejs/dagre';
import {
  Activity,
  Box,
  CheckCircle2,
  Cloud,
  Database,
  GitBranch,
  GitCommitHorizontal,
  Maximize2,
  Minimize2,
  Network,
  RefreshCw,
  RotateCw,
  Server,
  TerminalSquare,
  Timer,
  Waypoints,
  XCircle,
  X,
} from 'lucide-react';
import {
  fetchInfrastructureDeployments,
  fetchInfrastructureTopology,
  fetchInfrastructureLogs,
  restartInfrastructureNode,
  watchInfrastructureDeployments,
  watchInfrastructureTopology,
  type InfrastructureDeploymentsOverview,
  type InfrastructureLogs,
  type InfrastructureNode,
  type InfrastructureStatus,
  type InfrastructureTopology,
} from '@/lib/api';

type FlowNode = Node<{ item: InfrastructureNode }, 'infrastructure'>;
type ViewMode = 'infrastructure' | 'traffic';

const statusStyles: Record<InfrastructureStatus, { dot: string; text: string; border: string; label: string }> = {
  running: { dot: 'bg-emerald-500', text: 'text-emerald-700', border: 'border-emerald-200', label: 'Operativo' },
  degraded: { dot: 'bg-amber-500', text: 'text-amber-700', border: 'border-amber-300', label: 'Degradado' },
  stopped: { dot: 'bg-red-500', text: 'text-red-700', border: 'border-red-300', label: 'Detenido' },
  unknown: { dot: 'bg-zinc-400', text: 'text-zinc-600', border: 'border-zinc-300', label: 'Desconocido' },
};

const kindLabels: Record<InfrastructureNode['kind'], string> = {
  endpoint: 'Puerta de entrada', ingress: 'Enrutador', server: 'Servidor', service: 'Servicio interno', workload: 'Aplicacion', database: 'Datos',
};

const kindStyles: Record<InfrastructureNode['kind'], { accent: string; icon: string; surface: string }> = {
  endpoint: { accent: 'bg-cyan-500', icon: 'text-cyan-700', surface: 'bg-cyan-50' },
  ingress: { accent: 'bg-blue-500', icon: 'text-blue-700', surface: 'bg-blue-50' },
  service: { accent: 'bg-violet-500', icon: 'text-violet-700', surface: 'bg-violet-50' },
  workload: { accent: 'bg-amber-500', icon: 'text-amber-700', surface: 'bg-amber-50' },
  server: { accent: 'bg-emerald-500', icon: 'text-emerald-700', surface: 'bg-emerald-50' },
  database: { accent: 'bg-rose-500', icon: 'text-rose-700', surface: 'bg-rose-50' },
};

const detailLabels: Record<string, string> = {
  provider: 'Proveedor', publicIp: 'IP publica', protocol: 'Protocolo', tls: 'TLS', namespace: 'Espacio', hosts: 'Hosts',
  addresses: 'Direcciones', routes: 'Rutas', role: 'Funcion', hostname: 'Host', internalIp: 'IP interna', externalIp: 'IP externa',
  providerId: 'ID proveedor', cpu: 'CPU total', memory: 'Memoria total', allocatableCpu: 'CPU disponible',
  allocatableMemory: 'Memoria disponible', pods: 'Pods', kubelet: 'Kubelet', os: 'Sistema', createdAt: 'Creado', type: 'Tipo',
  desiredReplicas: 'Replicas deseadas', readyReplicas: 'Replicas listas', runningPods: 'Pods ejecutandose', images: 'Imagenes',
  restarts: 'Reinicios', scheduledNodes: 'Servidores', clusterIp: 'IP del servicio', externalName: 'Nombre externo', ports: 'Puertos', selector: 'Selector',
};

function KindIcon({ kind, className = 'size-4' }: { kind: InfrastructureNode['kind']; className?: string }) {
  const Icon = kind === 'endpoint' ? Cloud : kind === 'ingress' ? Network : kind === 'server' ? Server : kind === 'database' ? Database : kind === 'service' ? Waypoints : Box;
  return <Icon className={className} aria-hidden="true" />;
}

function InfrastructureNodeCard({ data, selected }: NodeProps<FlowNode>) {
  const { item } = data;
  const status = statusStyles[item.status];
  const kind = kindStyles[item.kind];

  return (
    <div className={`relative min-h-24 w-60 overflow-hidden rounded-md border bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${status.border} ${selected ? 'ring-2 ring-ronda-gold ring-offset-2' : ''}`}>
      <div className={`absolute inset-x-0 top-0 h-1 ${kind.accent}`} />
      <Handle type="target" position={Position.Top} className="!size-2 !border-0 !bg-ronda-muted" />
      <div className="flex items-start gap-3 px-3 py-4">
        <div className={`grid size-10 shrink-0 place-items-center rounded-md ${kind.surface} ${kind.icon}`}>
          <KindIcon kind={item.kind} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-semibold uppercase text-ronda-muted">{kindLabels[item.kind]}</span>
            <span className="flex items-center gap-1.5 text-[10px] font-semibold">
              <span className={`size-2 shrink-0 rounded-full ${status.dot}`} />
              <span className={status.text}>{status.label}</span>
            </span>
          </div>
          <p className="mt-1 truncate text-sm font-semibold text-ronda-text">{item.label}</p>
          <p className="mt-0.5 truncate text-xs text-ronda-muted">{item.subtitle}</p>
          {(item.details.timer || item.details.deployAlert) && (
            <p className={`mt-2 inline-flex max-w-full items-center gap-1 rounded px-2 py-1 text-[11px] font-semibold text-white ${item.details.deployAlert ? 'bg-red-700' : 'bg-ronda-coffee'}`}>
              {item.details.deployAlert ? <XCircle className="size-3 shrink-0" aria-hidden="true" /> : <Timer className="size-3 shrink-0" aria-hidden="true" />}
              <span className="truncate">{String(item.details.deployAlert ?? item.details.timer)}</span>
            </p>
          )}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!size-2 !border-0 !bg-ronda-muted" />
    </div>
  );
}

const nodeTypes = { infrastructure: InfrastructureNodeCard };

const runLabels: Record<string, string> = {
  queued: 'En cola',
  in_progress: 'Construyendo',
  completed: 'Completado',
};

const conclusionLabels: Record<string, string> = {
  success: 'Publicado',
  failure: 'Fallido',
  cancelled: 'Cancelado',
  skipped: 'Saltado',
};

function deploymentState(deployments: InfrastructureDeploymentsOverview | null) {
  const run = deployments?.latestRun;
  if (!deployments) return { label: 'Sin datos', tone: 'unknown' as const };
  if (run?.status && run.status !== 'completed') return { label: runLabels[run.status] ?? run.status, tone: 'deploying' as const };
  if (run?.conclusion === 'success' && deployments.health.status === 'healthy') return { label: 'Operativo', tone: 'success' as const };
  if (run?.conclusion === 'failure') return { label: 'Build fallida', tone: 'error' as const };
  if (deployments.health.status === 'unhealthy') return { label: 'Healthcheck fallando', tone: 'error' as const };
  return { label: run?.conclusion ? conclusionLabels[run.conclusion] ?? run.conclusion : 'Desconocido', tone: 'unknown' as const };
}

function formatDuration(seconds: number | null) {
  if (seconds == null) return 'en curso';
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}m ${rest}s`;
}

function liveRunDurationSeconds(run: InfrastructureDeploymentsOverview['latestRun'], now: number) {
  if (!run) return null;
  if (run.status === 'completed') return run.durationSeconds;
  const startedAt = Date.parse(run.createdAt);
  if (Number.isNaN(startedAt)) return null;
  return Math.max(0, Math.floor((now - startedAt) / 1000));
}

function formatTime(value: string | null | undefined) {
  if (!value) return '—';
  return new Date(value).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function DeploymentsPanel({ deployments, loading, onRefresh }: {
  deployments: InfrastructureDeploymentsOverview | null;
  loading: boolean;
  onRefresh: () => void;
}) {
  const state = deploymentState(deployments);
  const latest = deployments?.latestRun ?? null;
  const toneClass = state.tone === 'success'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
    : state.tone === 'deploying'
      ? 'border-blue-200 bg-blue-50 text-blue-800'
      : state.tone === 'error'
        ? 'border-red-200 bg-red-50 text-red-800'
        : 'border-ronda-border bg-white text-ronda-muted';
  const StateIcon = state.tone === 'success' ? CheckCircle2 : state.tone === 'error' ? XCircle : RefreshCw;

  return (
    <section className="shrink-0 rounded-md border border-ronda-border bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <GitBranch className="size-4 text-ronda-coffee" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-ronda-text">Deploy automático API</h2>
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[11px] font-semibold ${toneClass}`}>
              <StateIcon className={`size-3.5 ${state.tone === 'deploying' || loading ? 'animate-spin' : ''}`} aria-hidden="true" />
              {state.label}
            </span>
          </div>
          <p className="mt-1 text-xs text-ronda-muted">
            {deployments ? `${deployments.repository} · ${deployments.workflow} · ${deployments.branch}` : 'Esperando estado de GitHub/Kubernetes'}
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="flex min-h-9 items-center gap-2 rounded-md border border-ronda-border bg-white px-3 text-xs font-semibold text-ronda-coffee transition hover:bg-ronda-bg disabled:opacity-50"
        >
          <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
          Actualizar deploy
        </button>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-[1.25fr_1fr_1fr]">
        <div className="rounded-md border border-ronda-border bg-ronda-bg/40 p-3">
          <p className="text-[11px] font-semibold uppercase text-ronda-muted">Último workflow</p>
          {latest ? (
            <>
              <div className="mt-2 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ronda-text">{latest.commitMessage}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ronda-muted">
                    <span className="inline-flex items-center gap-1"><GitBranch className="size-3" />{latest.branch}</span>
                    <span className="inline-flex items-center gap-1"><GitCommitHorizontal className="size-3" />{latest.commitShortSha}</span>
                    <span className="inline-flex items-center gap-1"><Timer className="size-3" />{formatDuration(latest.durationSeconds)}</span>
                  </div>
                </div>
                <a href={latest.url} target="_blank" rel="noreferrer" className="shrink-0 text-[11px] font-semibold text-ronda-coffee hover:underline">
                  Ver run
                </a>
              </div>
              <div className="mt-3 grid gap-1.5">
                {latest.jobs.map((job) => (
                  <div key={job.id} className="flex items-center justify-between gap-3 rounded border border-white bg-white px-2 py-1.5 text-[11px]">
                    <span className="truncate font-medium text-ronda-text">{job.name}</span>
                    <span className={job.status === 'completed' && job.conclusion === 'success' ? 'text-emerald-700' : job.status === 'completed' && job.conclusion ? 'text-red-700' : 'text-blue-700'}>
                      {job.status === 'completed' ? conclusionLabels[job.conclusion ?? ''] ?? job.conclusion ?? 'completado' : runLabels[job.status] ?? job.status}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="mt-2 text-xs text-ronda-muted">{deployments?.github.detail ?? 'No hay runs disponibles.'}</p>
          )}
        </div>

        <div className="rounded-md border border-ronda-border bg-ronda-bg/40 p-3">
          <p className="text-[11px] font-semibold uppercase text-ronda-muted">Versión activa</p>
          <p className="mt-2 truncate text-sm font-semibold text-ronda-text">{deployments?.activeImage ?? '—'}</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {(deployments?.runtime ?? []).map((item) => (
              <div key={item.name} className="rounded border border-white bg-white p-2">
                <p className="text-[11px] font-semibold text-ronda-text">{item.name}</p>
                <p className="mt-1 text-[11px] text-ronda-muted">{item.readyReplicas}/{item.desiredReplicas} listas</p>
                <p className="mt-0.5 text-[10px] text-ronda-muted">maxUnavailable {item.strategy.maxUnavailable ?? '—'}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-md border border-ronda-border bg-ronda-bg/40 p-3">
          <p className="text-[11px] font-semibold uppercase text-ronda-muted">Healthcheck</p>
          <div className="mt-2 flex items-center gap-2">
            <span className={`size-2 rounded-full ${deployments?.health.status === 'healthy' ? 'bg-emerald-500' : deployments?.health.status === 'unhealthy' ? 'bg-red-500' : 'bg-amber-500'}`} />
            <p className="text-sm font-semibold text-ronda-text">{deployments?.health.status === 'healthy' ? 'Healthy' : deployments?.health.status === 'unhealthy' ? 'Unhealthy' : 'Unknown'}</p>
          </div>
          <p className="mt-2 truncate text-[11px] text-ronda-muted">{deployments?.healthcheckUrl ?? '—'}</p>
          <p className="mt-1 text-[11px] text-ronda-muted">
            {deployments?.health.latencyMs != null ? `${deployments.health.latencyMs}ms` : 'sin latencia'} · {formatTime(deployments?.health.checkedAt)}
          </p>
        </div>
      </div>
    </section>
  );
}

function miniMapNodeColor(node: Node) {
  const status = (node.data as FlowNode['data']).item.status;
  if (status === 'running') return '#10b981';
  if (status === 'degraded') return '#f59e0b';
  if (status === 'stopped') return '#ef4444';
  return '#a1a1aa';
}

function deploymentGraph(deployments: InfrastructureDeploymentsOverview | null, now: number): { nodes: InfrastructureNode[]; edges: InfrastructureTopology['edges'] } {
  if (!deployments) return { nodes: [], edges: [] };

  const state = deploymentState(deployments);
  const run = deployments.latestRun;
  const durationSeconds = liveRunDurationSeconds(run, now);
  const timer = run && run.status !== 'completed' ? `${formatDuration(durationSeconds)} transcurridos` : null;
  const deployAlert = run?.status === 'completed' && run.conclusion && run.conclusion !== 'success'
    ? conclusionLabels[run.conclusion] ?? run.conclusion
    : null;
  const status: InfrastructureStatus = state.tone === 'success' ? 'running' : state.tone === 'error' ? 'stopped' : state.tone === 'deploying' ? 'degraded' : 'unknown';
  const jobs = run?.jobs.map((job) => `${job.name}: ${job.status === 'completed' ? job.conclusion ?? 'completed' : job.status}`).join(' | ') ?? null;
  const runtime = deployments.runtime.map((item) => `${item.name} ${item.readyReplicas}/${item.desiredReplicas}`).join(' | ') || null;
  const imageLabel = deployments.activeCommitShortSha ? `development-${deployments.activeCommitShortSha}` : 'GHCR image';

  return {
    nodes: [
      {
        id: 'deploy:actions',
        kind: 'workload',
        label: 'GitHub Actions',
        subtitle: [state.label, deployments.branch, timer].filter(Boolean).join(' / '),
        status,
        layer: 1,
        details: {
          repository: deployments.repository,
          workflow: deployments.workflow,
          branch: deployments.branch,
          run: run?.id ?? null,
          commit: run?.commitShortSha ?? deployments.activeCommitShortSha,
          message: run?.commitMessage ?? null,
          actor: run?.actor ?? null,
          timer,
          deployAlert,
          jobs,
          updatedAt: run?.updatedAt ?? null,
        },
      },
      {
        id: 'deploy:image',
        kind: 'service',
        label: imageLabel,
        subtitle: 'Imagen publicada en GHCR',
        status: deployments.activeImage ? 'running' : 'unknown',
        layer: 2,
        details: {
          image: deployments.activeImage,
          activeCommit: deployments.activeCommitShortSha,
          runtime,
        },
      },
      {
        id: 'deploy:health',
        kind: 'endpoint',
        label: 'Healthcheck API',
        subtitle: deployments.health.status === 'healthy' ? `${deployments.health.latencyMs ?? '?'}ms` : deployments.health.status,
        status: deployments.health.status === 'healthy' ? 'running' : deployments.health.status === 'unhealthy' ? 'stopped' : 'unknown',
        layer: 4,
        details: {
          url: deployments.healthcheckUrl,
          checkedAt: deployments.health.checkedAt,
          latencyMs: deployments.health.latencyMs,
          detail: deployments.health.detail,
        },
      },
    ],
    edges: [
      { id: 'deploy:actions-image', source: 'deploy:actions', target: 'deploy:image', label: run?.status === 'completed' ? 'build OK' : 'building' },
      { id: 'deploy:image-public', source: 'deploy:image', target: 'workload:ronda/api-public', label: 'rollout' },
      { id: 'deploy:image-core', source: 'deploy:image', target: 'workload:ronda/api-core', label: 'rollout' },
      { id: 'deploy:public-health', source: 'workload:ronda/api-public', target: 'deploy:health', label: 'health' },
      { id: 'deploy:core-health', source: 'workload:ronda/api-core', target: 'deploy:health', label: 'health' },
    ],
  };
}

function topologyForMode(topology: InfrastructureTopology, mode: ViewMode, deployments: InfrastructureDeploymentsOverview | null, now: number) {
  const deploy = deploymentGraph(deployments, now);
  if (mode === 'traffic') {
    const nodes = [...topology.nodes, ...deploy.nodes];
    const nodeIds = new Set(nodes.map((node) => node.id));
    return { nodes, edges: [...topology.edges, ...deploy.edges].filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target)) };
  }

  const nodes = [...topology.nodes.filter((node) => node.kind !== 'service'), ...deploy.nodes];
  const nodeIds = new Set(nodes.map((node) => node.id));
  const control = nodes.find((node) => node.kind === 'server' && node.details.role === 'control-plane');
  const ingress = nodes.find((node) => node.kind === 'ingress');
  const edges = [...topology.edges
    .filter((edge) => edge.label === 'HTTPS' || edge.label === 'gestiona' || edge.label === 'corre en')
    .map((edge) => edge.label === 'corre en'
      ? { ...edge, id: `infra:${edge.id}`, source: edge.target, target: edge.source, label: 'ejecuta' }
      : edge), ...deploy.edges]
    .filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target));

  if (control && ingress) {
    edges.push({ id: 'infra:ingress-control', source: ingress.id, target: control.id, label: 'orquesta' });
  }
  return { nodes, edges };
}

function layoutTopology(topology: InfrastructureTopology, mode: ViewMode, deployments: InfrastructureDeploymentsOverview | null, now: number): { nodes: FlowNode[]; edges: Edge[] } {
  const visible = topologyForMode(topology, mode, deployments, now);
  const graph = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  graph.setGraph({ rankdir: 'TB', ranksep: 110, nodesep: 54, edgesep: 24, marginx: 40, marginy: 40, acyclicer: 'greedy', ranker: 'network-simplex' });
  for (const item of visible.nodes) graph.setNode(item.id, { width: 240, height: 96 });
  for (const edge of visible.edges) graph.setEdge(edge.source, edge.target);
  dagre.layout(graph);

  const flowNodes: FlowNode[] = visible.nodes.map((item) => {
    const position = graph.node(item.id) as { x: number; y: number };
    return {
      id: item.id,
      type: 'infrastructure',
      data: { item },
      position: { x: position.x - 120, y: position.y - 48 },
    };
  });

  const flowEdges: Edge[] = visible.edges.map((edge) => ({
    ...edge,
    type: 'smoothstep',
    animated: edge.label === 'HTTPS' || edge.id.startsWith('deploy:'),
    markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14, color: '#8b8276' },
    style: { stroke: '#a79d90', strokeWidth: 1.7 },
    labelStyle: { fill: '#756e63', fontSize: 10, fontWeight: 600 },
    labelBgStyle: { fill: '#faf7f0', fillOpacity: 0.92 },
  }));

  return { nodes: flowNodes, edges: flowEdges };
}

function CanvasContent({ initialTopology, initialDeployments }: { initialTopology: InfrastructureTopology; initialDeployments: InfrastructureDeploymentsOverview | null }) {
  const [topology, setTopology] = useState(initialTopology);
  const [deployments, setDeployments] = useState<InfrastructureDeploymentsOverview | null>(initialDeployments);
  const [loadingDeployments, setLoadingDeployments] = useState(false);
  const [deploymentsConnected, setDeploymentsConnected] = useState(false);
  const [selected, setSelected] = useState<InfrastructureNode | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [watchConnected, setWatchConnected] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('infrastructure');
  const [logs, setLogs] = useState<InfrastructureLogs | null>(null);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [confirmRestart, setConfirmRestart] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [logsExpanded, setLogsExpanded] = useState(false);
  const [activeLogIndex, setActiveLogIndex] = useState(0);
  const [clockNow, setClockNow] = useState(() => Date.now());
  const { fitView } = useReactFlow();
  const deployInProgress = Boolean(deployments?.latestRun && deployments.latestRun.status !== 'completed');
  const graph = useMemo(() => layoutTopology(topology, viewMode, deployments, clockNow), [topology, viewMode, deployments, clockNow]);

  const refreshDeployments = useCallback(async (manual = false) => {
    if (manual) setLoadingDeployments(true);
    try {
      setDeployments(await fetchInfrastructureDeployments());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo actualizar el deploy');
    } finally {
      if (manual) setLoadingDeployments(false);
    }
  }, []);

  const refresh = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const next = await fetchInfrastructureTopology();
      setTopology(next);
      setSelected((current) => current ? next.nodes.find((node) => node.id === current.id) ?? null : null);
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo actualizar');
    } finally {
      if (manual) setRefreshing(false);
    }
  }, []);

  useEffect(() => watchInfrastructureTopology((next) => {
    setTopology(next);
    setSelected((current) => current ? next.nodes.find((node) => node.id === current.id) ?? null : null);
    setError(null);
  }, setWatchConnected), []);

  useEffect(() => watchInfrastructureDeployments((next) => {
    setDeployments(next);
    setClockNow(Date.now());
    setError(null);
  }, setDeploymentsConnected), []);

  useEffect(() => {
    if (!deployInProgress) return;
    const timer = window.setInterval(() => setClockNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [deployInProgress]);

  useEffect(() => {
    if (!selected?.id.startsWith('deploy:')) return;
    const nextSelected = graph.nodes.find((node) => node.id === selected.id)?.data.item;
    if (nextSelected) setSelected(nextSelected);
  }, [graph.nodes, selected?.id]);

  const selectNode = useCallback((node: InfrastructureNode | null) => {
    setSelected(node);
    setLogs(null);
    setLogsExpanded(false);
    setActiveLogIndex(0);
    setConfirmRestart(false);
    setActionMessage(null);
  }, []);

  const loadLogs = useCallback(async () => {
    if (!selected) return;
    setLoadingLogs(true);
    setActionMessage(null);
    try {
      setLogs(await fetchInfrastructureLogs(selected.id));
      setActiveLogIndex(0);
    } catch (reason) {
      setActionMessage(reason instanceof Error ? reason.message : 'No se pudieron cargar los logs');
    } finally {
      setLoadingLogs(false);
    }
  }, [selected]);

  const restartSelected = useCallback(async () => {
    if (!selected) return;
    setRestarting(true);
    setActionMessage(null);
    try {
      const result = await restartInfrastructureNode(selected.id);
      setConfirmRestart(false);
      setActionMessage(`Reinicio iniciado para ${result.workloads.length} carga${result.workloads.length === 1 ? '' : 's'}`);
    } catch (reason) {
      setActionMessage(reason instanceof Error ? reason.message : 'No se pudo iniciar el reinicio');
    } finally {
      setRestarting(false);
    }
  }, [selected]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <header className="flex shrink-0 flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="size-5 text-ronda-success" aria-hidden="true" />
            <h1 className="text-2xl font-semibold text-ronda-text">Infraestructura</h1>
          </div>
          <p className="mt-1 text-sm text-ronda-muted">Mapa vivo de {topology.cluster.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-ronda-border bg-white p-1">
            <button
              type="button"
              onClick={() => setViewMode('infrastructure')}
              className={`flex min-h-8 items-center gap-2 rounded px-2.5 text-xs font-semibold transition ${viewMode === 'infrastructure' ? 'bg-ronda-coffee text-white' : 'text-ronda-muted hover:bg-ronda-bg'}`}
            >
              <Server className="size-3.5" aria-hidden="true" />Infraestructura
            </button>
            <button
              type="button"
              onClick={() => setViewMode('traffic')}
              className={`flex min-h-8 items-center gap-2 rounded px-2.5 text-xs font-semibold transition ${viewMode === 'traffic' ? 'bg-ronda-coffee text-white' : 'text-ronda-muted hover:bg-ronda-bg'}`}
            >
              <Network className="size-3.5" aria-hidden="true" />Trafico
            </button>
          </div>
          <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
            <Server className="size-4" aria-hidden="true" />
            {topology.cluster.readyServerCount}/{topology.cluster.serverCount} servidores
          </div>
          <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
            <Box className="size-4" aria-hidden="true" />
            {topology.cluster.runningWorkloadCount} aplicaciones
          </div>
          <div className="flex items-center gap-2 px-2 text-xs text-ronda-muted">
            <span className={`size-2 rounded-full ${watchConnected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            {watchConnected ? 'Cambios en directo' : 'Reconectando'}
          </div>
          <div className="flex items-center gap-2 px-2 text-xs text-ronda-muted">
            <span className={`size-2 rounded-full ${deploymentsConnected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            {deploymentsConnected ? 'Deploys en directo' : 'Deploys reconectando'}
          </div>
          <button
            type="button"
            onClick={() => {
              void refresh(true);
              void refreshDeployments(true);
            }}
            disabled={refreshing || loadingDeployments}
            title="Actualizar topologia"
            className="grid size-9 place-items-center border border-ronda-border bg-white text-ronda-coffee transition hover:bg-ronda-bg disabled:opacity-50"
          >
            <RefreshCw className={`size-4 ${refreshing || loadingDeployments ? 'animate-spin' : ''}`} aria-hidden="true" />
          </button>
        </div>
      </header>

      <div className="relative min-h-0 flex-1 overflow-hidden rounded-md border border-ronda-border bg-[#f7f8f8]">
        <ReactFlow
          key={viewMode}
          nodes={graph.nodes}
          edges={graph.edges}
          nodeTypes={nodeTypes}
          onNodeClick={(_, node) => selectNode(node.data.item)}
          onPaneClick={() => selectNode(null)}
          fitView
          fitViewOptions={{ padding: 0.16, maxZoom: 1 }}
          minZoom={0.25}
          maxZoom={1.6}
          nodesDraggable
          nodesConnectable={false}
          elementsSelectable
          colorMode="light"
        >
          <Background color="#d5d9d8" gap={24} size={1} />
          <Controls showInteractive={false} position="bottom-left" />
          <MiniMap
            position="bottom-right"
            pannable
            zoomable
            nodeColor={miniMapNodeColor}
            maskColor="rgba(250,247,240,0.72)"
          />
        </ReactFlow>

        <div className="absolute left-3 top-3 z-10 flex max-w-[calc(100%-24px)] flex-wrap items-center gap-x-3 gap-y-2 rounded-md border border-ronda-border bg-white/95 px-3 py-2 text-[11px] shadow-sm backdrop-blur">
          {(Object.keys(kindLabels) as InfrastructureNode['kind'][]).map((kind) => (
            <span key={kind} className={`flex items-center gap-1.5 ${kindStyles[kind].icon}`}>
              <KindIcon kind={kind} className="size-3.5" />{kindLabels[kind]}
            </span>
          ))}
        </div>

        {error && <div className="absolute right-3 top-3 z-10 border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}

        {selected && (
          <aside className="absolute bottom-3 right-3 top-3 z-20 w-[min(380px,calc(100%-24px))] overflow-auto rounded-md border border-ronda-border bg-white p-4 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className={`grid size-10 shrink-0 place-items-center rounded-md ${kindStyles[selected.kind].surface} ${kindStyles[selected.kind].icon}`}>
                  <KindIcon kind={selected.kind} className="size-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase text-ronda-muted">{kindLabels[selected.kind]}</p>
                  <h2 className="truncate text-base font-semibold text-ronda-text">{selected.label}</h2>
                </div>
              </div>
              <button type="button" onClick={() => selectNode(null)} title="Cerrar detalle" className="grid size-8 shrink-0 place-items-center text-ronda-muted hover:bg-ronda-bg hover:text-ronda-text">
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
            <div className={`mt-4 flex items-center gap-2 border px-3 py-2 text-sm ${statusStyles[selected.status].border} ${statusStyles[selected.status].text}`}>
              <span className={`size-2 rounded-full ${statusStyles[selected.status].dot}`} />
              {statusStyles[selected.status].label}
            </div>
            {(selected.kind === 'server' || selected.kind === 'workload' || selected.kind === 'database' || selected.kind === 'service') && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => void loadLogs()}
                  disabled={loadingLogs}
                  className="flex min-h-10 items-center justify-center gap-2 rounded-md border border-ronda-border bg-white px-3 text-xs font-semibold text-ronda-coffee transition hover:bg-ronda-bg disabled:opacity-50"
                >
                  <TerminalSquare className="size-4" aria-hidden="true" />
                  {loadingLogs ? 'Cargando' : 'Ver logs'}
                </button>
                {selected.kind !== 'service' && (
                  <button
                    type="button"
                    onClick={() => setConfirmRestart(true)}
                    disabled={restarting}
                    className="flex min-h-10 items-center justify-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 text-xs font-semibold text-amber-800 transition hover:bg-amber-100 disabled:opacity-50"
                  >
                    <RotateCw className={`size-4 ${restarting ? 'animate-spin' : ''}`} aria-hidden="true" />
                    Reiniciar
                  </button>
                )}
              </div>
            )}
            {confirmRestart && (
              <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-3">
                <p className="text-xs leading-5 text-amber-900">
                  Se iniciara un rollout gradual de las cargas gestionadas por este nodo. Puede haber reconexiones breves.
                </p>
                <div className="mt-3 flex justify-end gap-2">
                  <button type="button" onClick={() => setConfirmRestart(false)} className="min-h-8 rounded px-3 text-xs font-semibold text-ronda-muted hover:bg-white">Cancelar</button>
                  <button type="button" onClick={() => void restartSelected()} disabled={restarting} className="min-h-8 rounded bg-amber-700 px-3 text-xs font-semibold text-white hover:bg-amber-800 disabled:opacity-50">
                    {restarting ? 'Iniciando' : 'Confirmar reinicio'}
                  </button>
                </div>
              </div>
            )}
            {actionMessage && <p className="mt-3 rounded-md border border-ronda-border bg-ronda-bg px-3 py-2 text-xs text-ronda-text">{actionMessage}</p>}
            <dl className="mt-4 divide-y divide-ronda-border border-y border-ronda-border">
              {Object.entries(selected.details).map(([key, value]) => (
                <div key={key} className="grid grid-cols-[120px_1fr] gap-3 py-2.5 text-xs">
                  <dt className="text-ronda-muted">{detailLabels[key] ?? key}</dt>
                  <dd className="min-w-0 break-words text-right font-medium text-ronda-text">{value == null ? '—' : String(value)}</dd>
                </div>
              ))}
            </dl>
          </aside>
        )}

        {logs && (
          <section className={`absolute inset-x-0 bottom-0 z-30 flex flex-col border-t border-zinc-700 bg-zinc-950 shadow-[0_-12px_32px_rgba(0,0,0,0.22)] transition-[height] duration-200 ${logsExpanded ? 'h-[72%]' : 'h-1/4 min-h-48'}`}>
            <header className="flex min-h-11 shrink-0 items-center justify-between gap-3 border-b border-zinc-700 bg-zinc-900 px-3">
              <div className="flex min-w-0 items-center gap-2 text-zinc-200">
                <TerminalSquare className="size-4 shrink-0 text-emerald-400" aria-hidden="true" />
                <span className="truncate text-xs font-semibold">Logs · {selected?.label ?? logs.nodeId}</span>
                <span className="shrink-0 text-[10px] text-zinc-400">{logs.podCount} pods</span>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button type="button" onClick={() => void loadLogs()} disabled={loadingLogs} title="Recargar logs" className="grid size-8 place-items-center rounded text-zinc-400 hover:bg-zinc-800 hover:text-white disabled:opacity-50">
                  <RefreshCw className={`size-4 ${loadingLogs ? 'animate-spin' : ''}`} aria-hidden="true" />
                </button>
                <button type="button" onClick={() => setLogsExpanded((value) => !value)} title={logsExpanded ? 'Reducir logs' : 'Ampliar logs'} className="grid size-8 place-items-center rounded text-zinc-400 hover:bg-zinc-800 hover:text-white">
                  {logsExpanded ? <Minimize2 className="size-4" aria-hidden="true" /> : <Maximize2 className="size-4" aria-hidden="true" />}
                </button>
                <button type="button" onClick={() => setLogs(null)} title="Cerrar logs" className="grid size-8 place-items-center rounded text-zinc-400 hover:bg-zinc-800 hover:text-white">
                  <X className="size-4" aria-hidden="true" />
                </button>
              </div>
            </header>

            {logs.entries.length > 0 ? (
              <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
                <nav className="flex shrink-0 overflow-x-auto border-b border-zinc-800 bg-zinc-900/70 sm:w-64 sm:flex-col sm:overflow-y-auto sm:border-b-0 sm:border-r">
                  {logs.entries.map((entry, index) => (
                    <button
                      key={`${entry.namespace}/${entry.pod}/${entry.container}`}
                      type="button"
                      onClick={() => setActiveLogIndex(index)}
                      className={`min-w-56 border-b border-zinc-800 px-3 py-2 text-left transition sm:min-w-0 ${activeLogIndex === index ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'}`}
                    >
                      <span className="block truncate text-[11px] font-semibold">{entry.pod}</span>
                      <span className="mt-0.5 block truncate text-[10px]">{entry.namespace} / {entry.container}</span>
                    </button>
                  ))}
                </nav>
                <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-words p-4 font-mono text-[11px] leading-5 text-zinc-200">
                  {logs.entries[Math.min(activeLogIndex, logs.entries.length - 1)]?.content}
                </pre>
              </div>
            ) : (
              <div className="grid flex-1 place-items-center text-xs text-zinc-400">No hay logs disponibles.</div>
            )}
          </section>
        )}

        <button type="button" onClick={() => void fitView({ padding: 0.16, duration: 300 })} title="Encajar topologia" className="absolute bottom-3 left-14 z-10 grid size-8 place-items-center border border-ronda-border bg-white text-ronda-muted shadow-sm hover:text-ronda-text">
          <Waypoints className="size-4" aria-hidden="true" />
        </button>
      </div>

      <p className="shrink-0 text-right text-[11px] text-ronda-muted">
        Actualizado {new Date(topology.generatedAt).toLocaleTimeString('es-ES')} · Kubernetes Watch
      </p>
    </div>
  );
}

export function InfrastructureCanvas({ initialTopology, initialDeployments }: { initialTopology: InfrastructureTopology; initialDeployments: InfrastructureDeploymentsOverview | null }) {
  return <ReactFlowProvider><CanvasContent initialTopology={initialTopology} initialDeployments={initialDeployments} /></ReactFlowProvider>;
}
