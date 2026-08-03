# File Uploads

Handle file uploads with local or S3 storage.

## Setup

```typescript
import { uploadMiddleware, createFileRoutes } from '@reacto-org/server';

// Add upload middleware
app.use('/api/upload', uploadMiddleware({ dest: './uploads' }));

// Or add file routes
app.use('/api/files', createFileRoutes({ uploadDir: './uploads' }));
```

## Upload Middleware

```typescript
import { uploadMiddleware } from '@reacto-org/server';

app.post('/api/upload', uploadMiddleware({
  dest: './uploads',
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
}), (req, res) => {
  console.log(req.file); // Uploaded file info
  res.json({ url: `/uploads/${req.file.filename}` });
});
```

## Model Field Uploads

```typescript
@Model({ tableName: 'users' })
export class User {
  @Field({
    type: 'image',
    uploadTo: 'avatars/',
    allowedMimeTypes: ['image/jpeg', 'image/png'],
    maxFileSize: 5 * 1024 * 1024, // 5MB
  })
  avatarUrl!: string;
}
```

## S3 Storage

```typescript
import { configureStorage } from '@reacto-org/core';

configureStorage({
  type: 's3',
  bucket: 'my-bucket',
  region: 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});
```

## File Validation

```typescript
import { validateFile } from '@reacto-org/server';

const errors = validateFile(file, {
  maxSize: 10 * 1024 * 1024,
  allowedMimeTypes: ['image/jpeg', 'image/png'],
});

if (errors.length > 0) {
  return res.status(400).json({ errors });
}
```

## Serving Static Files

```typescript
import express from 'express';

app.use('/uploads', express.static('./uploads'));
```
