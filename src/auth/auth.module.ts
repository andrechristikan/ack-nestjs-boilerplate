import { Module } from '@nestjs/common';
import { AuthService } from 'auth/auth.service';

@Module({
    providers: [AuthService],
    exports: [AuthService],
    imports: [],
})
export class AuthModule {}
