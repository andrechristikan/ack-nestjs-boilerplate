import {
    CountryDoc,
    CountryEntity,
} from 'src/modules/country/repository/entities/country.entity';
import {
    RoleDoc,
    RoleEntity,
} from 'src/modules/role/repository/entities/role.entity';
import {
    UserPasswordHistoryDoc,
    UserPasswordHistoryEntity,
} from 'src/modules/user/repository/entities/user-password-history.entity';
import {
    UserStateHistoryDoc,
    UserStateHistoryEntity,
} from 'src/modules/user/repository/entities/user-state-history.entity';
import {
    UserDoc,
    UserEntity,
    UserMobileNumberDoc,
    UserMobileNumberEntity,
} from 'src/modules/user/repository/entities/user.entity';

export interface IUserMobileNumberEntity
    extends Omit<UserMobileNumberEntity, 'country'> {
    country: CountryEntity;
}

export interface IUserMobileNumberDoc
    extends Omit<UserMobileNumberDoc, 'country'> {
    country: CountryDoc;
}

export interface IUserEntity
    extends Omit<UserEntity, 'role' | 'country' | 'mobileNumber'> {
    role: RoleEntity;
    county: CountryEntity;
    mobileNumber?: IUserMobileNumberEntity;
}

export interface IUserDoc
    extends Omit<UserDoc, 'role' | 'country' | 'mobileNumber'> {
    role: RoleDoc;
    country: CountryDoc;
    mobileNumber?: IUserMobileNumberDoc;
}

export interface IUserPasswordHistoryEntity
    extends Omit<UserPasswordHistoryEntity, 'by'> {
    by: UserEntity;
}

export interface IUserPasswordHistoryDoc
    extends Omit<UserPasswordHistoryDoc, 'by'> {
    by: UserDoc;
}

export interface IUserStateHistoryEntity
    extends Omit<UserStateHistoryEntity, 'by'> {
    by: UserEntity;
}

export interface IUserStateHistoryDoc extends Omit<UserStateHistoryDoc, 'by'> {
    by: UserDoc;
}
