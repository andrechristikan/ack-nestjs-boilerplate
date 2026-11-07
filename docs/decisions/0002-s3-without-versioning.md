# 0002. S3 without bucket versioning

- Status: accepted
- Date: 2026-11-07

## Context

`AwsS3Service` lists and deletes by key and by prefix (`deleteItems`, `deleteDir`). A versioned bucket would keep old versions and delete markers, and those calls would then have to handle them.

## Decision

`AwsS3Service` does not support bucket versioning. Its deletes and listings handle no `VersionId`, no `ListObjectVersions`, and no delete marker.

## Considered options

- `AwsS3Service` ignores bucket versioning (chosen)
- version-aware list and delete: rejected, the bucket is not versioned by design, so no `VersionId`, `ListObjectVersions`, or delete-marker handling is needed.

## Consequences

- An S3 change adds no version handling.
- A versioned bucket keeping old objects is not a finding.
- No rule carries this decision.
