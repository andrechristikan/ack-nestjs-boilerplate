import { Exclude, Expose, Transform } from 'class-transformer';
import { ObjectId } from 'mongoose';

export class UserTransformer {
    @Exclude({ toPlainOnly: true })
    _id: ObjectId;

    @Transform(({ value }) => {
        return `${value}`;
    })
    role: string;

    firstName: string;
    lastName: string;
    email: string;
    mobileNumber: string;
    isAdmin: boolean;

    @Exclude()
    password: string;

    @Exclude()
    __v: string;

    @Expose()
    get id(): string {
        return `${this._id}`;
    }
    
}

