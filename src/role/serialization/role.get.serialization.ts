import { Exclude, Transform, Type } from 'class-transformer';
import { PermissionDocument } from 'src/permission/schema/permission.schema';
import { ENUM_ROLE_ACCESS_FOR } from '../role.constant';

export class RoleGetSerialization {
    @Type(() => String)
    readonly _id: string;

    readonly isActive: boolean;
    readonly name: string;
    readonly accessFor: ENUM_ROLE_ACCESS_FOR;

    @Transform(({ obj }) =>
        obj.permissions.map((val) => ({
            _id: `${val._id}`,
            code: val.code,
            name: val.name,
            isActive: val.isActive,
        }))
    )
    readonly permissions: PermissionDocument[];

    readonly createdAt: Date;

    @Exclude()
    readonly updatedAt: Date;
}
