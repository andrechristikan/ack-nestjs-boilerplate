import { Exclude, Transform } from 'class-transformer';
import { IAwsResponse } from 'src/aws/aws.interface';
import { IRoleFullDocument } from 'src/role/role.interface';

export class UserLoginTransformer {
    @Transform(({ value }) => {
        return `${value}`;
    })
    readonly _id: string;

    @Transform(
        ({ value }) => {
            const permissions: Record<string, any>[] = value.permissions.map(
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

    @Exclude()
    readonly firstName: string;

    @Exclude()
    readonly lastName: string;

    @Exclude()
    readonly photo?: IAwsResponse;

    @Exclude()
    readonly password: string;

    @Exclude()
    readonly createdAt: Date;

    @Exclude()
    readonly updatedAt: Date;
}
