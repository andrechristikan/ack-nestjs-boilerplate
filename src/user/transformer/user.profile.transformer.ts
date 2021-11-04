import { Exclude, Transform } from 'class-transformer';
import { IRoleFullDocument } from 'src/role/role.interface';

export class UserProfileTransformer {
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
    role: IRoleFullDocument;

    firstName: string;
    lastName: string;
    email: string;
    mobileNumber: string;

    @Exclude()
    password: string;

    @Exclude()
    createdAt: Date;

    @Exclude()
    updatedAt: Date;
}
