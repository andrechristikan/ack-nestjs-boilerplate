/**
 * Base interface for all database entities.
 *
 * Defines the standard structure that all database entities must implement,
 * including audit trail fields and soft delete functionality.
 */
export interface IDatabaseEntity {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    createdBy?: string;
    updatedBy?: string;
    deletedAt?: Date;
    deletedBy?: string;
    deleted: boolean;
}
