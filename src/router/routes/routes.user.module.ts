import { ApiKeyModule } from '@modules/api-key/api-key.module';
import { RoleModule } from '@modules/role/role.module';
import { TermPolicyModule } from '@modules/term-policy/term-policy.module';
import { UserUserController } from '@modules/user/controllers/user.user.controller';
import { UserModule } from '@modules/user/user.module';
import { Module } from '@nestjs/common';

/**
 * User routes module that provides user-specific endpoints.
 * Contains controllers for user operations that require user-level authentication and authorization.
 */
@Module({
    controllers: [UserUserController],
    providers: [],
    exports: [],
    imports: [ApiKeyModule, TermPolicyModule, RoleModule, UserModule],
})
export class RoutesUserModule {}
