import {
    CountryDoc,
    CountryEntity,
} from 'src/modules/country/repository/entities/country.entity';
import {
    RoleDoc,
    RoleEntity,
} from 'src/modules/role/repository/entities/role.entity';
import {
    UserDoc,
    UserEntity,
} from 'src/modules/user/repository/entities/user.entity';

export interface IUserEntity extends Omit<UserEntity, 'role' | 'country'> {
    role: RoleEntity;
    county: CountryEntity;
}

export interface IUserDoc extends Omit<UserDoc, 'role' | 'country'> {
    role: RoleDoc;
    country: CountryDoc;
}
