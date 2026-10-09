import { AppUnknownException } from '@app/exceptions/app.unknown.exception';

/**
 * Raised at decoration time when `RequestEnvProtected` receives no environment.
 * @public
 */
export class RequestEnvProtectedEmptyException extends AppUnknownException {
    constructor() {
        super(null, 'RequestEnvProtected needs at least one environment');
    }
}
