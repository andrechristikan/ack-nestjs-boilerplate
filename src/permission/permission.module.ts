import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DATABASE_CONNECTION_NAME } from 'src/database/database.constant';
import {
    PermissionSeedService,
    PermissionService,
} from 'src/permission/permission.service';
import { PermissionDocument } from './permission.interface';
import {
    PermissionDatabaseName,
    PermissionEntity,
    PermissionSchema,
} from './permission.schema';

@Module({
    controllers: [],
    providers: [PermissionService, PermissionSeedService],
    exports: [PermissionService, PermissionSeedService],
    imports: [
        MongooseModule.forFeatureAsync(
            [
                {
                    name: PermissionEntity.name,
                    useFactory: () => {
                        const schema = PermissionSchema;
                        schema.pre<PermissionDocument>('save', function (next) {
                            this.code = this.code.toUpperCase();
                            this.name = this.code.toLowerCase();
                            next();
                        });
                        return schema;
                    },
                    collection: PermissionDatabaseName,
                },
            ],
            DATABASE_CONNECTION_NAME
        ),
    ],
})
export class PermissionModule {}
