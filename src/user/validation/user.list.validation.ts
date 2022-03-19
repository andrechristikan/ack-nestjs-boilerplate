import { RequestQueryBaseListValidation } from 'src/utils/request/validation/request.query.base-list.validation';
import { USER_DEFAULT_SORT } from '../user.constant';

export default class UserListValidation extends RequestQueryBaseListValidation {
    constructor() {
        super(USER_DEFAULT_SORT);
    }
}
