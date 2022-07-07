import { Exclude, Transform, Type } from 'class-transformer';
import { IAwsS3Response } from 'src/aws/aws.interface';
import { IRoleDocument } from 'src/role/role.interface';

export class AuthLoginSerialization {
    @Type(() => String)
    readonly _id: string;

    @Transform(({ value }) => ({
        name: value.name,
        permissions: value.permissions.map((val: Record<string, any>) => ({
            code: val.code,
            isActive: val.isActive,
        })),
        isActive: value.isActive,
        accessFor: value.accessFor,
    }))
    readonly role: IRoleDocument;

    readonly email: string;
    readonly mobileNumber: string;
    readonly isActive: boolean;
    readonly passwordExpired: Date;
    readonly loginDate: Date;
    readonly rememberMe: boolean;

    @Exclude()
    readonly firstName: string;

    @Exclude()
    readonly lastName: string;

    @Exclude()
    readonly photo?: IAwsS3Response;

    @Exclude()
    readonly password: string;

    @Exclude()
    readonly salt: string;

    @Exclude()
    readonly createdAt: Date;

    @Exclude()
    readonly updatedAt: Date;
}
