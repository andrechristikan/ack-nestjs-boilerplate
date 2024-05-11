import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DATABASE_CONNECTION_NAME } from 'src/common/database/constants/database.constant';
import {
    RoleEntity,
    RoleSchema,
} from 'src/modules/role/repository/entities/role.entity';
import { RoleRepository } from 'src/modules/role/repository/repositories/role.repository';

@Module({
    providers: [RoleRepository],
    exports: [RoleRepository],
    controllers: [],
    imports: [
        MongooseModule.forFeature(
            [
                {
                    name: RoleEntity.name,
                    schema: RoleSchema,
                },
            ],
            DATABASE_CONNECTION_NAME
        ),
    ],
})
export class RoleRepositoryModule {}
