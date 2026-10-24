import { HugeiconsIcon } from "@hugeicons/react";
import {
  GithubIcon, Folder01Icon, FolderOpenIcon, Mic01Icon, PlayIcon, PauseIcon, NextIcon, PreviousIcon, PinIcon,
  Plug01Icon, CodeIcon, File01Icon, TestTubeIcon, Search01Icon, Link01Icon, Tick01Icon, Copy01Icon, HierarchyIcon,
  Layers01Icon, CubeIcon, CommandLineIcon, Cancel01Icon, StopIcon, GitBranchIcon, Target01Icon, SparklesIcon,
  DashboardSquare01Icon, Tree06Icon, AudioWave01Icon, FunctionIcon, Bookmark02Icon, ExternalLinkIcon, RippleIcon,
  ArrowRight01Icon, Home01Icon, ComputerTerminal01Icon, SourceCodeIcon, Radar01Icon, Menu01Icon, RepeatIcon,
  ClaudeIcon, VisualStudioCodeIcon, McpServerIcon, Download04Icon,
} from "@hugeicons/core-free-icons";

// Hugeicons free set (stroke rounded). Solid styles need a Pro licence.
export const I = {
  github: GithubIcon, folder: Folder01Icon, folderOpen: FolderOpenIcon, mic: Mic01Icon, play: PlayIcon,
  pause: PauseIcon, next: NextIcon, prev: PreviousIcon, pin: PinIcon, plug: Plug01Icon, code: CodeIcon,
  file: File01Icon, test: TestTubeIcon, search: Search01Icon, link: Link01Icon, tick: Tick01Icon, copy: Copy01Icon,
  flow: HierarchyIcon, layers: Layers01Icon, cube: CubeIcon, terminal: CommandLineIcon, close: Cancel01Icon,
  stop: StopIcon, branch: GitBranchIcon, target: Target01Icon, sparkles: SparklesIcon, home: DashboardSquare01Icon,
  tree: Tree06Icon, wave: AudioWave01Icon, fn: FunctionIcon, atlas: Bookmark02Icon, external: ExternalLinkIcon,
  ripple: RippleIcon, arrow: ArrowRight01Icon, house: Home01Icon, computer: ComputerTerminal01Icon,
  source: SourceCodeIcon, radar: Radar01Icon, menu: Menu01Icon, replay: RepeatIcon,
  claude: ClaudeIcon, vscode: VisualStudioCodeIcon, mcp: McpServerIcon, download: Download04Icon,
};

export type IconName = keyof typeof I;

export function Icon({ name, size = 16, stroke = 1.6, className }: { name: IconName; size?: number; stroke?: number; className?: string }) {
  return <HugeiconsIcon icon={I[name]} size={size} strokeWidth={stroke} className={className} aria-hidden="true" />;
}
