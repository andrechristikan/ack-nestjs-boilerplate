import { AppUnknownException } from '@app/exceptions/app.unknown.exception';

/** @public */
export class FeatureFlagKeyEmptyException extends AppUnknownException {
    constructor() {
        super(null, 'FeatureFlagProtected needs a non-empty key');
    }
}
