import {
    EnumTenantMemberStatus,
    EnumTenantStatus,
    Role,
    Tenant,
    TenantMember,
    User,
} from '@prisma/client';

export type ITenant = Tenant;

export interface ITenantMember extends TenantMember {
    tenant?: Tenant;
    role?: Role;
    user?: User;
}

export interface ITenantCreate {
    name: string;
    status: EnumTenantStatus;
    createdBy: string;
    updatedBy: string;
}

export interface ITenantUpdate {
    updatedBy: string;
    name?: string;
    status?: EnumTenantStatus;
    deletedAt?: Date | null;
    deletedBy?: string;
}

export interface ITenantMemberCreate {
    tenantId: string;
    userId: string;
    roleId: string;
    status: EnumTenantMemberStatus;
    createdBy: string;
    updatedBy: string;
    isJit?: boolean;
    expiresAt?: Date;
    reason?: string;
}

export interface ITenantMemberUpdate {
    updatedBy: string;
    roleId?: string;
    status?: EnumTenantMemberStatus;
    deletedAt?: Date | null;
    deletedBy?: string;
}
