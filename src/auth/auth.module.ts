import { Module } from '@nestjs/common';
import { ConfigModule } from 'config/config.module';
import { AuthService } from 'auth/auth.service';

@Module({
    providers: [AuthService],
    exports: [AuthService],
    imports: [ConfigModule],
})
export class AuthModule {}
