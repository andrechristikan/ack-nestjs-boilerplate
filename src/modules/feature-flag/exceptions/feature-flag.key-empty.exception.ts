import { AppUnknownException } from '@app/exceptions/app.unknown.exception';

/**
 * Raised at decoration time when `FeatureFlagProtected` receives an empty key or an empty key segment.
 * @public
 */
export class FeatureFlagKeyEmptyException extends AppUnknownException {
    constructor() {
        super(null, 'FeatureFlagProtected needs a non-empty key');
    }
}
