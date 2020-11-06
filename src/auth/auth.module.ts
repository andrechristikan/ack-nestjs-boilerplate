import { Module } from '@nestjs/common';
import { AuthService } from 'auth/auth.service';
import { JwtModule } from '@nestjs/jwt';
import { JWT_SECRET_KEY, JWT_EXPIRATION_TIME } from 'auth/auth.constant';
import { JwtStrategy } from 'auth/guard/jwt.strategy';
import { UserModule } from 'user/user.module';
import { AuthController } from 'auth/auth.controller';

@Module({
    providers: [
        AuthService, 
        JwtStrategy
    ],
    exports: [AuthService],
    controllers: [AuthController],
    imports: [
        JwtModule.register({
            secret: JWT_SECRET_KEY,
            signOptions: { expiresIn: JWT_EXPIRATION_TIME },
        }),
        UserModule,
    ],
})
export class AuthModule {}
