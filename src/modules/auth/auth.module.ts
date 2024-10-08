import { DynamicModule, Module } from '@nestjs/common';
import { AuthJwtAccessStrategy } from 'src/modules/auth/guards/jwt/strategies/auth.jwt.access.strategy';
import { AuthJwtRefreshStrategy } from 'src/modules/auth/guards/jwt/strategies/auth.jwt.refresh.strategy';
import { AuthService } from 'src/modules/auth/services/auth.service';

@Module({
    providers: [AuthService],
    exports: [AuthService],
    controllers: [],
    imports: [],
})
export class AuthModule {
    static forRoot(): DynamicModule {
        return {
            module: AuthModule,
            providers: [AuthJwtAccessStrategy, AuthJwtRefreshStrategy],
            exports: [],
            controllers: [],
            imports: [],
        };
    }
}
