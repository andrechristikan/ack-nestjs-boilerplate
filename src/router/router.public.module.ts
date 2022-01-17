import { Module } from '@nestjs/common';
import { AwsModule } from 'src/aws/aws.module';
import { UserPublicController } from 'src/user/user.controller';
import { UserModule } from 'src/user/user.module';

@Module({
    controllers: [UserPublicController],
    providers: [],
    exports: [],
    imports: [UserModule, AwsModule],
})
export class RouterPublicModule {}
