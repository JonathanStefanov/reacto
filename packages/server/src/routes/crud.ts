/**
 * @reacto-org/server — Auto-generated CRUD routes for models
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
import { ModelManager, getModel } from '@reacto-org/core';
import type { ModelClass } from '@reacto-org/core';

/**
 * Generate CRUD routes for a model.
 */
export function generateCrudRoutes(modelClass: ModelClass): Router {
  const router = Router();

  const getString = (val: unknown): string | undefined => {
    if (val === undefined) return undefined;
    return Array.isArray(val) ? String(val[0]) : String(val);
  };

  // ─── GET / — List with pagination, filtering, ordering ──────────────────

  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
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

      const withParam = getString(req.query.with);
      if (withParam) {
        qs = qs.with(...withParam.split(',').map((r: string) => r.trim()));
      }

      const orderBy = getString(req.query.orderBy);
      if (orderBy) {
        qs = qs.orderBy(...orderBy.split(','));
      }

      const page = Math.max(1, parseInt(getString(req.query.page) ?? '1', 10));
      const pageSize = Math.min(100, Math.max(1, parseInt(getString(req.query.pageSize) ?? '20', 10)));
      const offset = (page - 1) * pageSize;

      const total = await qs.count();
      const results = await qs.limit(pageSize).offset(offset).all();

      res.json({
        data: results.map((r) => r.toJSON()),
        pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
      });
    } catch (error) {
      next(error);
    }
  });

  // ─── GET /count ─────────────────────────────────────────────────────────

  router.get('/count', async (req: Request, res: Response, next: NextFunction) => {
    try {
      let qs = ModelManager.objects(modelClass);
      const filters: Record<string, unknown> = {};
      for (const field of Array.from(modelClass.fields.keys())) {
        const val = req.query[field];
        if (val !== undefined) filters[field] = Array.isArray(val) ? val[0] : val;
      }
      if (Object.keys(filters).length > 0) qs = qs.filter(filters);
      res.json({ count: await qs.count() });
    } catch (error) {
      next(error);
    }
  });

  // ─── GET /:id ───────────────────────────────────────────────────────────

  router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(String(req.params.id), 10);
      if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });

      let qs = ModelManager.objects(modelClass).filter({ id });
      const withParam = getString(req.query.with);
      if (withParam) qs = qs.with(...withParam.split(',').map((r: string) => r.trim()));

      const instance = await qs.get();
      res.json({ data: instance.toJSON() });
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('does not exist')) {
        return res.status(404).json({ error: `${modelClass._modelName} not found` });
      }
      next(error);
    }
  });

  // ─── POST / ─────────────────────────────────────────────────────────────

  router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const instance = await ModelManager.create(modelClass, req.body);
      res.status(201).json({ data: instance.toJSON() });
    } catch (error) {
      next(error);
    }
  });

  // ─── PUT /:id ───────────────────────────────────────────────────────────

  router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(String(req.params.id), 10);
      if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });

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

  // ─── PATCH /:id ─────────────────────────────────────────────────────────

  router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(String(req.params.id), 10);
      if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });

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

  // ─── DELETE /:id ────────────────────────────────────────────────────────

  router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(String(req.params.id), 10);
      if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });

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

  // ─── POST /bulk ─────────────────────────────────────────────────────────

  router.post('/bulk', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const items = req.body;
      if (!Array.isArray(items)) return res.status(400).json({ error: 'Expected an array' });

      const results = [];
      for (const item of items) {
        results.push((await ModelManager.create(modelClass, item)).toJSON());
      }
      res.status(201).json({ data: results, count: results.length });
    } catch (error) {
      next(error);
    }
  });

  // ─── Nested relation routes ─────────────────────────────────────────────

  addNestedRoutes(router, modelClass, getString);

  return router;
}

function addNestedRoutes(
  router: Router,
  modelClass: ModelClass,
  getString: (val: unknown) => string | undefined
): void {
  const relations = modelClass.relations;
  if (!relations) return;

  for (const [relName, rel] of relations) {
    const targetClass = rel.target();
    if (!targetClass) continue;

    if (rel.type === 'foreignKey' || rel.type === 'oneToOne') {
      // GET /:id/<relName> → get the related object
      router.get(`/:id/${relName}`, async (req: Request, res: Response, next: NextFunction) => {
        try {
          const id = parseInt(String(req.params.id), 10);
          if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });

          const parent = await ModelManager.objects(modelClass).get({ id });
          const fkValue = (parent as unknown as Record<string, unknown>)[rel.foreignKey] as number;

          if (!fkValue) return res.json({ data: null });

          const related = await ModelManager.objects(targetClass).get({ id: fkValue });
          res.json({ data: related.toJSON() });
        } catch (error: unknown) {
          if (error instanceof Error && error.message.includes('does not exist')) {
            return res.status(404).json({ error: 'Not found' });
          }
          next(error);
        }
      });
    }

    if (rel.type === 'oneToMany') {
      // GET /:id/<relName> → list related objects
      router.get(`/:id/${relName}`, async (req: Request, res: Response, next: NextFunction) => {
        try {
          const id = parseInt(String(req.params.id), 10);
          if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });

          // Find the FK on the target that points back to us
          const inverseRel = findInverseRelation(targetClass, modelClass, rel.inverseSide);
          if (!inverseRel) {
            return res.status(500).json({ error: `Cannot resolve inverse relation for ${relName}` });
          }

          const fkField = Array.from(targetClass.fields.entries()).find(
            ([, fd]) => (fd.dbColumn || fd.name) === inverseRel.foreignKey
          );
          const filterKey = fkField ? fkField[0] : inverseRel.foreignKey;

          let qs = ModelManager.objects(targetClass).filter({ [filterKey]: id });

          const withParam = getString(req.query.with);
          if (withParam) qs = qs.with(...withParam.split(',').map((r: string) => r.trim()));

          const orderBy = getString(req.query.orderBy);
          if (orderBy) qs = qs.orderBy(...orderBy.split(','));

          const page = Math.max(1, parseInt(getString(req.query.page) ?? '1', 10));
          const pageSize = Math.min(100, Math.max(1, parseInt(getString(req.query.pageSize) ?? '20', 10)));

          const total = await qs.count();
          const results = await qs.paginate(page, pageSize).all();

          res.json({
            data: results.map((r) => r.toJSON()),
            pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
          });
        } catch (error) {
          next(error);
        }
      });

      // POST /:id/<relName> → create a related object with FK set
      router.post(`/:id/${relName}`, async (req: Request, res: Response, next: NextFunction) => {
        try {
          const id = parseInt(String(req.params.id), 10);
          if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });

          await ModelManager.objects(modelClass).get({ id });

          const inverseRel = findInverseRelation(targetClass, modelClass, rel.inverseSide);
          if (!inverseRel) {
            return res.status(500).json({ error: `Cannot resolve inverse relation for ${relName}` });
          }

          const data = { ...req.body, [inverseRel.foreignKey]: id };
          const instance = await ModelManager.create(targetClass, data);
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

function findInverseRelation(
  targetClass: ModelClass,
  sourceClass: ModelClass,
  inverseSide?: string
): { foreignKey: string } | undefined {
  if (inverseSide) {
    const rel = targetClass.relations.get(inverseSide);
    if (rel && (rel.type === 'foreignKey' || rel.type === 'oneToOne')) {
      return { foreignKey: rel.foreignKey };
    }
  }
  // Auto-find
  for (const [, rel] of targetClass.relations) {
    if ((rel.type === 'foreignKey' || rel.type === 'oneToOne') && rel.target() === sourceClass) {
      return { foreignKey: rel.foreignKey };
    }
  }
  return undefined;
}
