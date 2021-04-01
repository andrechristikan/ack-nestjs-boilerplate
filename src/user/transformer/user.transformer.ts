import { Exclude, Expose } from 'class-transformer';
import { ObjectId } from 'mongoose';

export class UserTransformer {
    @Exclude({ toPlainOnly: true })
    _id: ObjectId;

    @Exclude({ toPlainOnly: true })
    roleId: ObjectId;

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

    @Expose()
    get role(): string {
        return `${this.roleId}`;
    }
}
