---
type: service-proposal
title: "{{proposal_title}}"
proposed_by: "{{proposer}}"
created: "{{timestamp}}"
status: "{{proposed/necessity-check/approved/rejected/deployed}}"
workstream: "{{workstream_id}}"
tags: []
---

# New Service Proposal: {{service_name}}

## Necessity Check

### Why can't this be added to an existing service?

{{justification}}

### Existing services evaluated

| Service | Why not suitable |
|---------|-----------------|
| {{service}} | {{reason}} |

## Service Definition

### Purpose

{{purpose}}

### Domain

{{domain}}

### Owner

{{owner}}

## Contracts

### Synchronous API (OpenAPI)

```yaml
{{openapi_stub}}
```

### Asynchronous Events (AsyncAPI)

```yaml
{{asyncapi_stub}}
```

### Event Envelope (CloudEvents)

```yaml
{{cloudevents_stub}}
```

## Infrastructure Requirements

| Resource | Type | Estimated Load |
|----------|------|---------------|
| {{resource}} | {{type}} | {{load}} |

## Deployment Configuration

- Stack pack: {{stack_pack}}
- Primary cloud: Azure ({{region}})
- Standby cloud: AWS ({{region}})
- Deployment type: {{Kubernetes/Serverless}}

## Documentation Artifacts (auto-generated)

- [ ] Level 1 service note created
- [ ] Level 2 system note updated
- [ ] Service catalog entry registered
- [ ] Linear epic/issues created

## Approval

- CTO Agent decision: {{approved/rejected}}
- Reason: {{reason}}
- Gate results: {{gate_summary}}
