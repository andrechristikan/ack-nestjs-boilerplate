import { Injectable } from '@nestjs/common';
import { DatabasePostgresRepositoryAbstract } from 'src/common/database/abstracts/database.postgres-repository.abstract';
import { DatabasePostgresModel } from 'src/common/database/decorators/database.decorator';
import { IDatabaseRepository } from 'src/common/database/interfaces/database.repository.interface';
import { RolePostgresEntity } from 'src/modules/role/repository/entities/role.postgres.entity';
import { UserPostgresEntity } from 'src/modules/user/repository/entities/user.postgres.entity';
import { Repository } from 'typeorm';

@Injectable()
export class UserPostgresRepository
    extends DatabasePostgresRepositoryAbstract<UserPostgresEntity>
    implements IDatabaseRepository<UserPostgresEntity>
{
    constructor(
        @DatabasePostgresModel(UserPostgresEntity)
        private readonly userModel: Repository<UserPostgresEntity>
    ) {
        super(userModel, {
            role: true,
        });
    }
}
