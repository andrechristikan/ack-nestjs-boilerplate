import { RequestQueryBaseListValidation } from 'src/utils/request/validation/request.query.base-list.validation';
import {
    PERMISSION_DEFAULT_PAGE,
    PERMISSION_DEFAULT_PER_PAGE,
    PERMISSION_DEFAULT_SORT,
} from '../permission.constant';

export default class PermissionListValidation extends RequestQueryBaseListValidation {
    constructor() {
        super(
            PERMISSION_DEFAULT_SORT,
            PERMISSION_DEFAULT_PAGE,
            PERMISSION_DEFAULT_PER_PAGE
        );
    }
}
