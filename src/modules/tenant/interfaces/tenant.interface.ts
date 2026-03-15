import {
    EnumTenantMemberStatus,
    EnumTenantStatus,
    EnumTenantMemberRole,
    Tenant,
    TenantMember,
    User,
} from '@generated/prisma-client';

export type ITenant = Tenant;

// TenantMember now includes role enum directly (no relation join needed)
export type ITenantMember = TenantMember;

// For member listings scoped to a tenant (need to know who the user is)
export interface ITenantMemberWithUser extends ITenantMember {
    user: User;
}

// For membership listings scoped to a user (need to know which tenant)
export interface ITenantMemberWithTenant extends ITenantMember {
    tenant: Tenant;
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
    role: EnumTenantMemberRole;
    status: EnumTenantMemberStatus;
    createdBy: string;
    updatedBy: string;
    isJit?: boolean;
    expiresAt?: Date;
    reason?: string;
}

export interface ITenantMemberUpdate {
    updatedBy: string;
    role?: EnumTenantMemberRole;
    status?: EnumTenantMemberStatus;
}
