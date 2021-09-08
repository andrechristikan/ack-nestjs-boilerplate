// $value
// $property
export default {
    default: 'Validation errors',
    maxLength: '$property has more elements than the maximum allowed.',
    minLength: '$property has less elements than the minimum allowed.',
    isString: '$property should be a type of string.',
    isNotEmpty: '$property cannot be empty.',
    isLowercase: '$property should be lowercase.',
    isOptional: '$property is optional.',
    isPositive: '$property should be a positive number.',
    isEmail: '$property should be a type of email.',
    isInt: '$property should be a number.',
    isNumberString: '$property should be a number.',
    isMongoId: '$property should reference with mongo object id.',
    isBoolean: '$property should be a boolean'
};
