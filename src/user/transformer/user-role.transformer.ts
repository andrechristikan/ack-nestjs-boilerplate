import { Exclude, Expose } from 'class-transformer';
import { ObjectId } from 'mongoose';
import { stringify } from 'querystring';
import { IRoleWithAbilities } from 'src/role/role.interface';

export class UserRoleTransformer {
    @Exclude({ toPlainOnly: true })
    _id: ObjectId;

    @Exclude({ toPlainOnly: true })
    roleId: Record<string, any>;

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
    get role(): Record<string, any> {
        const abilities: Record<string, any>[] = this.roleId.abilities.map(
            (value: Record<string, any>) => {
                return {
                    id: value._id,
                    name: value.name,
                    isActive: value.isActive
                };
            }
        );

        return {
            id: this.roleId._id,
            name: this.roleId.name,
            abilities
        };
    }
}
