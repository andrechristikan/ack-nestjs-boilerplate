import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumCountryStatusCodeError } from '@modules/country/enums/country.status-code.enum';

/**
 * Raised when the requested country does not exist.
 * @public
 */
export class CountryNotFoundException extends AppBaseException {
    readonly module = 'country';
    readonly statusCode = EnumCountryStatusCodeError.notFound;
    readonly statusCodeKey = EnumCountryStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.NOT_FOUND;

    constructor() {
        super('country.error.notFound');
    }
}
