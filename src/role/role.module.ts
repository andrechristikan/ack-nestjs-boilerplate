import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DATABASE_CONNECTION_NAME } from 'src/database/database.constant';
import { RoleBulkService, RoleService } from 'src/role/role.service';
import { RoleDocument } from './role.interface';
import { RoleDatabaseName, RoleEntity, RoleSchema } from './role.schema';

@Module({
    controllers: [],
    providers: [RoleService, RoleBulkService],
    exports: [RoleService, RoleBulkService],
    imports: [
        MongooseModule.forFeatureAsync(
            [
                {
                    name: RoleEntity.name,
                    useFactory: () => {
                        const schema = RoleSchema;
                        schema.pre<RoleDocument>('save', function (next) {
                            this.name = this.name.toLowerCase();
                            next();
                        });
                        return schema;
                    },
                    collection: RoleDatabaseName,
                },
            ],
            DATABASE_CONNECTION_NAME
        ),
    ],
})
export class RoleModule {}
