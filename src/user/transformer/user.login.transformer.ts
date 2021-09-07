import { Exclude, Transform } from 'class-transformer';
import { RoleDocumentFull } from 'src/role/role.interface';

export class UserLoginTransformer {
    @Transform(({ value }) => {
        return `${value}`;
    })
    _id: string;

    @Transform(
        ({ value }) => {
            const permissions: string[] = value.permissions.map(
                (val: Record<string, any>) => val.name
            );

            return {
                name: value.name,
                permissions: permissions
            };
        },
        { toClassOnly: true }
    )
    role: RoleDocumentFull;

    email: string;
    mobileNumber: string;

    @Exclude()
    firstName: string;

    @Exclude()
    lastName: string;

    @Exclude()
    password: string;

    @Exclude()
    __v: string;
}
