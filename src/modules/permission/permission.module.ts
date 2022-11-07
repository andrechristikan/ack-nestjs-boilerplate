import { Module } from '@nestjs/common';
import { DATABASE_CONNECTION_NAME } from 'src/common/database/constants/database.constant';
import { DatabaseRepositoryModule } from 'src/common/database/database.repository.module';
import { PermissionRepository } from 'src/modules/permission/repository/entities/permission.entity';
import {
    PermissionMongoEntity,
    PermissionMongoSchema,
} from 'src/modules/permission/repository/entities/permission.mongo.entity';
import { PermissionPostgresEntity } from 'src/modules/permission/repository/entities/permission.postgres.entity';
import { PermissionMongoRepository } from 'src/modules/permission/repository/repositories/permission.mongo.repository';
import { PermissionPostgresRepository } from 'src/modules/permission/repository/repositories/permission.postgres.repository';
import { PermissionBulkService } from './services/permission.bulk.service';
import { PermissionService } from './services/permission.service';

@Module({
    controllers: [],
    providers: [PermissionService, PermissionBulkService],
    exports: [PermissionService, PermissionBulkService],
    imports: [
        DatabaseRepositoryModule.forFutureAsync({
            name: PermissionRepository,
            mongo: {
                schema: PermissionMongoSchema,
                entity: PermissionMongoEntity,
                repository: PermissionMongoRepository,
            },
            postgres: {
                entity: PermissionPostgresEntity,
                repository: PermissionPostgresRepository,
            },
            connectionName: DATABASE_CONNECTION_NAME,
        }),
    ],
})
export class PermissionModule {}
