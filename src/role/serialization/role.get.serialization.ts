import { Exclude, Transform, Type } from 'class-transformer';
import { PermissionDocument } from 'src/permission/schema/permission.schema';

export class RoleGetSerialization {
    @Type(() => String)
    readonly _id: string;

    readonly isActive: boolean;
    readonly name: string;
    readonly isAdmin: boolean;

    @Transform(
        ({ obj }) =>
            obj.permissions.map((val) => ({
                _id: `${val._id}`,
                code: val.code,
                name: val.name,
                isActive: val.isActive,
            })),
        { toClassOnly: true }
    )
    readonly permissions: PermissionDocument[];

    readonly createdAt: Date;

    @Exclude()
    readonly updatedAt: Date;
}
