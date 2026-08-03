/**
 * Reacto CLI — generate command (scaffold models, APIs, pages)
 */
import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';

type GenerateType = 'model' | 'api' | 'page';

export async function generateCommand(type: GenerateType, name: string, options: { fields?: string }): Promise<void> {
  console.log(chalk.blue.bold(`\n🔧 Reacto Generate ${type}\n`));

  const capitalizedName = name.charAt(0).toUpperCase() + name.slice(1);

  switch (type) {
    case 'model':
      await generateModel(capitalizedName, options.fields);
      break;
    case 'api':
      await generateApi(capitalizedName);
      break;
    case 'page':
      await generatePage(capitalizedName);
      break;
    default:
      console.log(chalk.red(`  ✗ Unknown type: ${type}. Use: model, api, page`));
      process.exit(1);
  }
}

async function generateModel(name: string, fieldsStr?: string): Promise<void> {
  const modelsDir = path.join(process.cwd(), 'models');
  fs.mkdirSync(modelsDir, { recursive: true });

  const fields = parseFields(fieldsStr);

  const content = `import { Model, Field } from '@reacto-org/core';

export class ${name} extends Model {
${fields.map((f) => `  @Field({ type: '${f.type}'${f.options ? ', ' + f.options : ''} })
  ${f.name}: ${f.tsType};`).join('\n\n')}

  static meta = {
    tableName: '${name.toLowerCase()}s',
    ordering: ['-createdAt'],
  };
}
`;

  const filePath = path.join(modelsDir, `${name.toLowerCase()}.ts`);
  fs.writeFileSync(filePath, content);
  console.log(chalk.green(`  ✓ Created ${filePath}`));
  console.log(chalk.gray(`\n  Don't forget to import this model in your app entry point!\n`));
}

async function generateApi(name: string): Promise<void> {
  const routesDir = path.join(process.cwd(), 'routes');
  fs.mkdirSync(routesDir, { recursive: true });

  const content = `import { Router } from 'express';
import { ModelManager } from '@reacto-org/core';
import { ${name} } from '../models/${name.toLowerCase()}.js';

const router = Router();

// GET /
router.get('/', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const results = await ModelManager.objects(${name})
      .limit(pageSize)
      .offset((page - 1) * pageSize)
      .all();
    res.json({ data: results.map(r => r.toJSON()) });
  } catch (error) { next(error); }
});

// POST /
router.post('/', async (req, res, next) => {
  try {
    const instance = await ModelManager.create(${name}, req.body);
    res.status(201).json({ data: instance.toJSON() });
  } catch (error) { next(error); }
});

// GET /:id
router.get('/:id', async (req, res, next) => {
  try {
    const instance = await ModelManager.objects(${name}).get({ id: parseInt(req.params.id) });
    res.json({ data: instance.toJSON() });
  } catch (error) { next(error); }
});

// PUT /:id
router.put('/:id', async (req, res, next) => {
  try {
    const instance = await ModelManager.objects(${name}).get({ id: parseInt(req.params.id) });
    Object.assign(instance, req.body);
    await instance.save();
    res.json({ data: instance.toJSON() });
  } catch (error) { next(error); }
});

// DELETE /:id
router.delete('/:id', async (req, res, next) => {
  try {
    const instance = await ModelManager.objects(${name}).get({ id: parseInt(req.params.id) });
    await instance.delete();
    res.status(204).send();
  } catch (error) { next(error); }
});

export default router;
`;

  const filePath = path.join(routesDir, `${name.toLowerCase()}.ts`);
  fs.writeFileSync(filePath, content);
  console.log(chalk.green(`  ✓ Created ${filePath}`));
  console.log(chalk.gray(`\n  Mount in your app: app.use('/api/${name.toLowerCase()}s', router)\n`));
}

async function generatePage(name: string): Promise<void> {
  const pagesDir = path.join(process.cwd(), 'frontend', 'pages');
  fs.mkdirSync(pagesDir, { recursive: true });

  const content = `import { useState, useEffect } from 'react';

interface ${name} {
  id: number;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

export function ${name}List() {
  const [items, setItems] = useState<${name}[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/${name.toLowerCase()}s')
      .then(res => res.json())
      .then(data => { setItems(data.data); setLoading(false); });
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>${name}s</h1>
      <table>
        <thead>
          <tr>
            {items[0] && Object.keys(items[0]).map(key => (
              <th key={key}>{key}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <tr key={item.id}>
              {Object.values(item).map((val, i) => (
                <td key={i}>{String(val)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
`;

  const filePath = path.join(pagesDir, `${name.toLowerCase()}.tsx`);
  fs.writeFileSync(filePath, content);
  console.log(chalk.green(`  ✓ Created ${filePath}`));
  console.log(chalk.gray(`\n  Import and use in your React app.\n`));
}

function parseFields(fieldsStr?: string): { name: string; type: string; tsType: string; options?: string }[] {
  if (!fieldsStr) {
    return [
      { name: 'name', type: 'string', tsType: 'string', options: "maxLength: 255" },
      { name: 'description', type: 'text', tsType: 'string', options: "nullable: true" },
    ];
  }

  return fieldsStr.split(',').map((f) => {
    const [name, type] = f.trim().split(':');
    const typeMap: Record<string, { pgType: string; tsType: string }> = {
      string: { pgType: 'string', tsType: 'string' },
      text: { pgType: 'text', tsType: 'string' },
      int: { pgType: 'integer', tsType: 'number' },
      integer: { pgType: 'integer', tsType: 'number' },
      float: { pgType: 'float', tsType: 'number' },
      bool: { pgType: 'boolean', tsType: 'boolean' },
      boolean: { pgType: 'boolean', tsType: 'boolean' },
      date: { pgType: 'datetime', tsType: 'Date' },
      email: { pgType: 'email', tsType: 'string' },
      json: { pgType: 'json', tsType: 'Record<string, unknown>' },
    };
    const mapped = typeMap[type] ?? typeMap.string;
    return { name, type: mapped.pgType, tsType: mapped.tsType };
  });
}
