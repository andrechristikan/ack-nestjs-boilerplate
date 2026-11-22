import { EnumAppEnvironment } from '@app/enums/app.enum';
import {
    EnumRoleType,
    EnumTermPolicyType,
} from '@generated/prisma-client/client';
import { EnumMigrationType } from '@migration/enums/migration.enum';
import type { PolicyRequestDto } from '@modules/policy/dtos/request/policy.request.dto';

export interface IMigrationOptions {
    type: EnumMigrationType;
}

export interface IMigrationUserData {
    id: string | null;
    country: string;
    email: Lowercase<string>;
    username: Lowercase<string>;
    name: string;
    role: string;
    password: string | null;
}

export interface IMigrationRoleData {
    name: string;
    description: string | null;
    type: EnumRoleType;
    isImmutable: boolean;
}

export interface IMigrationTermPolicyData {
    type: EnumTermPolicyType;
    version: number;
}

export interface IMigrationPolicyData {
    role: string;
    policies: PolicyRequestDto[];
}

export type IMigrationEnvironmentData<T> = Record<EnumAppEnvironment, T>;
