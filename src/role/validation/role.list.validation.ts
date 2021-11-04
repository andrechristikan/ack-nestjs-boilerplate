import { RequestQueryBaseListValidation } from 'src/request/validation/request.query.base-list.validation';
import { ROLE_DEFAULT_SORT } from '../role.constant';

export class RoleListValidation extends RequestQueryBaseListValidation {
    constructor() {
        super(ROLE_DEFAULT_SORT);
    }
}
