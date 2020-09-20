import { Module } from '@nestjs/common';
import { ConfigModule } from 'common/config/config.module';
import { AuthService } from 'components/auth/auth.service';

@Module({
    providers: [AuthService],
    exports: [AuthService],
    imports: [ConfigModule],
})
export class AuthModule {}
