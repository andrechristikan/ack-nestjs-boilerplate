/** @public */
export const DatabaseClient = Symbol('DatabaseClient');

/** @public */
export const DatabaseQueryTargetRegex = /^db\.(\w+)\.(\w+)\(/;

/** @public */
export const DatabaseUniqueConstraintCode = 'P2002';

/** @public */
export const DatabaseRecordNotFoundCode = 'P2025';

/** @public */
export const DatabaseRawQueryFailedCode = 'P2010';

/** @public */
export const DatabaseServerSelectionTimeoutMessage = 'Server selection timeout';

/** @public */
export const DatabaseUrlCensoredValue = '***';
