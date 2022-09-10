import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { DATABASE_CONNECTION_NAME } from 'src/common/database/constants/database.constant';
import { ApiKeyGuard } from './guards/api-key/auth.api-key.guard';
import { ApiKeyStrategy } from './guards/api-key/auth.api-key.strategy';
import { JwtRefreshStrategy } from './guards/jwt-refresh/auth.jwt-refresh.strategy';
import { JwtStrategy } from './guards/jwt/auth.jwt.strategy';
import {
    AuthApiDatabaseName,
    AuthApiEntity,
    AuthApiSchema,
} from './schemas/auth.api.schema';
import { AuthApiBulkService } from './services/auth.api.bulk.service';
import { AuthApiService } from './services/auth.api.service';
import { AuthEnumService } from './services/auth.enum.service';
import { AuthService } from './services/auth.service';

@Module({
    providers: [
        AuthService,
        AuthApiService,
        AuthApiBulkService,
        AuthEnumService,
        JwtStrategy,
        JwtRefreshStrategy,
        ApiKeyStrategy,
        {
            provide: APP_GUARD,
            useClass: ApiKeyGuard,
        },
    ],
    exports: [AuthService, AuthApiService, AuthApiBulkService, AuthEnumService],
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
