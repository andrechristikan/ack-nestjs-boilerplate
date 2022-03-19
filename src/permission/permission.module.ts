import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DATABASE_CONNECTION_NAME } from 'src/database/database.constant';
import {
    PermissionDatabaseName,
    PermissionEntity,
    PermissionSchema,
} from './permission.schema';
import { PermissionBulkService } from './service/permission.bulk.service';
import { PermissionService } from './service/permission.service';

@Module({
    controllers: [],
    providers: [PermissionService, PermissionBulkService],
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
