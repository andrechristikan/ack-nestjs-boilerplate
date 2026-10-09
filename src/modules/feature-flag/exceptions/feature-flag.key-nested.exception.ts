import { AppUnknownException } from '@app/exceptions/app.unknown.exception';

/**
 * Raised at decoration time when `FeatureFlagProtected` receives a key with dots.
 * @public
 */
export class FeatureFlagKeyNestedException extends AppUnknownException {
    constructor() {
        super(null, 'FeatureFlagProtected takes a bare key without dots');
    }
}
