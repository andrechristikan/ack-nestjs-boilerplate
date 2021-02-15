import { Exclude, Expose } from 'class-transformer';
import { ObjectId } from 'mongoose';

export class UserTransformer {
    @Exclude({ toPlainOnly: true })
    _id: ObjectId;

    firstName: string;
    lastName: string;
    email: string;
    mobileNumber: string;

    @Exclude()
    password: string;

    @Exclude()
    salt: string;

    @Exclude()
    __v: string;

    @Expose()
    get id(): string {
        return `${this._id}`;
    }

}
