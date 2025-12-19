# Versioning Policy

This project adheres to [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html).

## Version Format

`MAJOR.MINOR.PATCH`

- **MAJOR** version when you make incompatible API changes.
- **MINOR** version when you add functionality in a backwards-compatible manner.
- **PATCH** version when you make backwards-compatible bug fixes.

## Release Process

1. **Update `CHANGELOG.md`**: Document all changes for the new version.
2. **Run Tests**: `npm test`
3. **Bump Version**: Use `npm version <major|minor|patch>` or the `bump-version.sh` script. This will:
   - Update `package.json`
   - Create a git tag (e.g., `v1.2.3`)
4. **Push to GitHub**: `git push origin main --tags`
5. **Create Release**: Use `gh release create` to create a new GitHub release from the tag, pasting the changelog notes.

## Branching Strategy

- `main`: Stable, released code.
- `develop`: Unstable, in-progress features.
- `feat/...`: Feature branches, merged into `develop`.
- `fix/...`: Bug fix branches, merged into `develop` and `main`.

## Deprecation Policy

- Deprecated features will be marked with `@deprecated` JSDoc tag.
- A deprecation notice will be added to the `CHANGELOG.md`.
- The feature will be removed in the next MAJOR release.
