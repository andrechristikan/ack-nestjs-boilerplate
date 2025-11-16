export interface IMigrationSeed {
    seed(): Promise<void>;
    remove(): Promise<void>;
}
