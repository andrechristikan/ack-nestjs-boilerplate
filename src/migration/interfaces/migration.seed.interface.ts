export interface IMigrationSeed {
    seed(): Promise<void>;
    rollback(): Promise<void>;
}
