// Sample index of facebook/react, standing in for what the MCP backend returns.
// Sizes, line numbers and caller lists are illustrative; code is shortened excerpts.

export type Pkg = { name: string; files: number; loc: number; churn: number };

export const REPO = {
  slug: "facebook/react",
  url: "https://github.com/facebook/react",
  branch: "main",
  indexedAt: "2026-10-24T09:40:00Z",
  languages: [
    { name: "JavaScript", share: 0.71 },
    { name: "TypeScript", share: 0.17 },
    { name: "Flow types", share: 0.12 },
  ],
};

// churn = commits touching the package in the last 90 days (sample)
export const PACKAGES: Pkg[] = [
  { name: "react-reconciler", files: 212, loc: 96400, churn: 184 },
  { name: "react-dom", files: 168, loc: 41800, churn: 97 },
  { name: "react-dom-bindings", files: 74, loc: 38200, churn: 88 },
  { name: "react-devtools-shared", files: 391, loc: 74900, churn: 61 },
  { name: "react-server", files: 96, loc: 35100, churn: 120 },
  { name: "react-server-dom-webpack", files: 58, loc: 18600, churn: 44 },
  { name: "react", files: 61, loc: 9800, churn: 23 },
  { name: "scheduler", files: 22, loc: 4300, churn: 6 },
  { name: "shared", files: 49, loc: 6100, churn: 31 },
  { name: "react-native-renderer", files: 88, loc: 21400, churn: 12 },
  { name: "react-test-renderer", files: 18, loc: 5200, churn: 4 },
  { name: "react-art", files: 14, loc: 3100, churn: 2 },
  { name: "react-refresh", files: 9, loc: 2900, churn: 3 },
  { name: "use-sync-external-store", files: 16, loc: 1400, churn: 1 },
  { name: "react-markup", files: 11, loc: 2200, churn: 9 },
  { name: "react-compiler-runtime", files: 6, loc: 900, churn: 7 },
];

export const totals = {
  files: PACKAGES.reduce((s, p) => s + p.files, 0),
  loc: PACKAGES.reduce((s, p) => s + p.loc, 0),
  symbols: 18240,
};

export type Symbol = {
  id: string;
  file: string;
  start: number;
  code: string;
  /** Lines inside the excerpt to highlight (absolute line numbers). */
  focus: [number, number];
  callers: string[];
  tests: string[];
};

const R = "packages/react-reconciler/src/";

export const SYMBOLS: Record<string, Symbol> = {
  setCount: {
    id: "setCount",
    file: "fixtures/counter/src/Counter.js",
    start: 4,
    focus: [9, 9],
    callers: [],
    tests: [],
    code: `export default function Counter() {
  const [count, setCount] = useState(4);

  return (
    <button onClick={() => {
      setCount(count + 1);
    }}>
      Clicked <span>{count}</span> times
    </button>
  );
}`,
  },
  dispatchSetState: {
    id: "dispatchSetState",
    file: R + "ReactFiberHooks.js",
    start: 3581,
    focus: [3588, 3592],
    callers: ["setCount", "useReducer", "startTransition"],
    tests: ["ReactHooks-test.internal.js", "ReactHooksWithNoopRenderer-test.js"],
    code: `function dispatchSetState<S, A>(
  fiber: Fiber,
  queue: UpdateQueue<S, A>,
  action: A,
): void {
  const lane = requestUpdateLane(fiber);
  const update = { lane, action, hasEagerState: false, next: null };
  const root = enqueueConcurrentHookUpdate(fiber, queue, update, lane);
  if (root !== null) {
    scheduleUpdateOnFiber(root, fiber, lane);
    entangleTransitionUpdate(root, queue, lane);
  }
}`,
  },
  enqueueConcurrentHookUpdate: {
    id: "enqueueConcurrentHookUpdate",
    file: R + "ReactFiberConcurrentUpdates.js",
    start: 104,
    focus: [110, 113],
    callers: ["dispatchSetState", "dispatchReducerAction"],
    tests: ["ReactIncrementalUpdates-test.js"],
    code: `export function enqueueConcurrentHookUpdate<S, A>(
  fiber: Fiber,
  queue: HookQueue<S, A>,
  update: HookUpdate<S, A>,
  lane: Lane,
): FiberRoot | null {
  const concurrentQueue = (queue: any);
  const concurrentUpdate = (update: any);
  enqueueUpdate(fiber, concurrentQueue, concurrentUpdate, lane);
  return getRootForUpdatedFiber(fiber);
}`,
  },
  scheduleUpdateOnFiber: {
    id: "scheduleUpdateOnFiber",
    file: R + "ReactFiberWorkLoop.js",
    start: 912,
    focus: [925, 927],
    callers: ["dispatchSetState", "dispatchReducerAction", "classComponentUpdater.enqueueSetState", "updateContainer", "forceStoreRerender"],
    tests: ["ReactIncrementalUpdates-test.js", "ReactUpdates-test.js", "ReactBatching-test.internal.js"],
    code: `export function scheduleUpdateOnFiber(
  root: FiberRoot,
  fiber: Fiber,
  lane: Lane,
) {
  if (root === workInProgressRoot && isRenderPhase()) {
    warnAboutRenderPhaseUpdatesInDEV(fiber);
    return;
  }
  // Mark that the root has a pending update.
  markRootUpdated(root, lane);

  ensureRootIsScheduled(root);
  if (lane === SyncLane && executionContext === NoContext) {
    flushSyncWorkOnLegacyRootsOnly();
  }
}`,
  },
  ensureRootIsScheduled: {
    id: "ensureRootIsScheduled",
    file: R + "ReactFiberRootScheduler.js",
    start: 116,
    focus: [124, 128],
    callers: ["scheduleUpdateOnFiber", "commitRootImpl", "markRootSuspended"],
    tests: ["ReactSchedulerIntegration-test.js"],
    code: `export function ensureRootIsScheduled(root: FiberRoot): void {
  // Add the root to the schedule.
  if (root === lastScheduledRoot || root.next !== null) {
    // Already scheduled.
  } else {
    lastScheduledRoot = root;
  }
  mightHavePendingSyncWork = true;
  // Process roots in a microtask, after the current event.
  if (!didScheduleMicrotask) {
    didScheduleMicrotask = true;
    scheduleImmediateRootScheduleTask();
  }
}`,
  },
  performWorkOnRoot: {
    id: "performWorkOnRoot",
    file: R + "ReactFiberWorkLoop.js",
    start: 1062,
    focus: [1070, 1074],
    callers: ["performWorkOnRootViaSchedulerTask", "flushSyncWorkAcrossRoots"],
    tests: ["ReactIncrementalScheduling-test.js", "ReactDOMRoot-test.js"],
    code: `export function performWorkOnRoot(
  root: FiberRoot,
  lanes: Lanes,
  forceSync: boolean,
): void {
  const shouldTimeSlice =
    !forceSync && !includesBlockingLane(lanes);
  let exitStatus = shouldTimeSlice
    ? renderRootConcurrent(root, lanes)
    : renderRootSync(root, lanes, true);

  if (exitStatus !== RootInProgress) {
    finishConcurrentRender(root, exitStatus, lanes);
  }
  ensureRootIsScheduled(root);
}`,
  },
  workLoopSync: {
    id: "workLoopSync",
    file: R + "ReactFiberWorkLoop.js",
    start: 2410,
    focus: [2412, 2414],
    callers: ["renderRootSync"],
    tests: ["ReactIncremental-test.js"],
    code: `function workLoopSync() {
  // Perform work without checking if we need to yield.
  while (workInProgress !== null) {
    performUnitOfWork(workInProgress);
  }
}

function performUnitOfWork(unitOfWork: Fiber): void {
  const current = unitOfWork.alternate;
  let next = beginWork(current, unitOfWork, entangledRenderLanes);
  unitOfWork.memoizedProps = unitOfWork.pendingProps;
  if (next === null) {
    completeUnitOfWork(unitOfWork);
  } else {
    workInProgress = next;
  }
}`,
  },
  beginWork: {
    id: "beginWork",
    file: R + "ReactFiberBeginWork.js",
    start: 3961,
    focus: [3967, 3973],
    callers: ["performUnitOfWork", "replayBeginWork"],
    tests: ["ReactIncrementalSideEffects-test.js", "ReactBailout-test.js"],
    code: `function beginWork(
  current: Fiber | null,
  workInProgress: Fiber,
  renderLanes: Lanes,
): Fiber | null {
  if (current !== null) {
    if (current.memoizedProps === workInProgress.pendingProps &&
        !hasContextChanged() &&
        !includesSomeLane(renderLanes, workInProgress.lanes)) {
      // No pending work on this fiber: reuse the old children.
      return attemptEarlyBailoutIfNoUpdate(current, workInProgress, renderLanes);
    }
  }
  switch (workInProgress.tag) {
    case FunctionComponent:
      return updateFunctionComponent(current, workInProgress, renderLanes);
    case HostComponent:
      return updateHostComponent(current, workInProgress, renderLanes);
  }
}`,
  },
  completeWork: {
    id: "completeWork",
    file: R + "ReactFiberCompleteWork.js",
    start: 1012,
    focus: [1020, 1025],
    callers: ["completeUnitOfWork"],
    tests: ["ReactIncrementalSideEffects-test.js"],
    code: `function completeWork(
  current: Fiber | null,
  workInProgress: Fiber,
  renderLanes: Lanes,
): Fiber | null {
  switch (workInProgress.tag) {
    case HostText: {
      const newText = workInProgress.pendingProps;
      if (current && workInProgress.stateNode != null) {
        const oldText = current.memoizedProps;
        if (oldText !== newText) {
          markUpdate(workInProgress); // flags |= Update
        }
      }
      bubbleProperties(workInProgress);
      return null;
    }
  }
}`,
  },
  commitRoot: {
    id: "commitRoot",
    file: R + "ReactFiberWorkLoop.js",
    start: 3122,
    focus: [3131, 3136],
    callers: ["commitRootWhenReady", "finishConcurrentRender", "performSyncWorkOnRoot"],
    tests: ["ReactDOMRoot-test.js", "ReactIncrementalUpdates-test.js", "ReactHooks-test.internal.js", "ReactSuspense-test.internal.js", "ReactTransition-test.js"],
    code: `function commitRoot(
  root: FiberRoot,
  finishedWork: Fiber,
  lanes: Lanes,
): void {
  const subtreeHasEffects =
    (finishedWork.subtreeFlags & MutationMask) !== NoFlags;
  const rootHasEffect = (finishedWork.flags & MutationMask) !== NoFlags;

  if (subtreeHasEffects || rootHasEffect) {
    commitBeforeMutationEffects(root, finishedWork, lanes);
    commitMutationEffects(root, finishedWork, lanes);
    root.current = finishedWork; // the new tree is now on screen
    commitLayoutEffects(finishedWork, root, lanes);
  }
  ensureRootIsScheduled(root);
}`,
  },
  commitMutationEffects: {
    id: "commitMutationEffects",
    file: R + "ReactFiberCommitWork.js",
    start: 1873,
    focus: [1880, 1884],
    callers: ["commitRoot"],
    tests: ["ReactDOMFiber-test.js"],
    code: `function commitMutationEffectsOnFiber(
  finishedWork: Fiber,
  root: FiberRoot,
  lanes: Lanes,
) {
  switch (finishedWork.tag) {
    case HostText: {
      recursivelyTraverseMutationEffects(root, finishedWork, lanes);
      if (finishedWork.flags & Update) {
        const newText: string = finishedWork.memoizedProps;
        const oldText: string = current.memoizedProps;
        commitHostTextUpdate(finishedWork, newText, oldText);
      }
      return;
    }
  }
}`,
  },
  commitTextUpdate: {
    id: "commitTextUpdate",
    file: "packages/react-dom-bindings/src/client/ReactFiberConfigDOM.js",
    start: 1048,
    focus: [1053, 1053],
    callers: ["commitHostTextUpdate"],
    tests: ["ReactDOMTextComponent-test.js"],
    code: `export function commitTextUpdate(
  textInstance: TextInstance,
  oldText: string,
  newText: string,
): void {
  textInstance.nodeValue = newText; // the DOM changes here
}`,
  },
};

// Second-ring callers, for the blast radius (sample).
export const CALLERS_OF_CALLERS: Record<string, string[]> = {
  commitRootWhenReady: ["finishConcurrentRender"],
  finishConcurrentRender: ["performWorkOnRoot"],
  performSyncWorkOnRoot: ["flushSyncWorkAcrossRoots", "performWorkOnRoot"],
  performWorkOnRoot: ["performWorkOnRootViaSchedulerTask", "flushSyncWorkAcrossRoots"],
  dispatchSetState: ["useState", "mountState"],
  useReducer: ["mountReducer"],
  startTransition: ["useTransition"],
  dispatchReducerAction: ["mountReducer"],
  "classComponentUpdater.enqueueSetState": ["Component.prototype.setState"],
  updateContainer: ["ReactDOMRoot.render", "createRoot"],
  forceStoreRerender: ["subscribeToStore"],
  renderRootSync: ["performWorkOnRoot"],
  performUnitOfWork: ["workLoopSync", "workLoopConcurrent"],
  replayBeginWork: ["replaySuspendedUnitOfWork"],
  completeUnitOfWork: ["performUnitOfWork"],
  commitHostTextUpdate: ["commitMutationEffectsOnFiber"],
  commitRootImpl: ["commitRoot"],
  markRootSuspended: ["performWorkOnRoot"],
  setCount: [],
  performWorkOnRootViaSchedulerTask: ["Scheduler.flushWork"],
  flushSyncWorkAcrossRoots: ["flushSyncWork", "processRootScheduleInMicrotask"],
  enqueueConcurrentHookUpdate: ["dispatchSetState"],
};

// Commit-churn colour on one teal ramp (grey = quiet, teal = busy).
const RAMP = ["#dfe5e8", "#bcd3d9", "#8db6c1", "#5795a6", "#15596a"];
const maxChurn = Math.max(...PACKAGES.map((p) => p.churn));
export const churnColor = (c: number) => RAMP[Math.min(RAMP.length - 1, Math.floor((c / maxChurn) * RAMP.length))];
