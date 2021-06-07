import { Exclude, Transform } from 'class-transformer';
import { RoleSafe } from 'src/role/role.interface';
import { PermissionEntity } from 'src/permission/permission.schema';

export class UserTransformer {
    @Transform(({ value }) => {
        return `${value}`;
    })
    _id: string;

    @Transform(({ value }) => {
        const permissions: string[] = value.permissions.map(
            (val: PermissionEntity) => {
                return val.name;
            }
        );

        return {
            name: value.name,
            permissions
        };
    })
    role: RoleSafe;

    firstName: string;
    lastName: string;
    email: string;
    mobileNumber: string;
    isAdmin: boolean;

    @Exclude()
    password: string;

    @Exclude()
    __v: string;
}
