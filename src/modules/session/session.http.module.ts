import { SessionHttpService } from '@modules/session/services/http/session.http.service';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [SessionHttpService],
    exports: [SessionHttpService],
    imports: [],
})
export class SessionHttpModule {}
