import { AppUnknownException } from '@app/exceptions/app.unknown.exception';

/**
 * Raised at decoration time when a `*Protected` decorator finds a guard it depends on missing below it.
 * @public
 */
export class RequestProtectedGuardMissingException extends AppUnknownException {
    constructor(decorator: string, guard: string) {
        super(null, `${decorator} needs ${guard} applied below it`);
    }
}
