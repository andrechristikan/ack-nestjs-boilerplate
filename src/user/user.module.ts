import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserEntity, UserDatabaseName, UserSchema } from 'src/user/user.schema';
import { UserService } from 'src/user/user.service';
import { UserController, UserPublicController } from 'src/user/user.controller';
import { PaginationModule } from 'src/pagination/pagination.module';
import { AwsModule } from 'src/aws/aws.module';
import { RoleModule } from 'src/role/role.module';

@Module({
    imports: [
        MongooseModule.forFeature([
            {
                name: UserEntity.name,
                schema: UserSchema,
                collection: UserDatabaseName
            }
        ]),
        PaginationModule,
        AwsModule,
        RoleModule
    ],
    exports: [UserService],
    providers: [UserService],
    controllers: [UserController, UserPublicController]
})
export class UserModule {}
