/** @public */
export const DatabaseClient = Symbol('DatabaseClient');

/** @public */
export const DatabaseQueryTargetRegex = /^db\.(\w+)\.(\w+)\(/;

/** @public */
export const DatabaseUnavailableCodes: readonly string[] = [
    'P1001',
    'P1002',
    'P1008',
    'P1017',
    'P2024',
];

/** @public */
export const DatabaseRawQueryFailedCode = 'P2010';

/** @public */
export const DatabaseUnavailableMessages: readonly string[] = [
    'Server selection timeout',
];

/** @public */
export const DatabaseUniqueConstraintCode = 'P2002';

/** @public */
export const DatabaseWriteConflictCode = 'P2034';

/** @public */
export const DatabaseIdInvalidCode = 'P2023';

/** @public */
export const DatabaseTransactionExpiredCode = 'P2028';

/** @public */
export const DatabaseUrlCensoredValue = '***';
