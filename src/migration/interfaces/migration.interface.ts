import type {
    EnumPolicyAction,
    EnumPolicySubject,
    EnumRoleScope,
    EnumTermPolicyType,
} from '@generated/prisma-client/client';
import type { IPolicyCreate } from '@modules/policy/interfaces/policy.interface';
import type { EnumRolePlatformKey } from '@modules/role/enums/role.enum';
import { EnumMigrationType } from '@migration/enums/migration.enum';

export interface IMigrationOptions {
    type: EnumMigrationType;
}

export interface IMigrationUserData {
    id: string | null;
    country: string;
    email: Lowercase<string>;
    username: Lowercase<string>;
    name: string;
    role: EnumRolePlatformKey;
    password: string | null;
}

export interface IMigrationRoleData {
    scope: EnumRoleScope;
    key: string;
    name: string;
    description: string | null;
    isImmutable: boolean;
}

export interface IMigrationPolicyData {
    scope: EnumRoleScope;
    key: string;
    policies: IPolicyCreate[];
}

export interface IMigrationTermPolicyData {
    type: EnumTermPolicyType;
    version: number;
}

export type IMigrationPolicyGrant = [EnumPolicySubject, EnumPolicyAction[]];
