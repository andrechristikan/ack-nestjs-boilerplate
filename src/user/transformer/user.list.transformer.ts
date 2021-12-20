import { Exclude, Transform } from 'class-transformer';
import { Types } from 'mongoose';
import { IAwsResponse } from 'src/aws/aws.interface';

export class UserListTransformer {
    @Transform(({ value }) => {
        return `${value}`;
    })
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

    readonly updatedAt: Date;
}
