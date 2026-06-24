'use client';

import { useCallback, useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import Link from 'next/link';
import {
  addEdge,
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
} from '@xyflow/react';
import { runStaffAutomation, updateStaffAutomation, type AutomationStatus, type StaffAutomationRun, type StaffAutomationWorkflow } from '@/lib/api';

type WorkflowNodeData = {
  label: string;
  description?: string;
  icon?: string;
  nodeType?: string;
  nodeKind?: 'trigger' | 'action';
  parameters?: Record<string, unknown>;
  outputConnected?: boolean;
  executionStatus?: 'idle' | 'running' | 'success' | 'error';
  onAddNext?: (sourceNodeId: string) => void;
};

type WorkflowNode = Node<WorkflowNodeData>;
type WorkflowEdge = Edge;

type N8nLikeNode = {
  id: string;
  name: string;
  type: string;
  typeVersion: number;
  position: [number, number];
  parameters: Record<string, unknown>;
  disabled?: boolean;
};

type N8nLikeConnections = Record<
  string,
  {
    main?: Array<Array<{ node: string; type: 'main'; index: number }>>;
  }
>;

type NodeConfigField = {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'json';
  placeholder?: string;
};

type NodeDefinition = {
  type: string;
  label: string;
  description: string;
  icon: string;
  nodeKind: 'trigger' | 'action';
  inputs: string[];
  outputs: string[];
  defaultParameters: Record<string, unknown>;
  fields: NodeConfigField[];
};

const nodeDefinitions: Record<string, NodeDefinition> = {
  'manual-trigger': {
    type: 'manual-trigger',
    label: "When clicking 'Execute workflow'",
    description: 'Starts the workflow when the execute button is clicked.',
    icon: 'RUN',
    nodeKind: 'trigger',
    inputs: [],
    outputs: ['main'],
    defaultParameters: {},
    fields: [],
  },
  'file-upload': {
    type: 'file-upload',
    label: 'File upload',
    description: 'Recibe PDF o imagen de carta.',
    icon: 'UP',
    nodeKind: 'action',
    inputs: ['main'],
    outputs: ['main'],
    defaultParameters: { acceptedTypes: ['application/pdf', 'image/*'] },
    fields: [{ key: 'acceptedTypes', label: 'Accepted types', type: 'json' }],
  },
  'extract-document': {
    type: 'extract-document',
    label: 'Extract document',
    description: 'Extrae texto y paginas.',
    icon: 'T',
    nodeKind: 'action',
    inputs: ['main'],
    outputs: ['main'],
    defaultParameters: { mode: 'text' },
    fields: [{ key: 'mode', label: 'Mode', type: 'text' }],
  },
  'ai-prompt': {
    type: 'ai-prompt',
    label: 'AI prompt',
    description: 'Transforma texto en JSON.',
    icon: 'AI',
    nodeKind: 'action',
    inputs: ['main'],
    outputs: ['main'],
    defaultParameters: { prompt: '', outputSchema: {} },
    fields: [
      { key: 'prompt', label: 'Prompt', type: 'textarea' },
      { key: 'outputSchema', label: 'Output schema', type: 'json' },
    ],
  },
  'validate-json': {
    type: 'validate-json',
    label: 'Validate JSON',
    description: 'Valida el schema esperado.',
    icon: '{}',
    nodeKind: 'action',
    inputs: ['main'],
    outputs: ['main'],
    defaultParameters: { schema: {} },
    fields: [{ key: 'schema', label: 'Schema', type: 'json' }],
  },
  'preview-menu': {
    type: 'preview-menu',
    label: 'Preview menu',
    description: 'Previsualiza categorias y productos.',
    icon: 'VIEW',
    nodeKind: 'action',
    inputs: ['main'],
    outputs: ['main'],
    defaultParameters: {},
    fields: [],
  },
  'commit-products': {
    type: 'commit-products',
    label: 'Commit products',
    description: 'Crea productos al confirmar.',
    icon: 'OK',
    nodeKind: 'action',
    inputs: ['main'],
    outputs: ['main'],
    defaultParameters: { dryRun: false },
    fields: [{ key: 'dryRun', label: 'Dry run', type: 'text' }],
  },
};

const nodeCatalog = Object.values(nodeDefinitions);

function CursorIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-9 w-9 fill-none stroke-current stroke-2">
      <path d="M5 3l14 8-6 2-3 6L5 3z" strokeLinejoin="round" />
    </svg>
  );
}

function WorkflowCardNode({ id, data, selected }: NodeProps<WorkflowNode>) {
  const definition = data.nodeType ? nodeDefinitions[data.nodeType] : undefined;
  const hasInputs = (definition?.inputs ?? (data.nodeKind === 'trigger' ? [] : ['main'])).length > 0;
  const hasOutputs = (definition?.outputs ?? ['main']).length > 0;
  const executionClass =
    data.executionStatus === 'success'
      ? 'border-emerald-500 ring-2 ring-emerald-100'
      : data.executionStatus === 'error'
        ? 'border-red-500 ring-2 ring-red-100'
        : data.executionStatus === 'running'
          ? 'border-orange-500 ring-2 ring-orange-100'
          : selected
            ? 'border-zinc-400 ring-2 ring-zinc-300'
            : 'border-zinc-300';

  return (
    <div className="relative flex w-36 flex-col items-center gap-2">
      {!hasInputs ? (
        <div className="absolute left-2 top-10 z-10 text-lg font-black leading-none text-orange-500" aria-hidden="true">
          !
        </div>
      ) : null}
      <div
        className={`relative grid aspect-square w-24 place-items-center border bg-white text-zinc-800 shadow-[0_0_0_4px_rgba(228,231,235,0.9)] transition ${
          !hasInputs ? 'rounded-l-full rounded-r-xl' : 'rounded-xl'
        } ${executionClass}`}
      >
        {hasInputs ? (
          <Handle type="target" position={Position.Left} className="!h-3 !w-3 !border-2 !border-white !bg-ronda-coffee" />
        ) : null}
        <div className="grid h-14 w-14 place-items-center rounded-md text-zinc-800">
          {data.nodeType === 'manual-trigger' ? <CursorIcon /> : <span className="text-sm font-bold">{data.icon ?? '•'}</span>}
        </div>
        {hasOutputs ? (
          <>
            <Handle
              type="source"
              position={Position.Right}
              className="!right-[-0.45rem] !h-4 !w-4 !border !border-zinc-400 !bg-white"
            />
            {!data.outputConnected ? (
              <>
                <span className="absolute right-[-2.35rem] top-1/2 h-px w-8 -translate-y-1/2 bg-zinc-300" aria-hidden="true" />
                <button
                  type="button"
                  onClick={() => data.onAddNext?.(id)}
                  className="nodrag absolute right-[-3.4rem] top-1/2 grid h-6 w-7 -translate-y-1/2 place-items-center rounded bg-zinc-200 text-sm font-bold text-zinc-700 transition hover:bg-zinc-300"
                >
                  +
                </button>
              </>
            ) : null}
          </>
        ) : null}
        {data.executionStatus === 'running' ? (
          <span className="absolute bottom-2 right-2 h-3 w-3 animate-pulse rounded-full bg-orange-500" />
        ) : data.executionStatus === 'success' ? (
          <span className="absolute bottom-2 right-2 text-lg font-bold leading-none text-emerald-600">✓</span>
        ) : data.executionStatus === 'error' ? (
          <span className="absolute bottom-2 right-2 grid h-4 w-4 place-items-center rounded-full bg-red-600 text-[10px] font-bold text-white">x</span>
        ) : null}
      </div>
      <div className="max-w-36 whitespace-normal text-center text-sm font-bold leading-5 text-zinc-950" title={data.label}>
        {data.label}
      </div>
    </div>
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function normalizeNodes(rawNodes: unknown): WorkflowNode[] {
  if (!Array.isArray(rawNodes) || !rawNodes.length) return [];

  return rawNodes.map((rawNode, index) => {
    const source = isRecord(rawNode) ? rawNode : {};
    const id = typeof source.id === 'string' ? source.id : `node-${index + 1}`;
    const type = typeof source.type === 'string' ? source.type : 'workflow-card';
    const catalogItem = nodeDefinitions[type];
    const rawData = isRecord(source.data) ? source.data : {};
    const parameters = isRecord(source.parameters) ? source.parameters : isRecord(rawData.parameters) ? rawData.parameters : {};
    const rawPosition = source.position;
    const position = Array.isArray(rawPosition)
      ? { x: Number(rawPosition[0]), y: Number(rawPosition[1]) }
      : isRecord(rawPosition)
        ? { x: Number(rawPosition.x), y: Number(rawPosition.y) }
        : { x: 90 + index * 280, y: 160 };

    return {
      id,
      type: 'workflow-card',
      position: {
        x: typeof position.x === 'number' ? position.x : 90 + index * 280,
        y: typeof position.y === 'number' ? position.y : 160,
      },
      data: {
        label:
          typeof rawData.label === 'string'
            ? rawData.label
            : typeof source.name === 'string'
              ? source.name
            : typeof source.label === 'string'
              ? source.label
              : catalogItem?.label ?? 'Nodo',
        description:
          typeof rawData.description === 'string'
            ? rawData.description
            : catalogItem?.description,
        icon: typeof rawData.icon === 'string' ? rawData.icon : catalogItem?.icon,
        nodeType: typeof rawData.nodeType === 'string' ? rawData.nodeType : type,
        nodeKind: rawData.nodeKind === 'trigger' || rawData.nodeKind === 'action' ? rawData.nodeKind : catalogItem?.nodeKind ?? 'action',
        parameters: { ...(catalogItem?.defaultParameters ?? {}), ...parameters },
      },
    };
  });
}

function normalizeEdges(rawEdges: unknown, workflowNodes: WorkflowNode[]): WorkflowEdge[] {
  if (Array.isArray(rawEdges)) {
    return rawEdges.reduce<WorkflowEdge[]>((edges, rawEdge, index) => {
      const source = isRecord(rawEdge) ? rawEdge : {};
      if (typeof source.source !== 'string' || typeof source.target !== 'string') return edges;
      edges.push({
        id: typeof source.id === 'string' ? source.id : `edge-${index + 1}`,
        source: source.source,
        target: source.target,
        animated: true,
        className: 'ronda-workflow-edge',
      });
      return edges;
    }, []);
  }

  if (!isRecord(rawEdges)) return [];

  const nodeIdByName = new Map(workflowNodes.map((node) => [node.data.label, node.id]));
  const edges: WorkflowEdge[] = [];

  Object.entries(rawEdges as N8nLikeConnections).forEach(([sourceName, connectionGroup]) => {
    const sourceId = nodeIdByName.get(sourceName);
    const mainConnections = connectionGroup.main ?? [];
    if (!sourceId) return;

    mainConnections.forEach((outputConnections, outputIndex) => {
      outputConnections.forEach((connection, connectionIndex) => {
        const targetId = nodeIdByName.get(connection.node);
        if (!targetId) return;
        edges.push({
          id: `${sourceId}-${targetId}-${outputIndex}-${connectionIndex}`,
          source: sourceId,
          target: targetId,
          animated: true,
          className: 'ronda-workflow-edge',
        });
      });
    });
  });

  return edges;
}

function toN8nLikeNodes(workflowNodes: WorkflowNode[]): N8nLikeNode[] {
  return workflowNodes.map((node) => ({
    id: node.id,
    name: node.data.label,
    type: node.data.nodeType ?? 'workflow-card',
    typeVersion: 1,
    position: [node.position.x, node.position.y],
    parameters: node.data.parameters ?? {},
    disabled: false,
  }));
}

function toN8nLikeConnections(workflowNodes: WorkflowNode[], workflowEdges: WorkflowEdge[]): N8nLikeConnections {
  const nodeNameById = new Map(workflowNodes.map((node) => [node.id, node.data.label]));
  const connections: N8nLikeConnections = {};

  workflowEdges.forEach((edge) => {
    const sourceName = nodeNameById.get(edge.source);
    const targetName = nodeNameById.get(edge.target);
    if (!sourceName || !targetName) return;

    connections[sourceName] ??= { main: [[]] };
    connections[sourceName].main ??= [[]];
    connections[sourceName].main[0] ??= [];
    connections[sourceName].main[0].push({ node: targetName, type: 'main', index: 0 });
  });

  return connections;
}

function getNodeStatusesFromRun(workflowNodes: WorkflowNode[], run: StaffAutomationRun) {
  const statusByNode: Record<string, 'success' | 'error'> = {};
  const knownNodeIds = new Set(workflowNodes.map((node) => node.id));

  run.logs.forEach((log) => {
    if (!log.nodeId || !knownNodeIds.has(log.nodeId)) return;
    statusByNode[log.nodeId] = log.level === 'error' ? 'error' : 'success';
  });

  if (run.status === 'failed') {
    workflowNodes.forEach((node) => {
      statusByNode[node.id] ??= 'error';
    });
  }

  return statusByNode;
}

function getUniqueNodeLabel(baseLabel: string, nodes: WorkflowNode[]) {
  const usedLabels = new Set(nodes.map((node) => node.data.label.trim().toLowerCase()));
  if (!usedLabels.has(baseLabel.trim().toLowerCase())) return baseLabel;

  let suffix = 2;
  while (usedLabels.has(`${baseLabel} ${suffix}`.trim().toLowerCase())) {
    suffix += 1;
  }

  return `${baseLabel} ${suffix}`;
}

function createNode(type: string, nodes: WorkflowNode[]): WorkflowNode {
  const catalogItem = nodeDefinitions[type] ?? nodeCatalog[0];
  return {
    id: `${type}-${Date.now()}`,
    type: 'workflow-card',
    position: { x: 120 + nodes.length * 32, y: 120 + nodes.length * 24 },
    data: {
      label: getUniqueNodeLabel(catalogItem.label, nodes),
      description: catalogItem.description,
      icon: catalogItem.icon,
      nodeType: catalogItem.type,
      nodeKind: catalogItem.nodeKind,
      parameters: { ...catalogItem.defaultParameters },
    },
  };
}

export function AutomationWorkflowEditor({ automation }: { automation: StaffAutomationWorkflow }) {
  const nodeTypes = useMemo(() => ({ 'workflow-card': WorkflowCardNode }), []);
  const initialNodes = useMemo(() => normalizeNodes(automation.nodes), [automation.nodes]);
  const initialEdges = useMemo(() => normalizeEdges(automation.edges, initialNodes), [automation.edges, initialNodes]);
  const [name, setName] = useState(automation.name);
  const [status, setStatus] = useState<AutomationStatus>(automation.status);
  const [nodes, setNodes, onNodesChange] = useNodesState<WorkflowNode>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<WorkflowEdge>(initialEdges);
  const [nodePanelOpen, setNodePanelOpen] = useState(false);
  const [sourceNodeForNext, setSourceNodeForNext] = useState<string | null>(null);
  const [configNodeId, setConfigNodeId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [runState, setRunState] = useState<'idle' | 'running' | 'succeeded' | 'failed'>('idle');
  const [lastRun, setLastRun] = useState<StaffAutomationRun | null>(null);
  const [logsOpen, setLogsOpen] = useState(false);
  const [nodeExecutionStatus, setNodeExecutionStatus] = useState<Record<string, 'running' | 'success' | 'error'>>({});
  const [error, setError] = useState<string | null>(null);

  const configNode = nodes.find((node) => node.id === configNodeId) ?? null;

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((currentEdges) =>
        addEdge({ ...connection, animated: true, className: 'ronda-workflow-edge' }, currentEdges),
      );
    },
    [setEdges],
  );

  const closeNodePanel = useCallback(() => {
    setNodePanelOpen(false);
    setSourceNodeForNext(null);
  }, []);

  const openNodePanelForSource = useCallback((sourceNodeId: string) => {
    setSourceNodeForNext(sourceNodeId);
    setNodePanelOpen(true);
  }, []);

  const displayNodes = useMemo(
    () =>
      nodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          outputConnected: edges.some((edge) => edge.source === node.id),
          executionStatus: nodeExecutionStatus[node.id] ?? 'idle',
          onAddNext: openNodePanelForSource,
        },
      })),
    [edges, nodeExecutionStatus, nodes, openNodePanelForSource],
  );

  const displayEdges = useMemo(
    () =>
      edges.map((edge) => {
        const sourceStatus = nodeExecutionStatus[edge.source];
        const edgeColor = sourceStatus === 'success' ? '#10b981' : sourceStatus === 'error' ? '#ef4444' : undefined;

        return {
          ...edge,
          animated: sourceStatus === 'running' ? true : edge.animated,
          style: edgeColor ? { stroke: edgeColor, strokeWidth: 2 } : edge.style,
          markerEnd: edgeColor ? { type: 'arrowclosed', color: edgeColor } : edge.markerEnd,
        } satisfies WorkflowEdge;
      }),
    [edges, nodeExecutionStatus],
  );

  function addCatalogNode(type: string) {
    setNodes((currentNodes) => {
      const sourceNode = sourceNodeForNext ? currentNodes.find((currentNode) => currentNode.id === sourceNodeForNext) : null;
      const node = {
        ...createNode(type, currentNodes),
        ...(sourceNode ? { position: { x: sourceNode.position.x + 260, y: sourceNode.position.y } } : {}),
      };
      if (sourceNodeForNext) {
        setEdges((currentEdges) =>
          addEdge(
            {
              id: `${sourceNodeForNext}-${node.id}`,
              source: sourceNodeForNext,
              target: node.id,
              animated: true,
              className: 'ronda-workflow-edge',
            },
            currentEdges,
          ),
        );
      }
      return [...currentNodes, node];
    });
    setNodePanelOpen(false);
    setSourceNodeForNext(null);
    setSaveState('idle');
  }

  function updateNodeParameter(nodeId: string, key: string, value: unknown) {
    setNodes((currentNodes) =>
      currentNodes.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              data: {
                ...node.data,
                parameters: {
                  ...(node.data.parameters ?? {}),
                  [key]: value,
                },
              },
            }
          : node,
      ),
    );
    setSaveState('idle');
  }

  function handleWorkflowKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Tab') return;
    const target = event.target;
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement ||
      target instanceof HTMLButtonElement ||
      target instanceof HTMLAnchorElement
    ) {
      return;
    }

    event.preventDefault();
    setNodePanelOpen(true);
  }

  useEffect(() => {
    function handleWindowKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key !== 'Tab') return;
      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target instanceof HTMLButtonElement ||
        target instanceof HTMLAnchorElement
      ) {
        return;
      }

      event.preventDefault();
      setNodePanelOpen(true);
    }

    window.addEventListener('keydown', handleWindowKeyDown);
    return () => window.removeEventListener('keydown', handleWindowKeyDown);
  }, []);

  async function saveWorkflow() {
    setSaveState('saving');
    setError(null);

    try {
      const updated = await updateStaffAutomation(automation.id, {
        name,
        status,
        nodes: toN8nLikeNodes(nodes),
        edges: toN8nLikeConnections(nodes, edges),
      });
      setName(updated.name);
      setStatus(updated.status);
      setSaveState('saved');
    } catch (saveError) {
      setSaveState('error');
      setError(saveError instanceof Error ? saveError.message : 'No se pudo guardar el workflow');
    }
  }

  async function executeWorkflow() {
    setRunState('running');
    setNodeExecutionStatus(Object.fromEntries(nodes.map((node) => [node.id, 'running'])));
    setError(null);

    try {
      await saveWorkflow();
      const run = await runStaffAutomation(automation.id, {});
      setLastRun(run);
      setRunState(run.status === 'succeeded' ? 'succeeded' : 'failed');
      setNodeExecutionStatus(getNodeStatusesFromRun(nodes, run));
      if (run.status === 'failed') {
        setError(run.error ?? 'La ejecucion ha fallado');
      }
    } catch (executeError) {
      setRunState('failed');
      setNodeExecutionStatus((current) =>
        Object.fromEntries(Object.entries(current).map(([nodeId, status]) => [nodeId, status === 'running' ? 'error' : status])),
      );
      setError(executeError instanceof Error ? executeError.message : 'No se pudo ejecutar el workflow');
    }
  }

  return (
    <ReactFlowProvider>
      <div
        className="fixed inset-0 z-[100] flex h-dvh w-dvw overflow-hidden bg-white text-zinc-900"
        onKeyDown={handleWorkflowKeyDown}
        tabIndex={-1}
      >
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-16 shrink-0 items-center justify-between border-b border-zinc-200 bg-white pl-6 pr-4">
            <div className="flex min-w-0 items-center gap-3">
              <Link href="/automations" className="text-sm text-zinc-700 transition hover:text-zinc-950">
                Personal
              </Link>
              <span className="text-zinc-300">/</span>
              <input
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setSaveState('idle');
                }}
                className="min-w-0 max-w-sm rounded border border-transparent bg-transparent px-1 text-base font-medium text-zinc-800 outline-none transition focus:border-zinc-300 focus:bg-white"
              />
              <button type="button" className="text-xs font-semibold text-zinc-500 transition hover:text-zinc-900">
                + Add tag
              </button>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setStatus('active');
                  void saveWorkflow();
                }}
                disabled={saveState === 'saving'}
                className="h-9 rounded bg-orange-600 px-4 text-sm font-bold text-white transition hover:bg-orange-700 disabled:opacity-60"
              >
                {saveState === 'saving' ? 'Saving' : 'Publish'}
              </button>
              <button type="button" className="grid h-9 w-9 place-items-center rounded-md text-xl text-zinc-700 transition hover:bg-zinc-100">
                ...
              </button>
              <span className="min-w-16 text-xs font-semibold text-zinc-500">
                {saveState === 'saved' ? 'Saved' : saveState === 'error' ? 'Error' : ''}
              </span>
            </div>
          </header>

          {error ? <div className="shrink-0 border-b border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-800">{error}</div> : null}

          <div className="relative min-h-0 flex-1">
            <div className="absolute left-1/2 top-[-1rem] z-20 flex -translate-x-1/2 overflow-hidden rounded-md bg-zinc-200 p-1 shadow-sm">
              <button type="button" className="min-h-8 rounded bg-white px-4 text-sm font-bold text-zinc-900 shadow-sm">
                Editor
              </button>
              <button type="button" className="min-h-8 rounded px-4 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100">
                Executions
              </button>
            </div>

            <main className="h-full min-h-[32rem] lg:min-h-0">
              <ReactFlow
                nodes={displayNodes}
                edges={displayEdges}
                nodeTypes={nodeTypes}
                onNodesChange={(changes) => {
                  onNodesChange(changes);
                  setSaveState('idle');
                }}
                onEdgesChange={(changes) => {
                  onEdgesChange(changes);
                  setSaveState('idle');
                }}
                onConnect={onConnect}
                onPaneClick={closeNodePanel}
                onNodeClick={closeNodePanel}
                onNodeDoubleClick={(_, node) => {
                  setConfigNodeId(node.id);
                  setNodePanelOpen(false);
                }}
                fitView
                fitViewOptions={{ padding: 0.25 }}
                className="ronda-workflow-canvas"
              >
                <Background color="#d8d8d8" gap={16} size={1.1} variant={BackgroundVariant.Dots} />
                <Controls position="bottom-left" />
              </ReactFlow>
            </main>

            <button
              type="button"
              onClick={() => {
                setSourceNodeForNext(null);
                setNodePanelOpen(true);
              }}
              className="absolute right-3 top-4 z-20 grid h-9 w-9 place-items-center rounded-md border border-zinc-200 bg-white text-base font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50"
            >
              +
            </button>

            <button
              type="button"
              onClick={executeWorkflow}
              disabled={runState === 'running'}
              className="absolute bottom-12 left-1/2 z-20 inline-flex min-h-10 -translate-x-1/2 items-center justify-center rounded-md bg-orange-600 px-5 text-sm font-bold text-white shadow-lg transition hover:bg-orange-700"
            >
              {runState === 'running' ? 'Executing...' : 'Execute workflow'}
            </button>

            <div
              className={`absolute inset-x-0 bottom-0 z-10 flex flex-col border-t border-zinc-200 bg-white transition-[height] duration-200 ${
                logsOpen ? 'h-1/4' : 'h-9'
              }`}
            >
              <button
                type="button"
                onClick={() => setLogsOpen((open) => !open)}
                className="flex h-9 shrink-0 items-center px-4 text-left text-sm font-semibold text-zinc-800"
              >
                <span>Logs</span>
                {lastRun ? (
                  <span className="ml-4 text-xs font-semibold text-zinc-500">
                    Last run: {lastRun.status} · {lastRun.logs.length} logs
                  </span>
                ) : null}
                <span className="ml-auto text-lg leading-none text-zinc-600">{logsOpen ? '⌄' : '⌃'}</span>
              </button>
              {logsOpen ? (
                <div className="min-h-0 flex-1 overflow-auto border-t border-zinc-100 px-4 py-3">
                  {lastRun?.logs.length ? (
                    <div className="space-y-2">
                      {lastRun.logs.map((log) => (
                        <div key={log.id} className="grid gap-1 rounded border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs">
                          <div className="flex items-center gap-2">
                            <span
                              className={`rounded px-1.5 py-0.5 font-bold uppercase ${
                                log.level === 'error'
                                  ? 'bg-red-100 text-red-700'
                                  : log.level === 'warn'
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-zinc-200 text-zinc-700'
                              }`}
                            >
                              {log.level}
                            </span>
                            <span className="font-semibold text-zinc-800">{log.message}</span>
                            {log.nodeId ? <span className="text-zinc-500">node: {log.nodeId}</span> : null}
                          </div>
                          {log.data ? <pre className="overflow-auto text-[11px] text-zinc-600">{JSON.stringify(log.data, null, 2)}</pre> : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-zinc-500">No logs yet. Execute the workflow to see logs here.</p>
                  )}
                </div>
              ) : null}
            </div>

            <div
              className={`absolute inset-y-0 right-0 z-30 w-full max-w-sm border-l border-ronda-border bg-white shadow-2xl transition-transform duration-300 ease-out ${
                nodePanelOpen ? 'translate-x-0' : 'translate-x-full'
              }`}
              aria-hidden={!nodePanelOpen}
            >
              <div className="flex items-center justify-between border-b border-ronda-border px-4 py-3">
                <div>
                  <h2 className="text-sm font-semibold text-ronda-text">Anadir nodo</h2>
                  <p className="mt-1 text-xs text-ronda-muted">Elige un bloque para insertarlo en el workflow.</p>
                </div>
                <button
                  type="button"
                  onClick={closeNodePanel}
                  className="grid h-9 w-9 place-items-center rounded-md border border-ronda-border text-sm font-bold text-ronda-muted transition hover:bg-ronda-bg hover:text-ronda-coffee"
                >
                  X
                </button>
              </div>
              <div className="h-[calc(100%-4.5rem)] overflow-auto p-3">
                <div className="space-y-2">
                  {nodeCatalog.map((node) => (
                    <button
                      key={node.type}
                      type="button"
                      onClick={() => addCatalogNode(node.type)}
                      className="flex w-full items-start gap-3 rounded-lg border border-ronda-border bg-white p-3 text-left transition hover:border-ronda-gold hover:bg-ronda-bg"
                    >
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-ronda-coffee text-xs font-bold text-white">
                        {node.icon}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-ronda-text">{node.label}</span>
                        <span className="mt-1 block text-xs leading-4 text-ronda-muted">{node.description}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {configNode ? (
          <div className="fixed inset-0 z-[120] bg-black/55 p-3">
            <div className="mx-auto flex h-full max-h-[calc(100dvh-1.5rem)] max-w-[calc(100dvw-1.5rem)] flex-col overflow-hidden rounded-lg border border-zinc-300 bg-white shadow-2xl">
              <header className="flex h-11 shrink-0 items-center justify-between gap-4 border-b border-zinc-200 bg-white px-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="grid h-7 w-7 shrink-0 place-items-center text-ronda-coffee">
                    {configNode.data.nodeType === 'manual-trigger' ? (
                      <CursorIcon />
                    ) : (
                      <span className="text-xs font-bold">{configNode.data.icon ?? '•'}</span>
                    )}
                  </div>
                  <input
                    value={configNode.data.label}
                    onChange={(event) => {
                      const value = event.target.value;
                      setNodes((currentNodes) =>
                        currentNodes.map((node) =>
                          node.id === configNode.id ? { ...node, data: { ...node.data, label: value } } : node,
                        ),
                      );
                      setSaveState('idle');
                    }}
                    className="min-w-0 max-w-xl truncate rounded border border-transparent bg-transparent px-1 text-sm font-semibold text-zinc-700 outline-none transition focus:border-zinc-300 focus:bg-white"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <button type="button" className="text-xs font-semibold text-zinc-600 transition hover:text-ronda-coffee">
                    Docs ↗
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfigNodeId(null)}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-lg leading-none text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900"
                  >
                    ×
                  </button>
                </div>
              </header>

              <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[30rem_minmax(0,1fr)]">
                <aside className="flex min-h-0 flex-col border-b border-zinc-200 bg-white lg:border-b-0 lg:border-r">
                  <div className="flex h-12 shrink-0 items-end justify-between border-b border-zinc-200 px-4">
                    <div className="flex h-full items-end gap-4">
                      <button className="h-full border-b-2 border-orange-500 px-1 text-xs font-bold text-orange-600">
                        Parameters
                      </button>
                      <button className="h-full border-b-2 border-transparent px-1 text-xs font-bold text-zinc-600 transition hover:text-zinc-900">
                        Settings
                      </button>
                    </div>
                    <button
                      type="button"
                      className="mb-2 inline-flex h-9 items-center justify-center rounded bg-orange-600 px-4 text-xs font-bold text-white transition hover:bg-orange-700"
                    >
                      Execute step
                    </button>
                  </div>

                  <div className="min-h-0 flex-1 overflow-auto px-4 py-4">
                    <div className="border border-orange-200 bg-orange-50 px-3 py-3 text-xs leading-5 text-zinc-800">
                      {nodeDefinitions[configNode.data.nodeType ?? '']?.description ?? configNode.data.description ?? 'Configure this node.'}
                    </div>

                    {nodeDefinitions[configNode.data.nodeType ?? '']?.fields.length ? (
                      <div className="mt-4 space-y-4">
                        {nodeDefinitions[configNode.data.nodeType ?? '']?.fields.map((field) => {
                          const value = configNode.data.parameters?.[field.key];

                          return (
                            <div key={field.key}>
                              <label className="text-xs font-semibold uppercase text-zinc-500">{field.label}</label>
                              {field.type === 'textarea' ? (
                                <textarea
                                  value={typeof value === 'string' ? value : ''}
                                  onChange={(event) => updateNodeParameter(configNode.id, field.key, event.target.value)}
                                  placeholder={field.placeholder}
                                  rows={6}
                                  className="mt-2 w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 outline-none transition focus:border-orange-500"
                                />
                              ) : field.type === 'json' ? (
                                <textarea
                                  value={JSON.stringify(value ?? {}, null, 2)}
                                  onChange={(event) => {
                                    try {
                                      updateNodeParameter(configNode.id, field.key, JSON.parse(event.target.value));
                                    } catch {
                                      // Keep last valid JSON.
                                    }
                                  }}
                                  spellCheck={false}
                                  rows={6}
                                  className="mt-2 w-full rounded border border-zinc-300 bg-white px-3 py-2 font-mono text-xs text-zinc-800 outline-none transition focus:border-orange-500"
                                />
                              ) : (
                                <input
                                  value={typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' ? String(value) : ''}
                                  onChange={(event) => updateNodeParameter(configNode.id, field.key, event.target.value)}
                                  placeholder={field.placeholder}
                                  className="mt-2 min-h-10 w-full rounded border border-zinc-300 bg-white px-3 text-sm text-zinc-800 outline-none transition focus:border-orange-500"
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="mt-4 text-sm text-zinc-700">This node does not have any parameters</p>
                    )}
                    <div className="mt-4">
                      <label className="text-xs font-semibold uppercase text-zinc-500">Parameters JSON</label>
                      <textarea
                        value={JSON.stringify(configNode.data.parameters ?? {}, null, 2)}
                        onChange={(event) => {
                          try {
                            const parsed = JSON.parse(event.target.value);
                            if (!isRecord(parsed)) return;
                            setNodes((currentNodes) =>
                              currentNodes.map((node) =>
                                node.id === configNode.id ? { ...node, data: { ...node.data, parameters: parsed } } : node,
                              ),
                            );
                            setSaveState('idle');
                          } catch {
                            // Keep the textarea controlled by the last valid JSON.
                          }
                        }}
                        spellCheck={false}
                        rows={10}
                        className="mt-2 w-full rounded border border-zinc-300 bg-white px-3 py-2 font-mono text-xs text-zinc-800 outline-none transition focus:border-orange-500"
                      />
                    </div>
                  </div>

                  <div className="shrink-0 px-4 py-5 text-xs font-semibold text-zinc-400">I wish this node would...</div>
                </aside>

                <main className="relative min-h-0 overflow-hidden bg-zinc-50">
                  <div className="absolute left-0 top-0 right-0 flex h-12 items-center border-b border-zinc-200 bg-zinc-50 px-4">
                    <span className="text-xs font-bold uppercase tracking-[0.32em] text-zinc-400">Output</span>
                  </div>
                  <button
                    type="button"
                    className="absolute right-4 top-14 grid h-8 w-8 place-items-center rounded border border-zinc-200 bg-white text-sm text-zinc-600 shadow-sm transition hover:bg-zinc-100"
                  >
                    ✎
                  </button>
                  <div className="grid h-full place-items-center px-6 pt-12">
                    <div className="text-center">
                      <div className="text-2xl font-black text-zinc-700">⚡</div>
                      <p className="mt-4 text-base font-bold text-zinc-700">
                        {configNode.data.nodeKind === 'trigger' ? 'No trigger output' : 'No output data'}
                      </p>
                      <button
                        type="button"
                        className="mt-5 inline-flex min-h-10 items-center justify-center rounded bg-orange-600 px-4 text-sm font-bold text-white transition hover:bg-orange-700"
                      >
                        {configNode.data.nodeKind === 'trigger' ? 'Test this trigger' : 'Execute step'}
                      </button>
                      <p className="mt-5 text-sm text-zinc-600">
                        or <button className="font-semibold text-orange-600 hover:text-orange-700">set mock data</button>
                      </p>
                    </div>
                  </div>
                </main>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </ReactFlowProvider>
  );
}
