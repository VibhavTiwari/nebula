---
type: level-0
service: "{{service_name}}"
module: "{{module_name}}"
change_id: "{{change_id}}"
created: "{{timestamp}}"
author_agent: "{{agent_id}}"
workstream: "{{workstream_id}}"
linear_issue: "{{linear_issue_id}}"
tags: []
---

# {{change_title}}

## What Changed

{{description}}

## Dependencies

- {{dependency_list}}

## External Interfaces

| Interface | Type | Endpoint/Topic | Direction |
|-----------|------|----------------|-----------|
| {{interface_name}} | {{REST/gRPC/Event}} | {{path}} | {{in/out}} |

## Configuration Keys

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| {{key}} | {{type}} | {{default}} | {{desc}} |

## Operational Notes

{{operational_notes}}

## Tests Added/Updated

| Test | Type | Status |
|------|------|--------|
| {{test_name}} | {{unit/integration/e2e}} | {{pass/fail}} |

## Migration Notes

{{migration_notes}}
