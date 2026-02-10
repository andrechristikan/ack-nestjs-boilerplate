import { EnumRoleScope, EnumRoleType } from '@generated/prisma-client';

export interface IRole {
    id: string;
    type: EnumRoleType;
    scope: EnumRoleScope;
    name: string;
}
