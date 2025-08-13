/**
 * Primary database connection name identifier.
 *
 * Used for identifying the main MongoDB connection throughout the application.
 * This constant ensures consistent connection naming across services and modules.
 */
export const DATABASE_CONNECTION_NAME = 'PrimaryConnectionDatabase';

/**
 * Supported atomic operations for field updates.
 */
export const DATABASE_ATOMIC_OPERATIONS = [
    'increment',
    'decrement',
    'multiply',
    'divide',
] as const;

/**
 * Supported filter operations for queries.
 */
export const DATABASE_FILTER_OPERATIONS = [
    'gte',
    'gt',
    'lte',
    'lt',
    'equal',
    'in',
    'notIn',
    'notEqual',
    'contains',
    'notContains',
    'startsWith',
    'endsWith',
    'or',
    'and',
] as const;

/**
 * String comparison modes for database filter operations.
 *
 * Defines how string-based filter operations should handle case sensitivity
 * when performing comparisons in database queries.
 */
export enum ENUM_DATABASE_FILTER_OPERATION_STRING_MODE {
    DEFAULT = 'DEFAULT',
    INSENSITIVE = 'INSENSITIVE',
}
