# GitHub Actions Setup Guide

This document explains how to configure your GitHub repository to enable the Docker build and push workflow.

## Required Repository Settings

### 1. Workflow Permissions

The workflow requires specific permissions to function correctly. Configure these in your repository settings:

**Path:** `Settings` → `Actions` → `General` → `Workflow permissions`

**Required Setting:**
- ✅ Select **"Read and write permissions"**

This allows workflows to:
- Push Docker images to GitHub Container Registry (GHCR)
- Create attestations
- Write job summaries

### 2. GitHub Container Registry (GHCR) Access

The workflow automatically uses `GITHUB_TOKEN` to authenticate with GHCR. No additional secrets needed!

**What happens automatically:**
- The workflow uses `${{ secrets.GITHUB_TOKEN }}` (automatically provided by GitHub)
- Images are pushed to `ghcr.io/<your-username>/<repository-name>`
- The token has the necessary permissions when workflow permissions are set correctly

### 3. Package Visibility Settings (Optional)

After the first successful workflow run, you may want to configure package visibility:

**Path:** `Settings` → `Packages` → Select your package → `Package settings`

**Options:**
- **Private**: Only you and collaborators can pull the image (default)
- **Public**: Anyone can pull the image

To make the package public:
1. Go to the package page: `https://github.com/users/<username>/packages/container/<repo-name>`
2. Click `Package settings`
3. Scroll to "Danger Zone"
4. Click `Change visibility` → `Public`

### 4. Enable Actions (if not already enabled)

**Path:** `Settings` → `Actions` → `General` → `Actions permissions`

**Required Setting:**
- ✅ Select **"Allow all actions and reusable workflows"** (or at minimum allow the specific actions used)

## Workflow Triggers

The workflow runs automatically on:

1. **Push to main branch**: Builds and pushes with `latest` tag
2. **Version tags** (e.g., `v1.0.0`): Builds and pushes with semantic version tags
3. **Pull requests**: Builds only (does not push to registry)
4. **Manual trigger**: Via GitHub Actions UI (`workflow_dispatch`)

## Required Secrets

### No Secrets Required! 🎉

The workflow uses GitHub's built-in `GITHUB_TOKEN` which is automatically available to all workflows. You don't need to create any secrets.

**What `GITHUB_TOKEN` provides:**
- Authentication to GitHub Container Registry
- Permission to create attestations
- Access to repository metadata

## Optional Configuration

### Environment Variables

If you want to customize the workflow, you can modify these in `.github/workflows/docker-build.yml`:

```yaml
env:
  REGISTRY: ghcr.io                          # Container registry
  IMAGE_NAME: ${{ github.repository }}       # Image name (owner/repo)
```

### Custom Registry (Advanced)

To push to a different registry (e.g., Docker Hub, AWS ECR):

1. Add registry credentials as repository secrets:
   - `Settings` → `Secrets and variables` → `Actions` → `New repository secret`
   
2. Modify the workflow to use those secrets:

```yaml
- name: Log in to Docker Hub
  uses: docker/login-action@v3
  with:
    username: ${{ secrets.DOCKERHUB_USERNAME }}
    password: ${{ secrets.DOCKERHUB_TOKEN }}
```

## Verification Steps

After setting up, verify everything works:

### 1. Check Workflow Permissions

```bash
# The workflow should have these permissions in the job output:
# - contents: read
# - packages: write
# - id-token: write
# - attestations: write
```

### 2. Trigger a Test Run

**Option A: Push to main**
```bash
git commit --allow-empty -m "Test workflow"
git push origin main
```

**Option B: Manual trigger**
1. Go to `Actions` tab
2. Select "Build and Push Docker Image"
3. Click `Run workflow`
4. Select branch and click `Run workflow`

### 3. Monitor the Workflow

1. Go to the `Actions` tab in your repository
2. Click on the running workflow
3. Watch the jobs execute:
   - ✅ `prepare` - Generates metadata
   - ✅ `build` - Builds and tests Docker image
   - ✅ `attest` - Creates attestation
   - ✅ `summary` - Generates final summary

### 4. Verify the Published Image

After successful completion:

**View in GitHub:**
- Navigate to your repository main page
- Look for "Packages" in the right sidebar
- Click on your package to see details

**Pull the image:**
```bash
# For public packages
docker pull ghcr.io/<username>/<repo-name>:latest

# For private packages (requires authentication)
echo $GITHUB_TOKEN | docker login ghcr.io -u <username> --password-stdin
docker pull ghcr.io/<username>/<repo-name>:latest
```

**Verify attestation:**
```bash
gh attestation verify oci://ghcr.io/<username>/<repo-name>:latest --owner <username>
```

## Troubleshooting

### Error: "Resource not accessible by integration"

**Cause:** Insufficient workflow permissions

**Solution:**
1. Go to `Settings` → `Actions` → `General` → `Workflow permissions`
2. Select "Read and write permissions"
3. Re-run the workflow

### Error: "authentication required"

**Cause:** Trying to pull a private package without authentication

**Solution:**
```bash
# Create a Personal Access Token with read:packages scope
# Settings → Developer settings → Personal access tokens → Tokens (classic)
# Select scope: read:packages

echo $GITHUB_TOKEN | docker login ghcr.io -u <username> --password-stdin
```

### Error: "buildx failed" or "platform not supported"

**Cause:** Multi-platform build issues

**Solution:**
- The workflow includes QEMU setup for ARM64 emulation
- GitHub-hosted runners support this by default
- If using self-hosted runners, ensure QEMU is installed

### Workflow doesn't trigger

**Check:**
1. Workflow file is in `.github/workflows/` directory
2. File has `.yml` or `.yaml` extension
3. Syntax is valid (use GitHub's workflow editor to validate)
4. Actions are enabled in repository settings

## Security Best Practices

### 1. Review Workflow Permissions

Only grant the minimum required permissions:
- `contents: read` - Read repository contents
- `packages: write` - Push to GHCR
- `id-token: write` - OIDC token for attestations
- `attestations: write` - Create attestations

### 2. Use Dependabot for Action Updates

Create `.github/dependabot.yml`:

```yaml
version: 2
updates:
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
```

### 3. Pin Action Versions

The workflow uses specific versions (e.g., `@v4`, `@v3`) rather than `@main` for security and stability.

### 4. Review Attestations

Attestations provide cryptographic proof of how the image was built:

```bash
# Verify attestation
gh attestation verify oci://ghcr.io/<username>/<repo-name>:latest --owner <username>

# View attestation details
gh attestation inspect oci://ghcr.io/<username>/<repo-name>:latest
```

## Summary Checklist

Before running the workflow, ensure:

- [ ] Workflow permissions set to "Read and write permissions"
- [ ] Actions enabled in repository settings
- [ ] Workflow file is in `.github/workflows/docker-build.yml`
- [ ] No additional secrets required (uses `GITHUB_TOKEN`)
- [ ] First run may require package visibility configuration
- [ ] Attestations require `attestations: write` permission

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitHub Container Registry Documentation](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
- [Docker Build Push Action](https://github.com/docker/build-push-action)
- [Artifact Attestations](https://docs.github.com/en/actions/security-guides/using-artifact-attestations-to-establish-provenance-for-builds)

