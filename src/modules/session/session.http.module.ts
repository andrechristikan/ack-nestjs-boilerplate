import { SessionHttpService } from '@modules/session/services/session.http.service';
import { UserDomainModule } from '@modules/user/user.domain.module';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [SessionHttpService],
    exports: [SessionHttpService],
    imports: [UserDomainModule],
})
export class SessionHttpModule {}
