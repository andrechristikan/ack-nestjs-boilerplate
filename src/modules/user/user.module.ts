import { Module } from '@nestjs/common';
import { UserService } from '@modules/user/services/user.service';
import { AwsModule } from '@common/aws/aws.module';
import { PasswordHistoryModule } from '@modules/password-history/password-history.module';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { UserUtil } from '@modules/user/utils/user.util';
import { CountryModule } from '@modules/country/country.module';
import { WorkspaceModule } from '@modules/workspace/workspace.module';

/**
 * Exports user providers; controllers are wired through the router
 * (`routes.shared` / `routes.admin`), not registered here.
 */
@Module({
    imports: [PasswordHistoryModule, AwsModule, CountryModule, WorkspaceModule],
    exports: [UserService, UserRepository, UserUtil],
    providers: [UserService, UserRepository, UserUtil],
    controllers: [],
})
export class UserModule {}
