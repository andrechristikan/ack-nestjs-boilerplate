import { AuthModule } from '@modules/auth/auth.module';
import { CountryPublicController } from '@modules/country/controllers/country.public.controller';
import { CountryModule } from '@modules/country/country.module';
import { HelloPublicController } from '@modules/hello/controllers/hello.public.controller';
import { HelloModule } from '@modules/hello/hello.module';
import { RolePublicController } from '@modules/role/controllers/role.public.controller';
import { TermPolicyPublicController } from '@modules/term-policy/controllers/term-policy.public.controller';
import { UserPublicController } from '@modules/user/controllers/user.public.controller';
import { UserModule } from '@modules/user/user.module';
import { Module } from '@nestjs/common';

/**
 * Public routes module that provides publicly accessible endpoints.
 * Contains controllers for countries, roles, hello world, users, term policies, and verification that don't require authentication.
 */
@Module({
    controllers: [
        CountryPublicController,
        RolePublicController,
        HelloPublicController,
        UserPublicController,
        TermPolicyPublicController,
    ],
    providers: [],
    exports: [],
    imports: [CountryModule, HelloModule, UserModule, AuthModule],
})
export class RoutesPublicModule {}
