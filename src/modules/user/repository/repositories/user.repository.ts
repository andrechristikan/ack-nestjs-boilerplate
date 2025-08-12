import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { InjectDatabaseModel } from '@common/database/decorators/database.decorator';
import { UserEntity } from '@modules/user/repository/entities/user.entity';
import { DatabaseRepositoryBase } from '@common/database/bases/database.repository';
import { IDatabaseExistReturn } from '@common/database/interfaces/database.interface';
import { ENUM_USER_STATUS } from '@modules/user/enums/user.enum';

@Injectable()
export class UserRepository extends DatabaseRepositoryBase<UserEntity> {
    constructor(
        @InjectDatabaseModel(UserEntity.name)
        private readonly userModel: Model<UserEntity>
    ) {
        super(userModel);
    }

    async existByEmail(email: string): Promise<IDatabaseExistReturn | null> {
        return this.exists({
            where: { email: email.toLowerCase() },
        });
    }

    async findOneByEmail(email: string): Promise<UserEntity | null> {
        return this.findOne({
            where: { email: email.toLowerCase() },
        });
    }

    async findOneByUsername(username: string): Promise<UserEntity | null> {
        return this.findOne({
            where: { username: username.toLowerCase() },
        });
    }

    // TODO: TEST JOINED QUERY
    async findOneActiveByEmail(email: string): Promise<UserEntity | null> {
        const user = await this.findOne({
            where: {
                email: email.toLowerCase(),
                status: ENUM_USER_STATUS.ACTIVE,
            },
            select: {
                _id: true,
                name: true,
                email: true,
            },
            join: {
                country: {
                    select: { alpha2Code: true, name: true },
                },
                role: {
                    select: { _id: true, name: true, type: true },
                    join: {
                        users: {
                            join: {
                                country: {
                                    select: {
                                        alpha2Code: true,
                                        name: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        return user;
    }
}
