# Validators

Validate field values before saving.

## Built-in Validators

```typescript
import { Validators } from '@reacto-org/core';

// Required
Validators.required(value, 'fieldName');

// String length
Validators.minLength(value, 'fieldName', 3);
Validators.maxLength(value, 'fieldName', 100);

// Numbers
Validators.min(value, 'fieldName', 0);
Validators.max(value, 'fieldName', 100);

// Pattern
Validators.pattern(value, 'fieldName', /^[a-z]+$/);

// Email
Validators.email(value, 'fieldName');

// URL
Validators.url(value, 'fieldName');

// One of
Validators.oneOf(value, 'fieldName', ['admin', 'user', 'mod']);
```

## Using Validators in Fields

```typescript
@Field({
  type: 'string',
  validators: [
    { name: 'minLength', validate: (v) => Validators.minLength(v, 'username', 3) },
  ],
})
username!: string;
```

## Custom Validators

```typescript
import { Validator } from '@reacto-org/core';

const noSpaces: Validator = {
  name: 'noSpaces',
  validate(value: unknown, fieldName: string): string | null {
    if (typeof value === 'string' && value.includes(' ')) {
      return `${fieldName} cannot contain spaces`;
    }
    return null;
  },
};

@Field({ type: 'string', validators: [noSpaces] })
username!: string;
```

## Validation in Signals

```typescript
@Signal('preSave')
validate() {
  const errors = validateModel(this, User.fields);
  if (Object.keys(errors).length > 0) {
    throw new ValidationError(errors);
  }
}
```

## ValidationError

```typescript
import { ValidationError } from '@reacto-org/core';

throw new ValidationError({
  email: ['Email is required', 'Email must be valid'],
  username: ['Username too short'],
});
```
