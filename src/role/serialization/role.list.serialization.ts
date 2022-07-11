import { Exclude, Type } from 'class-transformer';
import { ENUM_ROLE_ACCESS_FOR } from '../role.constant';

export class RoleListSerialization {
    @Type(() => String)
    readonly _id: string;

    readonly isActive: boolean;
    readonly name: string;
    readonly accessFor: ENUM_ROLE_ACCESS_FOR;

    @Exclude()
    readonly permissions: number;

    readonly createdAt: Date;

    @Exclude()
    readonly updatedAt: Date;
}
