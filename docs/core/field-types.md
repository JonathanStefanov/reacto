# Field Types

All supported field types and their options.

## String Types

### `string`
Text with optional max length.

```typescript
@Field({ type: 'string', maxLength: 255 })
title!: string;
```

### `text`
Long text (no max length).

```typescript
@Field({ type: 'text' })
content!: string;
```

### `email`
Email with built-in validation.

```typescript
@Field({ type: 'email', unique: true })
email!: string;
```

### `url`
URL with built-in validation.

```typescript
@Field({ type: 'url' })
website!: string;
```

## Numeric Types

### `integer`
Whole numbers.

```typescript
@Field({ type: 'integer' })
age!: number;
```

### `bigInteger`
Large whole numbers.

```typescript
@Field({ type: 'bigInteger' })
views!: number;
```

### `float`
Floating point numbers.

```typescript
@Field({ type: 'float' })
price!: number;
```

### `decimal`
Precise decimal numbers.

```typescript
@Field({ type: 'decimal', precision: 10, scale: 2 })
balance!: number;
```

## Boolean & Date Types

### `boolean`
True/false values.

```typescript
@Field({ type: 'boolean', default: false })
isActive!: boolean;
```

### `date`
Date only (no time).

```typescript
@Field({ type: 'date' })
birthday!: Date;
```

### `datetime`
Date and time.

```typescript
@Field({ type: 'datetime', default: 'now' })
publishedAt!: Date;
```

## Special Types

### `uuid`
UUID v4.

```typescript
@Field({ type: 'uuid', unique: true })
token!: string;
```

### `json`
JSON data.

```typescript
@Field({ type: 'json' })
metadata!: Record<string, unknown>;
```

### `file`
File path (for uploads).

```typescript
@Field({ type: 'file', uploadTo: 'documents/' })
document!: string;
```

### `image`
Image path (for uploads).

```typescript
@Field({ type: 'image', uploadTo: 'avatars/', allowedMimeTypes: ['image/png', 'image/jpeg'] })
avatar!: string;
```

## Field Options Reference

| Option | Type | Description |
|---|---|---|
| `type` | `FieldType` | Required: field type |
| `primaryKey` | `boolean` | Mark as primary key |
| `autoIncrement` | `boolean` | Auto-increment value |
| `unique` | `boolean` | Unique constraint |
| `nullable` | `boolean` | Allow NULL values |
| `default` | `unknown` | Default value |
| `maxLength` | `number` | Max length for strings |
| `precision` | `number` | Precision for decimals |
| `scale` | `number` | Scale for decimals |
| `index` | `boolean` | Create database index |
| `choices` | `Record` | Allowed values |
| `verboseName` | `string` | Human-readable name |
| `helpText` | `string` | Help text |
| `dbColumn` | `string` | Custom column name |
| `validators` | `Validator[]` | Custom validators |
| `uploadTo` | `string` | Upload directory |
| `allowedMimeTypes` | `string[]` | Allowed MIME types |
| `maxFileSize` | `number` | Max file size in bytes |
