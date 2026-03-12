import { EnumRoleScope, Prisma } from '@generated/prisma-client';
import { ModuleMetadata } from '@nestjs/common';
import { FactoryProvider } from '@nestjs/common/interfaces/modules/provider.interface';

export interface InviteTokenCreate {
    expiresAt: Date;
    expiredInMinutes: number;
    resendInMinutes: number;
    reference: string;
    token: string;
    link: string;
}

export interface InviteConfig {
    expiredInMinutes: number;
    tokenLength: number;
    linkBaseUrl: string;
    resendInMinutes: number;
    reference: {
        prefix: string;
        length: number;
    };
}

export interface InviteConfigOverride {
    expiredInMinutes?: number;
    tokenLength?: number;
    linkBaseUrl?: string;
    resendInMinutes?: number;
    reference?: {
        prefix?: string;
        length?: number;
    };
}

export interface InviteModuleForFeatureAsyncOptions extends Pick<
    ModuleMetadata,
    'imports'
> {
    inviteType: string;
    inject?: FactoryProvider<InviteConfigOverride>['inject'];
    useFactory?: FactoryProvider<InviteConfigOverride>['useFactory'];
}

export type InviteWithUser = Prisma.InviteGetPayload<{
    include: { user: true };
}>;

export interface InviteCreate {
    inviteType: string;
    roleScope: EnumRoleScope;
    contextId: string;
    contextName: string;
    memberId: string;
    userId: string;
}

export interface InviteFinalizeSignupInput {
    token: string;
    inviteType: string;
    firstName: string;
    lastName: string;
    password: string;
}
