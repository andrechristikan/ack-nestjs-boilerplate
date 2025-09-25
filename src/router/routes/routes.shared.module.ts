import { UserSharedController } from '@modules/user/controllers/user.shared.controller';
import { UserModule } from '@modules/user/user.module';
import { Module } from '@nestjs/common';

@Module({
    controllers: [UserSharedController],
    providers: [],
    exports: [],
    imports: [UserModule],
})
export class RoutesSharedModule {}
