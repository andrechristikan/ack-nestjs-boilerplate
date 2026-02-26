import { CountryPublicController } from '@modules/country/controllers/country.public.controller';
import { CountryModule } from '@modules/country/country.module';
import { HelloPublicController } from '@modules/hello/controllers/hello.public.controller';
import { HelloModule } from '@modules/hello/hello.module';
import { InvitePublicController } from '@modules/invite/controllers/invite.public.controller';
import { InviteModule } from '@modules/invite/invite.module';
import { TermPolicyPublicController } from '@modules/term-policy/controllers/term-policy.public.controller';
import { UserPublicController } from '@modules/user/controllers/user.public.controller';
import { UserModule } from '@modules/user/user.module';
import { Module } from '@nestjs/common';
import { withTenancyRoute } from '@modules/tenant/utils/tenant.toggle';
import { TenantRoutesPublicModule } from '@modules/tenant/tenant.routes.public.module';

/**
 * Public routes module that provides publicly accessible endpoints.
 * Contains controllers for countries, roles, hello world, users, term policies, and verification that don't require authentication.
 */
@Module({
    controllers: [
        CountryPublicController,
        HelloPublicController,
        InvitePublicController,
        UserPublicController,
        TermPolicyPublicController,
    ],
    providers: [],
    exports: [],
    imports: [
        CountryModule,
        HelloModule,
        InviteModule,
        UserModule,
        ...withTenancyRoute('/public', TenantRoutesPublicModule),
    ],
})
export class RoutesPublicModule {}
