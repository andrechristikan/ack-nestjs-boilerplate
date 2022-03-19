import { RequestQueryBaseListValidation } from 'src/utils/request/validation/request.query.base-list.validation';
import {
    ROLE_DEFAULT_PAGE,
    ROLE_DEFAULT_PER_PAGE,
    ROLE_DEFAULT_SORT,
} from '../role.constant';

export class RoleListValidation extends RequestQueryBaseListValidation {
    constructor() {
        super(ROLE_DEFAULT_SORT, ROLE_DEFAULT_PAGE, ROLE_DEFAULT_PER_PAGE);
    }
}
