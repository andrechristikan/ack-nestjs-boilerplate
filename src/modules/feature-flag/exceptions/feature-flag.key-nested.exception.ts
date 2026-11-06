import { AppUnknownException } from '@app/exceptions/app.unknown.exception';

/** @public */
export class FeatureFlagKeyNestedException extends AppUnknownException {
    constructor() {
        super(null, 'FeatureFlagProtected takes a bare key without dots');
    }
}
