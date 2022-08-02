import { Exclude, Expose, Transform, Type } from 'class-transformer';
import { IAwsS3Response } from 'src/modules/aws/aws.interface';
import { IRoleDocument } from 'src/modules/role/role.interface';

export class UserGetSerialization {
    @Type(() => String)
    readonly _id: string;

    @Transform(({ value }) => ({
        name: value.name,
        permissions: value.permissions.map((val: Record<string, any>) => ({
            name: val.name,
            isActive: val.isActive,
            code: val.code,
        })),
        accessFor: value.accessFor,
        isActive: value.isActive,
    }))
    readonly role: IRoleDocument;

    readonly email: string;
    readonly mobileNumber: string;
    readonly isActive: boolean;
    readonly firstName: string;
    readonly lastName: string;
    readonly photo?: IAwsS3Response;

    @Expose()
    get fullName(): string {
        return `${this.firstName} ${this.lastName}`;
    }

    @Exclude()
    readonly password: string;

    readonly passwordExpired: Date;

    @Exclude()
    readonly salt: string;

    readonly createdAt: Date;

    @Exclude()
    readonly updatedAt: Date;
}
