import { SessionUtil } from '@modules/session/utils/session.util';
import { Global, Module } from '@nestjs/common';

/**
 * Global so the login cache helpers are reachable from any module context.
 */
@Global()
@Module({
    controllers: [],
    providers: [SessionUtil],
    exports: [SessionUtil],
    imports: [],
})
export class SessionUtilModule {}
