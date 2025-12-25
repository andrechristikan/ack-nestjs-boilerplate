import { EnumRoleType } from '@generated/prisma-client';

export interface IRole {
    id: string;
    type: EnumRoleType;
    name: string;
}
