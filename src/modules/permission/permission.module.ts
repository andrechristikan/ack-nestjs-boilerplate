import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DATABASE_CONNECTION_NAME } from 'src/common/database/constants/database.constant';
import { PermissionBulkRepository } from './repositories/permission.bulk.repository';
import { PermissionRepository } from './repositories/permission.repository';
import {
    PermissionDatabaseName,
    PermissionEntity,
    PermissionSchema,
} from './schemas/permission.schema';
import { PermissionBulkService } from './services/permission.bulk.service';
import { PermissionService } from './services/permission.service';

@Module({
    controllers: [],
    providers: [
        PermissionService,
        PermissionBulkService,
        PermissionRepository,
        PermissionBulkRepository,
    ],
    exports: [PermissionService, PermissionBulkService],
    imports: [
        MongooseModule.forFeature(
            [
                {
                    name: PermissionEntity.name,
                    schema: PermissionSchema,
                    collection: PermissionDatabaseName,
                },
            ],
            DATABASE_CONNECTION_NAME
        ),
    ],
})
export class PermissionModule {}
