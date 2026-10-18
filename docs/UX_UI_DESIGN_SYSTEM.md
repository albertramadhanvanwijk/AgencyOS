# UX/UI Design System — Professional Engineering Operations
## Goal
A credible, polished tool for daily professional use: dense but readable, calm, deliberate and operational. UX quality is a release requirement, not cosmetic polish.
## Visual direction
Combine clarity of modern engineering issue trackers with enterprise operations software. References are directional; build an original coherent system.
### Avoid
Gradient-heavy purple/blue identity, glows/neon/glassmorphism, oversized cards for every metric, decorative charts, huge empty hero sections, robot mascots, emoji navigation, fake terminal/live status, random icon styles, inert controls.
### Prefer
Neutral surfaces, one restrained accent, precise typography/alignment/spacing, compact readable tables and boards, subtle separators, useful empty/error states, keyboard focus, meaningful density, minimal motion.
## Tokens
Light: canvas `#F6F7F9`; surface `#FFFFFF`; secondary `#F0F2F5`; text `#17191C`; muted `#626B76`; border `#E1E5EA`; accent `#4657C8`; success `#16794B`; warning `#9A6700`; danger `#C23934`; info `#2563A6`. Dark: canvas `#111318`; surface `#171A21`; secondary `#20242D`; text `#F1F3F5`; muted `#A4ACB8`; border `#2D333D`; adjust accent for contrast. Use semantic tokens and verify contrast; never rely on color alone.
## Typography/spacing
Modern sans-serif with system fallback. Body 13–14px for dense desktop, 14–16px reading; page title 22–28px; section title 15–18px; metadata 12–13px readable. Tabular numerals. Spacing scale 4/8/12/16/20/24/32/40; radius 4–8px for most controls.
## Layout/navigation
Desktop-first at 1280/1440; tablet usable. Persistent left navigation, top bar with breadcrumbs/project context/search/notifications/user controls. Agency nav: Overview, Projects, Workforce, Recruitment, Organization, Approvals, Activity/Audit, Settings. Project nav: Summary, Backlog, Board, Sprints, Team, Runs & Artifacts, Reports, Project Settings.
## Components
AppShell, Sidebar, Topbar, Breadcrumbs, PageHeader, DataTable, StatusBadge, AgentIdentity, AgentStatus, CapacityIndicator, WorkItemRow, PriorityIndicator, SprintProgress, ApprovalPanel, RunTimeline, redacted LogViewer, ArtifactList, DiffSummary, FilterBar, command search, ConfirmDialog, validation, toast, skeleton, empty/error states.
## Interaction
Every control works or is disabled with a reason. Confirm destructive actions. Show saving/success/failure. Inline field errors. Preserve context and filters. Keyboard navigation and visible focus. Confirm unsaved edits. Respect reduced motion. Avoid modal overload.
## Charts and AI UX
Every chart answers an operational question and states timeframe, units, source; no decorative 3D charts. Distinguish measured facts from estimates. Label AI-generated/proposed/simulated/verified content. Show agent/engine/profile/evidence when relevant. Expose authorized pause/cancel/approve/reject actions. Provide concise rationale, not hidden chain-of-thought.
## Brand
“Calm technical precision”; restrained wordmark/abstract mark; no robot-head mascot. Default light theme with complete dark theme.
