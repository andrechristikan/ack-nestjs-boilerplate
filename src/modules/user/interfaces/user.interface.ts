import { IRoleEntity } from 'src/modules/role/interfaces/role.interface';
import { UserCreateDto } from 'src/modules/user/dtos/user.create.dto';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';

export interface IUserEntity extends Omit<UserEntity, 'role'> {
    role: IRoleEntity;
}

export interface IUserCreate extends UserCreateDto {
    passwordExpired: Date;
    salt: string;
}
