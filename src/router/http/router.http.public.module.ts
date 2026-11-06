import { CountryPublicController } from '@modules/country/controllers/country.public.controller';
import { CountryHttpModule } from '@modules/country/country.http.module';
import { HelloPublicController } from '@modules/hello/controllers/hello.public.controller';
import { HelloHttpModule } from '@modules/hello/hello.http.module';
import { TermPolicyPublicController } from '@modules/term-policy/controllers/term-policy.public.controller';
import { TermPolicyHttpModule } from '@modules/term-policy/term-policy.http.module';
import { UserPublicController } from '@modules/user/controllers/user.public.controller';
import { UserHttpModule } from '@modules/user/user.http.module';
import { WorkspacePublicController } from '@modules/workspace/controllers/workspace.public.controller';
import { WorkspaceHttpModule } from '@modules/workspace/workspace.http.module';
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
        CountryHttpModule,
        HelloHttpModule,
        TermPolicyHttpModule,
        UserHttpModule,
        WorkspaceHttpModule,
    ],
})
export class RouterHttpPublicModule {}
