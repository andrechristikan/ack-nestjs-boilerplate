import {
    RoleDoc,
    RoleEntity,
} from 'src/common/role/repository/entities/role.entity';
import {
    UserDoc,
    UserEntity,
} from 'src/modules/user/repository/entities/user.entity';

export interface IUserEntity extends Omit<UserEntity, 'role'> {
    role: RoleEntity;
}

export interface IUserDoc extends Omit<UserDoc, 'role'> {
    role: RoleDoc;
}
