import { Exclude, Transform } from 'class-transformer';
import { IRoleFullDocument } from 'src/role/role.interface';

export class UserLoginTransformer {
    @Transform(({ value }) => {
        return `${value}`;
    })
    _id: string;

    @Transform(
        ({ value }) => {
            const permissions: Record<string, any>[] = value.permissions.map(
                (val: Record<string, any>) => val.name
            );

            return {
                name: value.name,
                permissions: permissions
            };
        },
        { toClassOnly: true }
    )
    role: IRoleFullDocument;

    email: string;
    mobileNumber: string;

    @Exclude()
    firstName: string;

    @Exclude()
    lastName: string;

    @Exclude()
    password: string;

    @Exclude()
    createdAt: Date;

    @Exclude()
    updatedAt: Date;
}
