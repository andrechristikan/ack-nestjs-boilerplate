import { IRoleEntity } from 'src/modules/role/interfaces/role.interface';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';

export interface IUserEntity extends Omit<UserEntity, 'role'> {
    role: IRoleEntity;
}
