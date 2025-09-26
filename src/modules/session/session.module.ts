import { Module } from '@nestjs/common';
import { UserService } from '@modules/user/services/user.service';
import { UserUtil } from '@modules/user/utils/user.util';
import { SessionUtil } from '@modules/session/utils/session.util';

@Module({
    imports: [],
    exports: [SessionUtil],
    providers: [SessionUtil],
    controllers: [],
})
export class SessionModule {}
