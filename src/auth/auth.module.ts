import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtStrategy } from 'src/auth/guard/jwt/auth.jwt.strategy';
import { DATABASE_CONNECTION_NAME } from 'src/database/database.constant';
import { ApiKeyStrategy } from './guard/api-key/auth.api-key.strategy';
import { JwtRefreshStrategy } from './guard/jwt-refresh/auth.jwt-refresh.strategy';
import {
    AuthApiDatabaseName,
    AuthApiEntity,
    AuthApiSchema,
} from './schema/auth.api.schema';
import { AuthApiService } from './service/auth.api.service';
import { AuthService } from './service/auth.service';

@Module({
    providers: [
        AuthService,
        AuthApiService,
        JwtStrategy,
        JwtRefreshStrategy,
        ApiKeyStrategy,
    ],
    exports: [AuthService, AuthApiService],
    controllers: [],
    imports: [
        MongooseModule.forFeature(
            [
                {
                    name: AuthApiEntity.name,
                    schema: AuthApiSchema,
                    collection: AuthApiDatabaseName,
                },
            ],
            DATABASE_CONNECTION_NAME
        ),
    ],
})
export class AuthModule {}
