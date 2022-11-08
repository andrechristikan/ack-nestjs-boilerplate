import { Module } from '@nestjs/common';
import { DATABASE_CONNECTION_NAME } from 'src/common/database/constants/database.constant';
import { DatabaseRepositoryModule } from 'src/common/database/database.repository.module';
import { RoleRepository } from 'src/modules/role/repository/entities/role.entity';
import {
    RoleMongoEntity,
    RoleMongoSchema,
} from 'src/modules/role/repository/entities/role.mongo.entity';
import { RolePostgresEntity } from 'src/modules/role/repository/entities/role.postgres.entity';
import { RoleMongoRepository } from 'src/modules/role/repository/repositories/role.mongo.repository';
import { RolePostgresRepository } from 'src/modules/role/repository/repositories/role.postgres.repository';
import { RoleEnumService } from 'src/modules/role/services/role.enum.service';
import { RoleBulkService } from './services/role.bulk.service';
import { RoleService } from './services/role.service';

@Module({
    controllers: [],
    providers: [RoleService, RoleBulkService, RoleEnumService],
    exports: [RoleService, RoleBulkService, RoleEnumService],
    imports: [
        DatabaseRepositoryModule.forFutureAsync({
            name: RoleRepository,
            mongo: {
                schema: RoleMongoSchema,
                entity: RoleMongoEntity,
                repository: RoleMongoRepository,
            },
            postgres: {
                entity: RolePostgresEntity,
                repository: RolePostgresRepository,
            },
            connectionName: DATABASE_CONNECTION_NAME,
        }),
    ],
})
export class RoleModule {}
