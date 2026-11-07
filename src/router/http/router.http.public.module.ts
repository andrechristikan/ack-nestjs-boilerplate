import { CountryPublicController } from '@modules/country/controllers/country.public.controller';
import { CountryUseCaseModule } from '@modules/country/country.use-case.module';
import { HelloPublicController } from '@modules/hello/controllers/hello.public.controller';
import { HelloUseCaseModule } from '@modules/hello/hello.use-case.module';
import { TermPolicyPublicController } from '@modules/term-policy/controllers/term-policy.public.controller';
import { TermPolicyUseCaseModule } from '@modules/term-policy/term-policy.use-case.module';
import { UserPublicController } from '@modules/user/controllers/user.public.controller';
import { UserUseCaseModule } from '@modules/user/user.use-case.module';
import { WorkspacePublicController } from '@modules/workspace/controllers/workspace.public.controller';
import { WorkspaceUseCaseModule } from '@modules/workspace/workspace.use-case.module';
import { Module } from '@nestjs/common';

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
    imports: [
        CountryUseCaseModule,
        HelloUseCaseModule,
        TermPolicyUseCaseModule,
        UserUseCaseModule,
        WorkspaceUseCaseModule,
    ],
})
export class RouterHttpPublicModule {}
