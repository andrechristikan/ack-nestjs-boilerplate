/**
 * Audit columns a model may carry; the soft-delete extension stamps the one the model owns.
 * @public
 */
export enum EnumDatabaseAuditField {
    createdBy = 'createdBy',
    updatedBy = 'updatedBy',
}
