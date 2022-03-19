import { Exclude, Transform, Type } from 'class-transformer';
import { IAwsS3Response } from 'src/aws/aws.interface';
import { IRoleDocument } from 'src/role/role.interface';

export class UserGetTransformer {
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

    readonly email: string;
    readonly mobileNumber: string;
    readonly isActive: boolean;
    readonly firstName: string;
    readonly lastName: string;
    readonly photo?: IAwsS3Response;

    @Exclude()
    readonly password: string;

    readonly passwordExpiredDate: Date;

    @Exclude()
    readonly salt: string;

    readonly createdAt: Date;

    @Exclude()
    readonly updatedAt: Date;
}
