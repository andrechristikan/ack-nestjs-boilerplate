import { UserUserController } from '@modules/user/controllers/user.user.controller';
import { UserModule } from '@modules/user/user.module';
import { Module } from '@nestjs/common';

@Module({
    controllers: [UserUserController],
    providers: [],
    exports: [],
    imports: [UserModule],
})
export class RoutesUserModule {}
