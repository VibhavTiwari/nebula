---
type: level-1
service: "{{service_name}}"
domain: "{{domain}}"
owner: "{{owner}}"
created: "{{timestamp}}"
last_consolidated: "{{timestamp}}"
catalog_ref: "{{catalog_entity_ref}}"
tags: []
---

# {{service_name}} — Service Overview

## Architecture

{{architecture_description}}

### Component Diagram

```
{{component_diagram}}
```

## Endpoints and Events

### Synchronous (REST/gRPC)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| {{method}} | {{path}} | {{auth}} | {{desc}} |

### Asynchronous (Events)

| Event | Topic | Schema | Direction |
|-------|-------|--------|-----------|
| {{event}} | {{topic}} | {{schema_ref}} | {{pub/sub}} |

## Data Stores

| Store | Type | Purpose | Backup |
|-------|------|---------|--------|
| {{store}} | {{PostgreSQL/Redis/etc}} | {{purpose}} | {{strategy}} |

## Runbook

### Health Checks

- Liveness: `{{liveness_endpoint}}`
- Readiness: `{{readiness_endpoint}}`

### Common Issues and Resolution

| Symptom | Likely Cause | Resolution |
|---------|-------------|------------|
| {{symptom}} | {{cause}} | {{resolution}} |

### Scaling

{{scaling_notes}}

## Alerts and Dashboards

| Alert | Condition | Severity | Dashboard |
|-------|-----------|----------|-----------|
| {{alert}} | {{condition}} | {{critical/warning/info}} | {{link}} |

## Recent Changes

{{consolidated_from_level_0_notes}}
