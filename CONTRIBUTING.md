# Contributing to Reacto

Thank you for your interest in contributing to Reacto! 🎉

## Getting Started

```bash
# Clone the repo
git clone https://github.com/JonathanStefanov/reacto.git
cd reacto

# Install dependencies
npm install

# Build all packages
npm run build

# Run tests
npm test
```

## Project Structure

This is a monorepo managed with Turborepo:

```
reacto/
├── packages/
│   ├── core/          # ORM, models, migrations
│   ├── server/        # HTTP server, routes, middleware
│   ├── cli/           # CLI tool
│   ├── admin/         # Admin panel (coming soon)
│   └── create-reacto/ # Project scaffolder (coming soon)
├── examples/          # Example applications
└── docs/              # Documentation
```

## Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Run tests: `npm test`
5. Run linting: `npm run lint`
6. Commit your changes: `git commit -m "feat: add my feature"`
7. Push to your fork: `git push origin feature/my-feature`
8. Open a Pull Request

## Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` — New feature
- `fix:` — Bug fix
- `docs:` — Documentation
- `refactor:` — Code refactoring
- `test:` — Tests
- `chore:` — Maintenance

## Code Style

- TypeScript strict mode
- ESLint + Prettier
- No `any` types (use `unknown` if needed)
- Document public APIs with JSDoc

## Testing

```bash
# Run all tests
npm test

# Run tests for a specific package
npm test --workspace=packages/core

# Run tests in watch mode
npm run test:watch
```

## Questions?

Open an issue or start a discussion on GitHub.
