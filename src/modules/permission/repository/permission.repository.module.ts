import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DATABASE_CONNECTION_NAME } from 'src/common/database/constants/database.constant';
import {
    PermissionEntity,
    PermissionSchema,
} from 'src/modules/permission/repository/entities/permission.entity';
import { PermissionRepository } from 'src/modules/permission/repository/repositories/permission.repository';

@Module({
    providers: [PermissionRepository],
    exports: [PermissionRepository],
    controllers: [],
    imports: [
        MongooseModule.forFeature(
            [
                {
                    name: PermissionEntity.name,
                    schema: PermissionSchema,
                },
            ],
            DATABASE_CONNECTION_NAME
        ),
    ],
})
export class PermissionRepositoryModule {}
