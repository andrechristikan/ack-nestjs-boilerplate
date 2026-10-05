/**
 * Direction a migration command runs: seed the rows or remove them.
 * @public
 */
export enum EnumMigrationType {
    seed = 'seed',
    remove = 'remove',
}
