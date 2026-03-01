import {
    EnumRoleScope,
    Prisma,
} from '@prisma/client';
import { IRequestLog } from '@common/request/interfaces/request.interface';
import { ModuleMetadata } from '@nestjs/common';
import { FactoryProvider } from '@nestjs/common/interfaces/modules/provider.interface';

export interface InviteTokenPayload {
    expiresAt: Date;
    expiredInMinutes: number;
    resendInMinutes: number;
    reference: string;
    token: string;
    link: string;
}

export interface InviteConfigReference {
    prefix: string;
    length: number;
}

export interface InviteConfig {
    expiredInMinutes: number;
    tokenLength: number;
    linkBaseUrl: string;
    resendInMinutes: number;
    reference: InviteConfigReference;
}

export interface InviteConfigReferenceOverride {
    prefix?: string;
    length?: number;
}

export interface InviteConfigOverride {
    expiredInMinutes?: number;
    tokenLength?: number;
    linkBaseUrl?: string;
    resendInMinutes?: number;
    reference?: InviteConfigReferenceOverride;
}

export interface InviteFeatureConfigRegistration {
    invitationType: string;
    config: InviteConfig;
}

export interface InviteModuleForFeatureAsyncOptions
    extends Pick<ModuleMetadata, 'imports'> {
    invitationType: string;
    inject?: FactoryProvider<InviteConfigOverride>['inject'];
    useFactory?: FactoryProvider<InviteConfigOverride>['useFactory'];
}

export type InviteWithUser = Prisma.InviteGetPayload<{
    include: { user: true };
}>;

export interface IInviteCreate {
    userId: string;
    userEmail: string;
    token: string;
    reference: string;
    expiresAt: Date;
    invitationType: string;
    roleScope: EnumRoleScope;
    contextId: string;
    contextName: string;
    memberId: string;
    metadata?: Prisma.InputJsonValue;
    requestedBy: string;
}

export interface InviteIssueInput {
    invitationType: string;
    roleScope: EnumRoleScope;
    contextId: string;
    contextName: string;
    memberId: string;
    userId: string;
    requestedBy: string;
}

export interface InviteDispatchInput {
    roleScope: EnumRoleScope;
    emailTypeLabel: string;
    invitationType: string;
    contextId: string;
    contextName: string;
    memberId: string;
    userId: string;
    requestLog: IRequestLog;
    requestedBy: string;
}

export interface InviteDeleteInput {
    userId: string;
    deletedBy: string;
}

export interface InviteListInput {
    invitationType?: string;
    contextId?: string;
    userId?: string;
    includeDeleted?: boolean;
    pendingOnly?: boolean;
}

export interface InviteGetInput {
    token: string;
    invitationType: string;
}

export interface InviteGetActiveInput {
    token: string;
}

export interface InviteFinalizeAcceptInput {
    inviteId: string;
    userId: string;
    requestLog: IRequestLog;
}

export interface InviteFinalizeSignupInput {
    token: string;
    firstName: string;
    lastName: string;
    password: string;
    requestLog: IRequestLog;
}
