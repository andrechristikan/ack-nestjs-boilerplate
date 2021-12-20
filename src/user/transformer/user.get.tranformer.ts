import { Exclude, Transform } from 'class-transformer';
import { IAwsResponse } from 'src/aws/aws.interface';
import { IRoleFullDocument } from 'src/role/role.interface';

export class UserGetTransformer {
    @Transform(({ value }) => {
        return `${value}`;
    })
    readonly _id: string;

    @Transform(
        ({ value }) => {
            const permissions: string[] = value.permissions.map(
                (val: Record<string, any>) => val.name
            );

            return {
                name: value.name,
                permissions: permissions,
                isActive: value.isActive
            };
        },
        { toClassOnly: true }
    )
    readonly role: IRoleFullDocument;

    readonly email: string;
    readonly mobileNumber: string;
    readonly isActive: boolean;
    readonly firstName: string;
    readonly lastName: string;
    readonly photo?: IAwsResponse;

    @Exclude()
    readonly password: string;

    readonly createdAt: Date;

    readonly updatedAt: Date;
}
