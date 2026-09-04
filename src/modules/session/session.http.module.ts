import { SessionModule } from '@modules/session/session.module';
import { SessionHttpService } from '@modules/session/services/session.http.service';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [SessionHttpService],
    exports: [SessionHttpService],
    imports: [SessionModule],
})
export class SessionHttpModule {}
