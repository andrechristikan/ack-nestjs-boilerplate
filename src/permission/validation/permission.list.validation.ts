import { RequestQueryBaseListValidation } from 'src/request/validation/request.query.base-list.validation';
import { PERMISSION_DEFAULT_SORT } from '../permission.constant';

export class PermissionListValidation extends RequestQueryBaseListValidation {
    constructor() {
        super(PERMISSION_DEFAULT_SORT);
    }
}
