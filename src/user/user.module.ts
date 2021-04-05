import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserEntity, UserDatabaseName, UserSchema } from 'src/user/user.schema';
import { UserService } from 'src/user/user.service';
import { UserController } from 'src/user/user.controller';
import { RoleDatabaseName, RoleEntity, RoleSchema } from 'src/role/role.schema';
import {
    AbilityDatabaseName,
    AbilityEntity,
    AbilitySchema
} from 'src/ability/ability.schema';
import { CaslModule } from 'src/casl/casl.module';

@Module({
    imports: [
        MongooseModule.forFeature([
            {
                name: UserEntity.name,
                schema: UserSchema,
                collection: UserDatabaseName
            }
        ]),
        MongooseModule.forFeature([
            {
                name: RoleEntity.name,
                schema: RoleSchema,
                collection: RoleDatabaseName
            }
        ]),
        MongooseModule.forFeature([
            {
                name: AbilityEntity.name,
                schema: AbilitySchema,
                collection: AbilityDatabaseName
            }
        ]),
        CaslModule
    ],
    exports: [UserService],
    providers: [UserService],
    controllers: [UserController]
})
export class UserModule {}
