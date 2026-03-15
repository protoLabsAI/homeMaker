# Contributing to homeMaker

Thank you for your interest in homeMaker!

## How to Contribute

homeMaker is a personal home management project. If you'd like to contribute:

### Report Issues

- **Bug reports**: Open a [GitHub Issue](https://github.com/protoLabsAI/homeMaker/issues)
- **Feature ideas**: Open an issue describing what you'd like to see

### Code Contributions

Pull requests are welcome for:

- Bug fixes
- New integrations (IoT device support, calendar sync, etc.)
- UI improvements
- Documentation updates

### Development Setup

```bash
git clone https://github.com/protoLabsAI/homeMaker.git
cd homeMaker
npm install
npm run dev:full
```

### Code Standards

- TypeScript strict mode
- Prettier for formatting (`npm run format`)
- ESLint for linting (`npm run lint`)
- Vitest for unit tests (`npm run test:server`)
- Playwright for E2E tests (`npm run test`)

### Commit Messages

Use conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`.
