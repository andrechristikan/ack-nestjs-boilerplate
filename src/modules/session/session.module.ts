import { Module } from '@nestjs/common';
import { SessionService } from '@modules/session/services/session.service';
import { SessionSharedModule } from '@modules/session/session.shared.module';

@Module({
    imports: [SessionSharedModule],
    exports: [SessionService],
    providers: [SessionService],
    controllers: [],
})
export class SessionModule {}
