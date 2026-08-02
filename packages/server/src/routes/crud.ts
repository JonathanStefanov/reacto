/**
 * @reacto/server — Auto-generated CRUD routes for models
 *
 * Generates REST endpoints:
 *   GET    /           → List all (with pagination, filtering, ordering)
 *   POST   /           → Create
 *   GET    /:id        → Retrieve by ID
 *   PUT    /:id        → Full update
 *   PATCH  /:id        → Partial update
 *   DELETE /:id        → Delete
 *   GET    /count      → Count
 *   POST   /bulk       → Bulk create
 *   GET    /:id/<relation> → Nested relation routes
 */
import { Router, Request, Response, NextFunction } from 'express';
import { ModelManager, getModel } from '@reacto/core';
import type { ModelClass } from '@reacto/core';

/**
 * Generate CRUD routes for a model.
 */
export function generateCrudRoutes(modelClass: ModelClass): Router {
  const router = Router();

  // Helper to safely get string from query
  const getString = (val: unknown): string | undefined => {
    if (val === undefined) return undefined;
    return Array.isArray(val) ? String(val[0]) : String(val);
  };

  // ─── GET / — List with pagination, filtering, ordering ──────────────────

  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      let qs = ModelManager.objects(modelClass);

      // Filtering: ?field=value
      const filterableFields = Array.from(modelClass.fields.keys());
      const filters: Record<string, unknown> = {};
      for (const field of filterableFields) {
        const val = req.query[field];
        if (val !== undefined) {
          filters[field] = Array.isArray(val) ? val[0] : val;
        }
      }
      if (Object.keys(filters).length > 0) {
        qs = qs.filter(filters);
      }

      // Eager loading: ?with=author,category
      const withParam = getString(req.query.with);
      if (withParam) {
        const relations = withParam.split(',').map((r: string) => r.trim());
        qs = qs.with(...relations);
      }

      // Ordering: ?orderBy=field or ?orderBy=-field
      const orderBy = getString(req.query.orderBy);
      if (orderBy) {
        const orderFields = orderBy.split(',');
        qs = qs.orderBy(...orderFields);
      }

      // Pagination: ?page=1&pageSize=20
      const page = Math.max(1, parseInt(getString(req.query.page) ?? '1', 10));
      const pageSize = Math.min(100, Math.max(1, parseInt(getString(req.query.pageSize) ?? '20', 10)));
      const offset = (page - 1) * pageSize;

      const total = await qs.count();
      const results = await qs.limit(pageSize).offset(offset).all();

      res.json({
        data: results.map((r) => r.toJSON()),
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      });
    } catch (error) {
      next(error);
    }
  });

  // ─── GET /count — Count records ─────────────────────────────────────────

  router.get('/count', async (req: Request, res: Response, next: NextFunction) => {
    try {
      let qs = ModelManager.objects(modelClass);

      const filterableFields = Array.from(modelClass.fields.keys());
      const filters: Record<string, unknown> = {};
      for (const field of filterableFields) {
        const val = req.query[field];
        if (val !== undefined) {
          filters[field] = Array.isArray(val) ? val[0] : val;
        }
      }
      if (Object.keys(filters).length > 0) {
        qs = qs.filter(filters);
      }

      const count = await qs.count();
      res.json({ count });
    } catch (error) {
      next(error);
    }
  });

  // ─── GET /:id — Retrieve by ID ──────────────────────────────────────────

  router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(String(req.params.id), 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid ID' });
      }

      let qs = ModelManager.objects(modelClass).filter({ id });

      // Eager loading: ?with=author,category
      const withParam = getString(req.query.with);
      if (withParam) {
        const relations = withParam.split(',').map((r: string) => r.trim());
        qs = qs.with(...relations);
      }

      const instance = await qs.get();
      res.json({ data: instance.toJSON() });
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('does not exist')) {
        return res.status(404).json({ error: `${modelClass._modelName} not found` });
      }
      next(error);
    }
  });

  // ─── POST / — Create ────────────────────────────────────────────────────

  router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req.body;
      const instance = await ModelManager.create(modelClass, data);
      res.status(201).json({ data: instance.toJSON() });
    } catch (error) {
      next(error);
    }
  });

  // ─── PUT /:id — Full update ─────────────────────────────────────────────

  router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(String(req.params.id), 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid ID' });
      }

      const instance = await ModelManager.objects(modelClass).get({ id });
      Object.assign(instance, req.body);
      await instance.save();

      res.json({ data: instance.toJSON() });
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('does not exist')) {
        return res.status(404).json({ error: `${modelClass._modelName} not found` });
      }
      next(error);
    }
  });

  // ─── PATCH /:id — Partial update ────────────────────────────────────────

  router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(String(req.params.id), 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid ID' });
      }

      const instance = await ModelManager.objects(modelClass).get({ id });
      Object.assign(instance, req.body);
      await instance.save();

      res.json({ data: instance.toJSON() });
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('does not exist')) {
        return res.status(404).json({ error: `${modelClass._modelName} not found` });
      }
      next(error);
    }
  });

  // ─── DELETE /:id — Delete ───────────────────────────────────────────────

  router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(String(req.params.id), 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid ID' });
      }

      const instance = await ModelManager.objects(modelClass).get({ id });
      await instance.delete();

      res.status(204).send();
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('does not exist')) {
        return res.status(404).json({ error: `${modelClass._modelName} not found` });
      }
      next(error);
    }
  });

  // ─── POST /bulk — Bulk create ───────────────────────────────────────────

  router.post('/bulk', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const items = req.body;
      if (!Array.isArray(items)) {
        return res.status(400).json({ error: 'Expected an array of objects' });
      }

      const results = [];
      for (const item of items) {
        const instance = await ModelManager.create(modelClass, item);
        results.push(instance.toJSON());
      }

      res.status(201).json({ data: results, count: results.length });
    } catch (error) {
      next(error);
    }
  });

  // ─── Nested relation routes ─────────────────────────────────────────────

  addNestedRoutes(router, modelClass);

  return router;
}

/**
 * Add nested routes for ForeignKey relations.
 *
 * For a Post model with @ForeignKey(() => User, { propertyKey: 'author' }):
 *   GET /api/posts/:id/author → returns the related User
 *
 * For a User model with @OneToMany(() => Post, { mappedBy: 'author' }):
 *   GET /api/users/:id/posts → returns all Posts by this user
 *   POST /api/users/:id/posts → create a Post with author set to this user
 */
function addNestedRoutes(router: Router, modelClass: ModelClass): void {
  const relations = modelClass.relations;
  if (!relations) return;

  for (const [relName, rel] of relations) {
    const targetName =
      typeof rel.targetModel === 'function' ? rel.targetModel() : rel.targetModel;
    const targetModel = getModel(targetName);
    if (!targetModel) continue;

    if (rel.type === 'foreignKey') {
      // GET /:id/<relationName> → get the related object
      router.get(`/:id/${relName}`, async (req: Request, res: Response, next: NextFunction) => {
        try {
          const id = parseInt(String(req.params.id), 10);
          if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid ID' });
          }

          // Get the parent instance
          const parent = await ModelManager.objects(modelClass).get({ id });
          const fkValue = (parent as unknown as Record<string, unknown>)[relName] as number;

          if (!fkValue) {
            return res.json({ data: null });
          }

          const related = await ModelManager.objects(targetModel).get({ id: fkValue });
          res.json({ data: related.toJSON() });
        } catch (error: unknown) {
          if (error instanceof Error && error.message.includes('does not exist')) {
            return res.status(404).json({ error: 'Not found' });
          }
          next(error);
        }
      });
    }

    if (rel.type === 'oneToMany' && rel.mappedBy) {
      // GET /:id/<relationName> → list related objects
      router.get(`/:id/${relName}`, async (req: Request, res: Response, next: NextFunction) => {
        try {
          const id = parseInt(String(req.params.id), 10);
          if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid ID' });
          }

          // Find the FK column on the target model that points back to us
          const targetRelations = targetModel.relations;
          let fkColumn: string | undefined;

          if (targetRelations) {
            for (const [, targetRel] of targetRelations) {
              if (
                targetRel.type === 'foreignKey' &&
                targetRel.propertyKey === rel.mappedBy
              ) {
                fkColumn = targetRel.foreignKeyColumn;
                break;
              }
            }
          }

          if (!fkColumn) {
            return res.status(500).json({
              error: `Cannot resolve mappedBy "${rel.mappedBy}" on ${targetName}`,
            });
          }

          // Filter target model by FK column = parent id
          const fkField = Array.from(targetModel.fields.entries()).find(
            ([, fd]) => (fd.dbColumn || fd.name) === fkColumn
          );
          const filterKey = fkField ? fkField[0] : fkColumn;

          let qs = ModelManager.objects(targetModel).filter({ [filterKey]: id });

          // Eager loading: ?with=...
          const withParam = getStringFromReq(req.query.with);
          if (withParam) {
            qs = qs.with(...withParam.split(',').map((r: string) => r.trim()));
          }

          const getStringLocal = (val: unknown): string | undefined => {
            if (val === undefined) return undefined;
            return Array.isArray(val) ? String(val[0]) : String(val);
          };

          // Ordering
          const orderBy = getStringLocal(req.query.orderBy);
          if (orderBy) {
            qs = qs.orderBy(...orderBy.split(','));
          }

          // Pagination
          const page = Math.max(1, parseInt(getStringLocal(req.query.page) ?? '1', 10));
          const pageSize = Math.min(100, Math.max(1, parseInt(getStringLocal(req.query.pageSize) ?? '20', 10)));
          const offset = (page - 1) * pageSize;

          const total = await qs.count();
          const results = await qs.limit(pageSize).offset(offset).all();

          res.json({
            data: results.map((r) => r.toJSON()),
            pagination: {
              page,
              pageSize,
              total,
              totalPages: Math.ceil(total / pageSize),
            },
          });
        } catch (error) {
          next(error);
        }
      });

      // POST /:id/<relationName> → create a related object with FK set
      router.post(`/:id/${relName}`, async (req: Request, res: Response, next: NextFunction) => {
        try {
          const id = parseInt(String(req.params.id), 10);
          if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid ID' });
          }

          // Verify parent exists
          await ModelManager.objects(modelClass).get({ id });

          // Find the FK field on the target model
          const targetRelations = targetModel.relations;
          let fkField: string | undefined;

          if (targetRelations) {
            for (const [, targetRel] of targetRelations) {
              if (
                targetRel.type === 'foreignKey' &&
                targetRel.propertyKey === rel.mappedBy
              ) {
                fkField = targetRel.propertyKey;
                break;
              }
            }
          }

          if (!fkField) {
            return res.status(500).json({
              error: `Cannot resolve mappedBy "${rel.mappedBy}" on ${targetName}`,
            });
          }

          const data = { ...req.body, [fkField]: id };
          const instance = await ModelManager.create(targetModel, data);
          res.status(201).json({ data: instance.toJSON() });
        } catch (error: unknown) {
          if (error instanceof Error && error.message.includes('does not exist')) {
            return res.status(404).json({ error: `${modelClass._modelName} not found` });
          }
          next(error);
        }
      });
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getStringFromReq(val: unknown): string | undefined {
  if (val === undefined) return undefined;
  return Array.isArray(val) ? String(val[0]) : String(val);
}
