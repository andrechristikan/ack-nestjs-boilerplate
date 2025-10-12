import { Module } from '@nestjs/common';
import { UserService } from '@modules/user/services/user.service';
import { UserUtil } from '@modules/user/utils/user.util';
import { BullModule } from '@nestjs/bullmq';
import { ENUM_WORKER_QUEUES } from '@workers/enums/worker.enum';
import { VerificationModule } from '@modules/verification/verification.module';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { CountryModule } from '@modules/country/country.module';
import { RoleModule } from '@modules/role/role.module';
import { AwsModule } from '@common/aws/aws.module';
import { AuthModule } from '@modules/auth/auth.module';
import { FileModule } from '@common/file/file.module';
import { SessionModule } from '@modules/session/session.module';
import { PasswordHistoryModule } from '@modules/password-history/password-history.module';

@Module({
    imports: [
        BullModule.registerQueue({
            name: ENUM_WORKER_QUEUES.EMAIL,
        }),
        VerificationModule,
        PasswordHistoryModule,
        CountryModule,
        RoleModule,
        AwsModule,
        AuthModule,
        FileModule,
        SessionModule,
    ],
    exports: [UserService, UserUtil, UserRepository],
    providers: [UserService, UserUtil, UserRepository],
    controllers: [],
})
export class UserModule {}
