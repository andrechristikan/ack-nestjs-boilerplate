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
    imports: [UserModule],
})
export class RoutesUserModule {}
