import {
    EnumTenantMemberRole,
    EnumTenantMemberStatus,
    Tenant,
    TenantMember,
} from '@generated/prisma-client';

export type ITenant = Tenant;

// TenantMember now includes role enum directly (no relation join needed)
export type ITenantMember = TenantMember;

// For membership listings scoped to a user (need to know which tenant)
export interface ITenantMemberWithTenant extends ITenantMember {
    tenant: Tenant;
}

export interface ITenantCreate {
    name: string;
    description: string;
    slug: string;
}

export interface ITenantUpdate {
    updatedBy: string;
    name?: string;
    description?: string;
    slug?: string;
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
}

export interface ITenantMemberUpdate {
    updatedBy: string;
    role?: EnumTenantMemberRole;
    status?: EnumTenantMemberStatus;
}
export interface ITenantInviteCreate {
    tenantId: string;
    invitedById: string;
    invitedEmail: string;
    tenantRole: EnumTenantMemberRole;
    type: import('@generated/prisma-client').EnumTenantInviteType;
    token: string;
    expiresAt: Date;
    createdBy?: string;
    updatedBy?: string;
}