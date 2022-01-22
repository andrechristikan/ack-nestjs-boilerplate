import { Module } from '@nestjs/common';
import { AuthPublicController } from 'src/auth/auth.controller';
import { AuthModule } from 'src/auth/auth.module';
import { AwsModule } from 'src/aws/aws.module';
import { RoleModule } from 'src/role/role.module';
import { UserPublicController } from 'src/user/user.controller';
import { UserModule } from 'src/user/user.module';

@Module({
    controllers: [UserPublicController, AuthPublicController],
    providers: [],
    exports: [],
    imports: [UserModule, AwsModule, AuthModule, RoleModule],
})
export class RouterPublicModule {}
