export const TENANCY_ENABLED =
    (process.env.TENANCY_ENABLED ?? 'false').toLowerCase() === 'true';

export function whenTenancyEnabled<T>(items: T[]): T[] {
    return TENANCY_ENABLED ? items : [];
}
