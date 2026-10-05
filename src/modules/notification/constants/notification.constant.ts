/**
 * HKDF purpose that seals secrets inside queued notification jobs.
 * @public
 */
export const NotificationPayloadEncryptionPurpose = 'notification.payload';

/**
 * Job id pattern for a job keyed by process name and recipient user id.
 * @public
 */
export const NotificationUserJobIdPattern = '{process}-{userId}';

/**
 * Job id pattern for a job keyed by process name and invite reference.
 * @public
 */
export const NotificationReferenceJobIdPattern = '{process}-{reference}';

/**
 * Job id pattern for a job keyed by process name, workspace id and recipient user id.
 * @public
 */
export const NotificationWorkspaceUserJobIdPattern =
    '{process}-{workspaceId}-{userId}';

/**
 * Job id pattern for a job keyed by process name, term policy type and version.
 * @public
 */
export const NotificationTermPolicyJobIdPattern = '{process}-{type}-{version}';

/**
 * Job id pattern for a job keyed by process name, recipient user id and term policy id.
 * @public
 */
export const NotificationUserTermPolicyJobIdPattern =
    '{process}-{userId}-{termPolicyId}';
