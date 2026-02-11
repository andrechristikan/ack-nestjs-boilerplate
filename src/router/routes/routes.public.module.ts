import { CountryPublicController } from '@modules/country/controllers/country.public.controller';
import { CountryModule } from '@modules/country/country.module';
import { HelloPublicController } from '@modules/hello/controllers/hello.public.controller';
import { HelloModule } from '@modules/hello/hello.module';
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
        HelloPublicController,
        UserPublicController,
        TermPolicyPublicController,
    ],
    providers: [],
    exports: [],
    imports: [CountryModule, HelloModule, UserModule],
})
export class RoutesPublicModule {}
