import { CountryPublicController } from '@modules/country/controllers/country.public.controller';
import { CountryModule } from '@modules/country/country.module';
import { HelloPublicController } from '@modules/hello/controllers/hello.public.controller';
import { HelloModule } from '@modules/hello/hello.module';
import { TermPolicyPublicController } from '@modules/term-policy/controllers/term-policy.public.controller';
import { UserPublicController } from '@modules/user/controllers/user.public.controller';
import { UserModule } from '@modules/user/user.module';
import { WorkspacePublicController } from '@modules/workspace/controllers/workspace.public.controller';
import { WorkspaceModule } from '@modules/workspace/workspace.module';
import { Module } from '@nestjs/common';

/**
 * Mounts unauthenticated public controllers: country, hello, user, term policy, and workspace.
 */
@Module({
    controllers: [
        CountryPublicController,
        HelloPublicController,
        UserPublicController,
        TermPolicyPublicController,
        WorkspacePublicController,
    ],
    providers: [],
    exports: [],
    imports: [CountryModule, HelloModule, UserModule, WorkspaceModule],
})
export class RoutesPublicModule {}
