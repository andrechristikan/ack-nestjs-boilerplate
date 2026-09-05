export type IDatabaseRow = Record<string, unknown>;

export interface IDatabaseModelContext {
    update: (args: { where: unknown; data: IDatabaseRow }) => Promise<unknown>;
}

export interface IDatabaseSoftDeleteData extends IDatabaseRow {
    deletedAt?: Date;
    deletedBy?: string;
    updatedBy?: string;
}

export interface IDatabaseSoftDeleteArgs {
    where: unknown;
    data?: IDatabaseSoftDeleteData;
}

export interface IDatabaseRestoreData extends IDatabaseRow {
    updatedBy?: string;
}

export interface IDatabaseRestoreArgs {
    where: unknown;
    data?: IDatabaseRestoreData;
}
