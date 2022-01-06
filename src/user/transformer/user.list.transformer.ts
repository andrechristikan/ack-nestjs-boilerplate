import { Exclude, Type } from 'class-transformer';
import { Types } from 'mongoose';
import { IAwsResponse } from 'src/aws/aws.interface';

export class UserListTransformer {
    @Type(() => String)
    readonly _id: string;

    @Exclude()
    readonly role: Types.ObjectId;

    readonly email: string;
    readonly mobileNumber: string;
    readonly isActive: boolean;
    readonly firstName: string;
    readonly lastName: string;

    @Exclude()
    readonly photo?: IAwsResponse;

    @Exclude()
    readonly password: string;

    readonly createdAt: Date;

    @Exclude()
    readonly updatedAt: Date;
}
