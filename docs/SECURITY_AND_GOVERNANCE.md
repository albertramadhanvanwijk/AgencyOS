# Security and Governance
## Trust boundaries
Treat model output, task descriptions, repository files, comments, web content and tool output as untrusted. Prompt injection cannot override system policy or authorization.
## Authorization
Enforce permissions server-side; scope every project operation; separate read/write/execute/approve/deploy/manage-secret permissions; least privilege for agents/adapters; approval for privilege expansion and consequential external effects.
## Execution safety
Bound time/output/resources where possible. Use safe process APIs, not unsafe shell string concatenation. Allowlist tools. Canonicalize paths and prevent traversal. Avoid unrestricted host filesystem access. Restrict network access by policy. Require approval for deployments, destructive actions, external communications and paid services. Make cancellation/cleanup observable.
## Secrets
Use environment variables or a suitable secret manager. `.env.example` contains placeholders only. Never commit/log secrets. Redact tokens, keys and cookies from logs/artifacts. Pass secrets only when necessary and authorized. No secrets in agent profiles/project memory.
## Audit and isolation
Record consequential transitions, approvals, permission changes, recruitment decisions, run lifecycle and integration changes. Redact sensitive values. Project instructions/context, credentials, repositories, workspaces and artifacts remain scoped. Shared agent identity does not imply shared memory/workspace. Test isolation boundaries.
## Default approvals
New official role, new agent activation, privilege expansion, production deployment, destructive repository/database operation, secret access change, paid external resource, global policy/budget change.
## Local threat model
Local is not automatically safe: malicious repos/dependencies, local processes, secret commits, port exposure and unsafe shell execution. Bind to localhost by default. Provide pause-all-new-executions, disable-adapter, credential rotation guidance and redacted diagnostics.
