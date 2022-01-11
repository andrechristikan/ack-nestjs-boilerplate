import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserEntity, UserDatabaseName, UserSchema } from 'src/user/user.schema';
import { UserService } from 'src/user/user.service';
import {
    UserAdminController,
    UserPublicController
} from 'src/user/user.controller';
import { PaginationModule } from 'src/pagination/pagination.module';
import { AwsModule } from 'src/aws/aws.module';
import { AuthModule } from 'src/auth/auth.module';

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
        forwardRef(() => AuthModule)
    ],
    exports: [UserService],
    providers: [UserService],
    controllers: [UserAdminController, UserPublicController]
})
export class UserModule {}
