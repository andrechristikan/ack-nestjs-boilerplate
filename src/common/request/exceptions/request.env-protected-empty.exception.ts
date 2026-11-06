import { AppUnknownException } from '@app/exceptions/app.unknown.exception';

/** @public */
export class RequestEnvProtectedEmptyException extends AppUnknownException {
    constructor() {
        super(null, 'RequestEnvProtected needs at least one environment');
    }
}
