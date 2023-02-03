import { RoleEntity } from 'src/modules/role/repository/entities/role.entity';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';

export interface IUserEntity extends Omit<UserEntity, 'role'> {
    role: RoleEntity;
}
