import { Role, Tenant, TenantMember, User } from '@prisma/client';

export type ITenant = Tenant

export interface ITenantMember extends TenantMember {
    tenant?: Tenant;
    role?: Role;
    user?: User;
}
