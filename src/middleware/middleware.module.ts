import {
    HttpDebuggerMiddleware,
    HttpDebuggerResponseMiddleware,
} from 'src/middleware/http-debugger/http-debugger.middleware';
import { HelmetMiddleware } from 'src/middleware/helmet/helmet.middleware';
import { RateLimitMiddleware } from 'src/middleware/rate-limit/rate-limit.middleware';
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { CorsMiddleware } from './cors/cors.middleware';
import {
    HtmlBodyParserMiddleware,
    JsonBodyParserMiddleware,
    RawBodyParserMiddleware,
    TextBodyParserMiddleware,
    UrlencodedBodyParserMiddleware,
} from './body-parser/body-parser.middleware';
import {
    UserAdminController,
    UserPublicController,
} from 'src/user/user.controller';
import { AuthController, AuthPublicController } from 'src/auth/auth.controller';
import { RoleAdminController } from 'src/role/role.controller';
import { PermissionAdminController } from 'src/permission/permission.controller';
import { HealthController } from 'src/health/health.controller';
import { MessageEnumController } from 'src/message/message.controller';
import { TestingController } from 'src/testing/testing.controller';

@Module({})
export class MiddlewareModule implements NestModule {
    configure(consumer: MiddlewareConsumer): void {
        consumer
            .apply(
                JsonBodyParserMiddleware,
                RawBodyParserMiddleware,
                HtmlBodyParserMiddleware,
                TextBodyParserMiddleware,
                UrlencodedBodyParserMiddleware,
                CorsMiddleware,
                HttpDebuggerResponseMiddleware,
                HttpDebuggerMiddleware,
                HelmetMiddleware,
                RateLimitMiddleware
            )
            .forRoutes(
                UserPublicController,
                AuthPublicController,
                RoleAdminController,
                UserAdminController,
                PermissionAdminController,
                AuthController,
                HealthController,
                MessageEnumController,
                TestingController
            );
    }
}
