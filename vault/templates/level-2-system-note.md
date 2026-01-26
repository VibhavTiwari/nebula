---
type: level-2
system: "{{system_name}}"
created: "{{timestamp}}"
last_consolidated: "{{timestamp}}"
environment: "{{production/staging/preview}}"
tags: []
---

# {{system_name}} — System Architecture

## System Architecture Map

```
{{system_architecture_diagram}}
```

## Service Catalog

| Service | Domain | Owner | Status | Repository |
|---------|--------|-------|--------|------------|
| {{service}} | {{domain}} | {{owner}} | {{active/deprecated}} | {{repo_url}} |

## Environment Topology

### Production

| Component | Azure Resource | Region | Tier |
|-----------|---------------|--------|------|
| {{component}} | {{resource}} | {{region}} | {{tier}} |

### Staging

| Component | Azure Resource | Region | Tier |
|-----------|---------------|--------|------|
| {{component}} | {{resource}} | {{region}} | {{tier}} |

### Standby (AWS)

| Component | AWS Resource | Region | Tier |
|-----------|-------------|--------|------|
| {{component}} | {{resource}} | {{region}} | {{tier}} |

## Global Operational Posture

### Current State

- Overall health: {{healthy/degraded/outage}}
- Active incidents: {{count}}
- Last deployment: {{timestamp}}
- Last failover drill: {{timestamp}}

### Traffic Routing

- Primary: Azure ({{region}})
- Standby: AWS ({{region}})
- Failover mode: {{active-passive}}

## Known Risks and Mitigations

| Risk | Severity | Mitigation | Status |
|------|----------|------------|--------|
| {{risk}} | {{high/medium/low}} | {{mitigation}} | {{mitigated/open}} |

## Cross-Service Dependencies

```
{{dependency_graph}}
```

## Data Classification Summary

| Classification | Services | Providers Allowed |
|---------------|----------|-------------------|
| Public | {{services}} | {{all}} |
| Internal | {{services}} | {{providers}} |
| Confidential | {{services}} | {{providers}} |
| Regulated | {{services}} | {{providers}} |
