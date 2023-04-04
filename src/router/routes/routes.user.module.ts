import { Module } from '@nestjs/common';
import { ApiKeyModule } from 'src/common/api-key/api-key.module';
import { ApiKeyUserController } from 'src/common/api-key/controllers/api-key.user.controller';
import { AwsModule } from 'src/common/aws/aws.module';
import { UserModule } from 'src/modules/user/user.module';

@Module({
    controllers: [ApiKeyUserController],
    providers: [],
    exports: [],
    imports: [UserModule, ApiKeyModule, AwsModule],
})
export class RoutesUserModule {}
