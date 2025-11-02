# GitHub Actions Workflows

## docker-build.yml

Builds and pushes Docker images to GitHub Container Registry (GHCR).

### Triggers

- **Push to main**: Automatic build and push
- **Pull requests**: Build only (no push)
- **Version tags** (`v*.*.*`): Build with semantic versioning
- **Manual**: Can be triggered via workflow_dispatch

### Image Tags Generated

| Trigger | Tags Created |
|---------|--------------|
| Push to `main` | `latest`, `main`, `main-<sha>` |
| Tag `v1.2.3` | `v1.2.3`, `v1.2`, `v1`, `latest` |
| Pull request #42 | `pr-42` (not pushed) |

### Cache Strategy

The workflow uses multiple caching layers:

1. **Registry cache**: Stores build cache in GHCR as `buildcache` tag
2. **Layer cache**: Reuses layers from previous builds
3. **npm cache**: Cached via BuildKit mount in Dockerfile

### Multi-Platform Support

Builds for:
- `linux/amd64` (x86_64)
- `linux/arm64` (ARM64/Apple Silicon)

### Permissions Required

The workflow needs these permissions (already configured):

```yaml
permissions:
  contents: read      # Read repository contents
  packages: write     # Push to GHCR
  id-token: write     # Build attestation
```

### Environment Variables

No additional secrets needed! The workflow uses `GITHUB_TOKEN` which is automatically provided.

### Viewing Build Results

1. **Actions tab**: See build logs and status
2. **Packages**: View published images at `https://github.com/broemp/bookrequestarr/pkgs/container/bookrequestarr`
3. **Summary**: Each successful build creates a summary with pull commands

### Pull Published Images

```bash
# Latest from main branch
docker pull ghcr.io/broemp/bookrequestarr:latest

# Specific version
docker pull ghcr.io/broemp/bookrequestarr:v1.0.0

# Specific commit
docker pull ghcr.io/broemp/bookrequestarr:main-abc1234
```

### Troubleshooting

#### Build fails with "permission denied"

Ensure the repository has packages write permission:
1. Go to repository Settings
2. Actions → General
3. Workflow permissions → Read and write permissions

#### Cache not working

The cache is stored in GHCR. Ensure:
1. Previous builds completed successfully
2. The `buildcache` tag exists in GHCR
3. BuildKit is enabled (automatic in GitHub Actions)

#### Multi-platform build fails

This is usually due to QEMU setup. The workflow handles this automatically with `docker/setup-buildx-action`.

#### Image not appearing in GHCR

1. Check the build completed successfully
2. Verify it wasn't a PR (PRs don't push)
3. Check package visibility settings in GitHub

### Customization

#### Change platforms

Edit the workflow:
```yaml
platforms: linux/amd64,linux/arm64,linux/arm/v7
```

#### Add build arguments

```yaml
build-args: |
  NODE_VERSION=20
  BUILD_DATE=${{ github.event.head_commit.timestamp }}
```

#### Change cache location

```yaml
cache-to: type=registry,ref=ghcr.io/${{ github.repository }}:custom-cache,mode=max
```

### Best Practices

1. **Tag releases**: Use semantic versioning (`v1.0.0`) for releases
2. **Monitor builds**: Check Actions tab regularly
3. **Review logs**: Build logs contain useful optimization hints
4. **Clean old images**: Periodically delete old tags from GHCR
5. **Test PRs**: The workflow builds PRs to catch issues early

### Performance Tips

- First build: ~5-10 minutes
- Cached builds: ~2-3 minutes
- Multi-platform adds ~2-3 minutes

### Security

The workflow includes:
- ✅ Build provenance attestation
- ✅ Signed images (via GitHub)
- ✅ No hardcoded secrets
- ✅ Minimal permissions
- ✅ Automatic security updates (Dependabot compatible)

