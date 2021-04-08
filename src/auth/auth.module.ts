import { Module } from '@nestjs/common';
import { AuthService } from 'src/auth/auth.service';
import { JwtStrategy } from 'src/auth/guard/jwt/jwt.strategy';
import { UserModule } from 'src/user/user.module';
import { AuthController } from 'src/auth/auth.controller';

@Module({
    providers: [AuthService, JwtStrategy],
    exports: [AuthService],
    controllers: [AuthController],
    imports: [UserModule]
})
export class AuthModule {}
