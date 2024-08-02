import { Module } from '@nestjs/common';
import { AwsModule } from 'src/common/aws/aws.module';
import { AuthModule } from 'src/modules/auth/auth.module';
import { AuthSharedController } from 'src/modules/auth/controllers/auth.shared.controller';
import { EmailModule } from 'src/modules/email/email.module';
import { UserSharedController } from 'src/modules/user/controllers/user.shared.controller';
import { UserModule } from 'src/modules/user/user.module';

@Module({
    controllers: [UserSharedController, AuthSharedController],
    providers: [],
    exports: [],
    imports: [UserModule, AwsModule, EmailModule, AuthModule],
})
export class RoutesSharedModule {}
