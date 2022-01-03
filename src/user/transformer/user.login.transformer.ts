import { Exclude, Transform, Type } from 'class-transformer';
import { IAwsResponse } from 'src/aws/aws.interface';
import { IRoleFullDocument } from 'src/role/role.interface';

export class UserLoginTransformer {
    @Type(() => String)
    readonly _id: string;

    @Transform(
        ({ value }) => ({
            name: value.name,
            permissions: value.permissions.map((val: Record<string, any>) => ({
                name: val.name,
                isActive: val.isActive
            })),
            isActive: value.isActive
        }),
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
