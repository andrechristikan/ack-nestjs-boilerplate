import { Exclude, Transform, Type } from 'class-transformer';
import { IAwsResponse } from 'src/aws/aws.interface';
import { IRoleDocument } from 'src/role/role.interface';

export class UserProfileTransformer {
    @Type(() => String)
    readonly _id: string;

    @Transform(
        ({ value }) => ({
            name: value.name,
            permissions: value.permissions.map((val: Record<string, any>) => ({
                name: val.name,
                isActive: val.isActive,
            })),
            isActive: value.isActive,
        }),
        { toClassOnly: true }
    )
    readonly role: IRoleDocument;

    readonly firstName: string;
    readonly lastName: string;
    readonly email: string;
    readonly mobileNumber: string;
    readonly photo?: IAwsResponse;

    @Exclude()
    readonly password: string;

    readonly passwordExpiredDate: Date;

    @Exclude()
    readonly salt: string;

    @Exclude()
    readonly createdAt: Date;

    @Exclude()
    readonly updatedAt: Date;
}
