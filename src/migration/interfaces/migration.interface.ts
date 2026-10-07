import { EnumRoleType } from '@generated/prisma-client/client';
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
    role: string;
    password: string;
}

export interface IMigrationRoleData {
    name: string;
    description: string | null;
    type: EnumRoleType;
}
