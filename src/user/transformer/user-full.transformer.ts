import { Exclude, Expose, Transform } from 'class-transformer';
import { ObjectId } from 'mongoose';
import { AbilityDocument } from 'src/ability/ability.interface';
import { RoleDocument } from 'src/role/role.interface';

export class UserFullTransformer {
    @Exclude({ toPlainOnly: true })
    _id: ObjectId;

    @Transform(({ value }) => {
        const abilities: AbilityDocument = value.abilities.map(
            (val: AbilityDocument) => {
                return {
                    _id: `${val._id}`,
                    name: val.name
                };
            }
        );
        return {
            _id: `${value._id}`,
            name: value.name,
            abilities
        };
    })
    role: RoleDocument;

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
