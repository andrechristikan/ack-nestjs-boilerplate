import { RequestQueryBaseListValidation } from 'src/utils/request/validation/request.query.base-list.validation';
import {
    USER_DEFAULT_AVAILABLE_SORT,
    USER_DEFAULT_SORT,
} from '../user.constant';

export class UserListValidation extends RequestQueryBaseListValidation {
    constructor() {
        super(USER_DEFAULT_SORT, USER_DEFAULT_AVAILABLE_SORT);
    }
}
