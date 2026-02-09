<script lang="ts">
	import Card from '$lib/components/ui/card.svelte';
	import Button from '$lib/components/ui/button.svelte';
	import Input from '$lib/components/ui/input.svelte';
	import VerticalTabs from '$lib/components/VerticalTabs.svelte';
	import { Download, TestTube } from 'lucide-svelte';
	import { enhance } from '$app/forms';

	interface Props {
		settings: {
			annasArchiveDomain: string;
			annasArchiveApiKey: string;
			downloadDirectory: string;
			downloadTempDirectory: string;
			downloadAutoMode: string;
			downloadDailyLimit: string;
			downloadAutoSelect: boolean;
			calibreBaseUrl: string;
			calibreCleanupEnabled: boolean;
			calibreCleanupHours: string;
			prowlarrEnabled: boolean;
			prowlarrUrl: string;
			prowlarrApiKey: string;
			minConfidenceScore: string;
			sabnzbdUrl: string;
			sabnzbdApiKey: string;
			sabnzbdCategory: string;
			downloadSourcePriority: string;
			bookloreEnabled: boolean;
			bookloreBaseUrl: string;
			bookloreBookdropPath: string;
			bookloreApiKey: string;
			bookloreVerifyImports: boolean;
		};
		envOverrides: {
			annasArchiveDomain: boolean;
			annasArchiveApiKey: boolean;
			downloadDirectory: boolean;
			downloadTempDirectory: boolean;
			prowlarrUrl: boolean;
			prowlarrApiKey: boolean;
			sabnzbdUrl: boolean;
			sabnzbdApiKey: boolean;
			sabnzbdCategory: boolean;
			bookloreBaseUrl: boolean;
			bookloreBookdropPath: boolean;
			bookloreApiKey: boolean;
		};
		form: { success?: boolean; error?: string; message?: string } | null;
	}

	let { settings, envOverrides, form }: Props = $props();

	let isTesting = $state(false);
	let activeSubTab = $state('annas-archive');

	const subTabs = [
		{ id: 'annas-archive', label: "Anna's Archive" },
		{ id: 'prowlarr', label: 'Prowlarr' },
		{ id: 'sabnzbd', label: 'SABnzbd' },
		{ id: 'booklore', label: 'Booklore' },
		{ id: 'general', label: 'General' }
	];
</script>

<Card class="p-6">
	<div class="mb-4 flex items-center gap-3">
		<Download class="h-6 w-6" />
		<h2 class="text-xl font-semibold">Download Settings</h2>
	</div>

	<div class="flex gap-6">
		<!-- Vertical Tabs Navigation -->
		<div class="w-48 flex-shrink-0">
			<VerticalTabs tabs={subTabs} bind:activeTab={activeSubTab} param="section" />
		</div>

		<!-- Tab Content -->
		<div class="flex-1">
			{#if activeSubTab === 'annas-archive'}
				<!-- Anna's Archive -->
				{#if !settings.annasArchiveApiKey}
					<div class="mb-4 rounded-md bg-blue-500/10 p-4 text-sm text-blue-500">
						<p class="font-medium">Anna's Archive API Key Required</p>
						<p class="mt-1">
							To enable automatic book downloads, you need to configure an Anna's Archive API key.
							Please consider <a
								href="https://annas-archive.org/donate"
								target="_blank"
								rel="noopener noreferrer"
								class="underline hover:text-blue-400">supporting Anna's Archive</a
							> to get access to fast downloads.
						</p>
					</div>
				{/if}

				<form
					method="POST"
					action="?/updateSettings"
					use:enhance={() => {
						return async ({ update }) => {
							await update({ reset: false });
						};
					}}
					class="space-y-4"
				>
					<div>
						<label for="annasArchiveDomain" class="mb-2 block text-sm font-medium">
							Anna's Archive Domain
						</label>
						<Input
							id="annasArchiveDomain"
							name="annasArchiveDomain"
							type="text"
							placeholder="annas-archive.org"
							value={settings.annasArchiveDomain || 'annas-archive.org'}
							disabled={envOverrides.annasArchiveDomain}
						/>
						{#if envOverrides.annasArchiveDomain}
							<p class="mt-1 text-xs text-blue-500">
								✓ This value is set via environment variable and cannot be changed here
							</p>
						{:else}
							<p class="text-muted-foreground mt-1 text-xs">
								Base domain for Anna's Archive (e.g., annas-archive.org, annas-archive.se)
							</p>
						{/if}
					</div>

					<div>
						<label for="annasArchiveApiKey" class="mb-2 block text-sm font-medium">
							Anna's Archive API Key
						</label>
						<Input
							id="annasArchiveApiKey"
							name="annasArchiveApiKey"
							type="text"
							placeholder="your-annas-archive-api-key"
							value={settings.annasArchiveApiKey || ''}
							disabled={envOverrides.annasArchiveApiKey}
						/>
						{#if envOverrides.annasArchiveApiKey}
							<p class="mt-1 text-xs text-blue-500">
								✓ This value is set via environment variable and cannot be changed here
							</p>
						{:else}
							<p class="text-muted-foreground mt-1 text-xs">
								Enter your Anna's Archive API key for fast downloads
							</p>
						{/if}
					</div>

					<div>
						<label for="downloadDirectory" class="mb-2 block text-sm font-medium">
							Download Directory
						</label>
						<Input
							id="downloadDirectory"
							name="downloadDirectory"
							type="text"
							placeholder="./data/downloads"
							value={settings.downloadDirectory || './data/downloads'}
							disabled={envOverrides.downloadDirectory}
						/>
						{#if envOverrides.downloadDirectory}
							<p class="mt-1 text-xs text-blue-500">
								✓ This value is set via environment variable (DOWNLOAD_DIRECTORY) and cannot be
								changed here
							</p>
						{:else}
							<p class="text-muted-foreground mt-1 text-xs">
								Path where completed downloads will be stored (e.g., Calibre ingest folder)
							</p>
						{/if}
					</div>

					<div>
						<label for="downloadTempDirectory" class="mb-2 block text-sm font-medium">
							Temp Download Directory
						</label>
						<Input
							id="downloadTempDirectory"
							name="downloadTempDirectory"
							type="text"
							placeholder="./data/downloads-temp"
							value={settings.downloadTempDirectory || './data/downloads-temp'}
							disabled={envOverrides.downloadTempDirectory}
						/>
						{#if envOverrides.downloadTempDirectory}
							<p class="mt-1 text-xs text-blue-500">
								✓ This value is set via environment variable (DOWNLOAD_TEMP_DIRECTORY) and cannot be
								changed here
							</p>
						{:else}
							<p class="text-muted-foreground mt-1 text-xs">
								Temporary directory for in-progress downloads. Files are moved to the download
								directory when complete.
							</p>
						{/if}
					</div>

					<div>
						<label for="downloadAutoMode" class="mb-2 block text-sm font-medium">
							Auto-Download Mode
						</label>
						<select
							id="downloadAutoMode"
							name="downloadAutoMode"
							value={settings.downloadAutoMode || 'disabled'}
							class="border-input ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
							style="background-color: hsl(var(--input));"
						>
							<option value="disabled">Disabled (Manual only)</option>
							<option value="all_users">All Users</option>
							<option value="selected_users">Selected Users Only</option>
						</select>
						<p class="text-muted-foreground mt-1 text-xs">
							Control which users' requests trigger automatic downloads
						</p>
					</div>

					<div>
						<label for="downloadDailyLimit" class="mb-2 block text-sm font-medium">
							Daily Download Limit
						</label>
						<Input
							id="downloadDailyLimit"
							name="downloadDailyLimit"
							type="number"
							min="1"
							max="1000"
							placeholder="25"
							value={settings.downloadDailyLimit || '25'}
						/>
						<p class="text-muted-foreground mt-1 text-xs">
							Maximum number of downloads per day (default: 25)
						</p>
					</div>

					<div class="flex gap-3">
						<Button type="submit">Save Settings</Button>
					</div>

					{#if form?.success}
						<div class="rounded-md bg-green-500/10 p-4 text-sm text-green-500">
							Settings saved successfully!
						</div>
					{/if}

					{#if form?.error}
						<div class="bg-destructive/10 text-destructive rounded-md p-4 text-sm">
							{form.error}
						</div>
					{/if}
				</form>
			{:else if activeSubTab === 'prowlarr'}
				<!-- Prowlarr Integration -->
				<div class="mb-4 rounded-md bg-blue-500/10 p-4 text-sm text-blue-500">
					<p class="font-medium">Usenet Indexer Manager</p>
					<p class="mt-1">
						Prowlarr searches across multiple Usenet indexers to find book releases. When enabled,
						it will be used as the primary download source, with Anna's Archive as fallback.
					</p>
				</div>

				<form
					method="POST"
					action="?/updateSettings"
					use:enhance={() => {
						return async ({ update }) => {
							await update({ reset: false });
						};
					}}
					class="space-y-4"
				>
					<div class="flex items-center gap-2">
						<input type="hidden" name="prowlarrEnabled__present" value="1" />
						<input
							type="checkbox"
							id="prowlarrEnabled"
							name="prowlarrEnabled"
							checked={settings.prowlarrEnabled}
							class="h-4 w-4 rounded border-gray-300"
						/>
						<label for="prowlarrEnabled" class="text-sm font-medium">
							Enable Prowlarr Integration
						</label>
					</div>

					<div>
						<label for="prowlarrUrl" class="mb-2 block text-sm font-medium"> Prowlarr URL </label>
						<Input
							id="prowlarrUrl"
							name="prowlarrUrl"
							type="url"
							placeholder="http://localhost:9696"
							value={settings.prowlarrUrl || ''}
							disabled={envOverrides.prowlarrUrl}
						/>
						{#if envOverrides.prowlarrUrl}
							<p class="mt-1 text-xs text-blue-500">
								✓ This value is set via environment variable and cannot be changed here
							</p>
						{:else}
							<p class="text-muted-foreground mt-1 text-xs">
								Base URL for your Prowlarr instance (e.g., http://localhost:9696)
							</p>
						{/if}
					</div>

					<div>
						<label for="prowlarrApiKey" class="mb-2 block text-sm font-medium">
							Prowlarr API Key
						</label>
						<Input
							id="prowlarrApiKey"
							name="prowlarrApiKey"
							type="text"
							placeholder="your-prowlarr-api-key"
							value={settings.prowlarrApiKey || ''}
							disabled={envOverrides.prowlarrApiKey}
						/>
						{#if envOverrides.prowlarrApiKey}
							<p class="mt-1 text-xs text-blue-500">
								✓ This value is set via environment variable and cannot be changed here
							</p>
						{:else}
							<p class="text-muted-foreground mt-1 text-xs">
								API key from Prowlarr Settings → General → Security
							</p>
						{/if}
					</div>

					<div>
						<label for="minConfidenceScore" class="mb-2 block text-sm font-medium">
							Minimum Confidence Score
						</label>
						<Input
							id="minConfidenceScore"
							name="minConfidenceScore"
							type="number"
							min="0"
							max="100"
							placeholder="50"
							value={settings.minConfidenceScore || '50'}
						/>
						<p class="text-muted-foreground mt-1 text-xs">
							Minimum match confidence (0-100) required to auto-download from Prowlarr. Higher
							values are more strict. (default: 50)
						</p>
					</div>

					<div class="flex gap-3">
						<Button type="submit">Save Settings</Button>
						{#if settings.prowlarrUrl && settings.prowlarrApiKey}
							<Button
								type="button"
								variant="outline"
								onclick={async () => {
									isTesting = true;
									try {
										const response = await fetch('/api/prowlarr/test', { method: 'POST' });
										const result = await response.json();
										if (result.success) {
											alert('Prowlarr connection successful!');
										} else {
											alert(`Prowlarr connection failed: ${result.error}`);
										}
									} catch {
										alert('Failed to test Prowlarr connection');
									} finally {
										isTesting = false;
									}
								}}
								disabled={isTesting}
							>
								<TestTube class="mr-2 h-4 w-4" />
								Test Connection
							</Button>
						{/if}
					</div>

					{#if form?.success}
						<div class="rounded-md bg-green-500/10 p-4 text-sm text-green-500">
							Settings saved successfully!
						</div>
					{/if}

					{#if form?.error}
						<div class="bg-destructive/10 text-destructive rounded-md p-4 text-sm">
							{form.error}
						</div>
					{/if}
				</form>
			{:else if activeSubTab === 'sabnzbd'}
				<!-- SABnzbd Integration -->
				<div class="mb-4 rounded-md bg-blue-500/10 p-4 text-sm text-blue-500">
					<p class="font-medium">Usenet Download Client</p>
					<p class="mt-1">
						SABnzbd handles downloading NZB files from Usenet. Required when using Prowlarr as a
						download source.
					</p>
				</div>

				<form
					method="POST"
					action="?/updateSettings"
					use:enhance={() => {
						return async ({ update }) => {
							await update({ reset: false });
						};
					}}
					class="space-y-4"
				>
					<div>
						<label for="sabnzbdUrl" class="mb-2 block text-sm font-medium"> SABnzbd URL </label>
						<Input
							id="sabnzbdUrl"
							name="sabnzbdUrl"
							type="url"
							placeholder="http://localhost:8080"
							value={settings.sabnzbdUrl || ''}
							disabled={envOverrides.sabnzbdUrl}
						/>
						{#if envOverrides.sabnzbdUrl}
							<p class="mt-1 text-xs text-blue-500">
								✓ This value is set via environment variable and cannot be changed here
							</p>
						{:else}
							<p class="text-muted-foreground mt-1 text-xs">
								Base URL for your SABnzbd instance (e.g., http://localhost:8080)
							</p>
						{/if}
					</div>

					<div>
						<label for="sabnzbdApiKey" class="mb-2 block text-sm font-medium">
							SABnzbd API Key
						</label>
						<Input
							id="sabnzbdApiKey"
							name="sabnzbdApiKey"
							type="text"
							placeholder="your-sabnzbd-api-key"
							value={settings.sabnzbdApiKey || ''}
							disabled={envOverrides.sabnzbdApiKey}
						/>
						{#if envOverrides.sabnzbdApiKey}
							<p class="mt-1 text-xs text-blue-500">
								✓ This value is set via environment variable and cannot be changed here
							</p>
						{:else}
							<p class="text-muted-foreground mt-1 text-xs">
								API key from SABnzbd Config → General → Security → API Key
							</p>
						{/if}
					</div>

					<div>
						<label for="sabnzbdCategory" class="mb-2 block text-sm font-medium">
							Download Category
						</label>
						<Input
							id="sabnzbdCategory"
							name="sabnzbdCategory"
							type="text"
							placeholder="books"
							value={settings.sabnzbdCategory || 'books'}
							disabled={envOverrides.sabnzbdCategory}
						/>
						{#if envOverrides.sabnzbdCategory}
							<p class="mt-1 text-xs text-blue-500">
								✓ This value is set via environment variable and cannot be changed here
							</p>
						{:else}
							<p class="text-muted-foreground mt-1 text-xs">
								SABnzbd category for book downloads (must exist in SABnzbd settings)
							</p>
						{/if}
					</div>

					<div class="flex gap-3">
						<Button type="submit">Save Settings</Button>
						{#if settings.sabnzbdUrl && settings.sabnzbdApiKey}
							<Button
								type="button"
								variant="outline"
								onclick={async () => {
									isTesting = true;
									try {
										const response = await fetch('/api/sabnzbd/test', { method: 'POST' });
										const result = await response.json();
										if (result.success) {
											alert(`SABnzbd connection successful! Version: ${result.version}`);
										} else {
											alert(`SABnzbd connection failed: ${result.error}`);
										}
									} catch {
										alert('Failed to test SABnzbd connection');
									} finally {
										isTesting = false;
									}
								}}
								disabled={isTesting}
							>
								<TestTube class="mr-2 h-4 w-4" />
								Test Connection
							</Button>
						{/if}
					</div>

					{#if form?.success}
						<div class="rounded-md bg-green-500/10 p-4 text-sm text-green-500">
							Settings saved successfully!
						</div>
					{/if}

					{#if form?.error}
						<div class="bg-destructive/10 text-destructive rounded-md p-4 text-sm">
							{form.error}
						</div>
					{/if}
				</form>
			{:else if activeSubTab === 'booklore'}
				<!-- Booklore Integration -->
				<form
					method="POST"
					action="?/updateSettings"
					use:enhance={() => {
						return async ({ update }) => {
							await update({ reset: false });
						};
					}}
					class="space-y-4"
				>
					<div class="flex items-center gap-2">
						<input type="hidden" name="bookloreEnabled__present" value="1" />
						<input
							type="checkbox"
							id="bookloreEnabled"
							name="bookloreEnabled"
							class="rounded"
							checked={settings.bookloreEnabled}
						/>
						<label for="bookloreEnabled" class="text-sm font-medium">
							Enable Booklore Integration
						</label>
					</div>
					<p class="text-muted-foreground text-xs">
						Automatically copy downloaded books to Booklore's BookDrop folder for library ingestion
					</p>

					<div>
						<label for="bookloreBookdropPath" class="mb-2 block text-sm font-medium">
							BookDrop Folder Path
						</label>
						<Input
							id="bookloreBookdropPath"
							name="bookloreBookdropPath"
							type="text"
							placeholder="/path/to/booklore/bookdrop"
							value={settings.bookloreBookdropPath || ''}
							disabled={envOverrides.bookloreBookdropPath}
						/>
						{#if envOverrides.bookloreBookdropPath}
							<p class="mt-1 text-xs text-blue-500">
								✓ This value is set via environment variable and cannot be changed here
							</p>
						{:else}
							<p class="text-muted-foreground mt-1 text-xs">
								Full path to Booklore's BookDrop folder (required for auto-import)
							</p>
						{/if}
					</div>

					<div>
						<label for="bookloreBaseUrl" class="mb-2 block text-sm font-medium">
							Booklore Base URL (Optional)
						</label>
						<Input
							id="bookloreBaseUrl"
							name="bookloreBaseUrl"
							type="url"
							placeholder="http://localhost:3001"
							value={settings.bookloreBaseUrl || ''}
							disabled={envOverrides.bookloreBaseUrl}
						/>
						{#if envOverrides.bookloreBaseUrl}
							<p class="mt-1 text-xs text-blue-500">
								✓ This value is set via environment variable and cannot be changed here
							</p>
						{:else}
							<p class="text-muted-foreground mt-1 text-xs">
								Booklore API URL for health checks (optional)
							</p>
						{/if}
					</div>

					<div>
						<label for="bookloreApiKey" class="mb-2 block text-sm font-medium">
							Booklore API Key (Optional)
						</label>
						<Input
							id="bookloreApiKey"
							name="bookloreApiKey"
							type="password"
							placeholder="Enter Booklore API key"
							value={settings.bookloreApiKey || ''}
							disabled={envOverrides.bookloreApiKey}
						/>
						{#if envOverrides.bookloreApiKey}
							<p class="mt-1 text-xs text-blue-500">
								✓ This value is set via environment variable and cannot be changed here
							</p>
						{:else}
							<p class="text-muted-foreground mt-1 text-xs">
								API key for Booklore (if authentication is required)
							</p>
						{/if}
					</div>

					<div class="flex items-center gap-2">
						<input type="hidden" name="bookloreVerifyImports__present" value="1" />
						<input
							type="checkbox"
							id="bookloreVerifyImports"
							name="bookloreVerifyImports"
							class="rounded"
							checked={settings.bookloreVerifyImports}
						/>
						<label for="bookloreVerifyImports" class="text-sm font-medium">
							Verify imports via API
						</label>
					</div>
					<p class="text-muted-foreground text-xs">
						Check Booklore API to verify successful import (requires API URL and key)
					</p>

					<div class="flex gap-3">
						<Button type="submit">Save Settings</Button>
					</div>

					{#if form?.success}
						<div class="rounded-md bg-green-500/10 p-4 text-sm text-green-500">
							{form.message || 'Settings saved successfully!'}
						</div>
					{/if}

					{#if form?.error}
						<div class="bg-destructive/10 text-destructive rounded-md p-4 text-sm">
							{form.error}
						</div>
					{/if}
				</form>

				{#if settings.bookloreBookdropPath}
					<form
						method="POST"
						action="?/testBookloreConnection"
						use:enhance={() => {
							return async ({ update }) => {
								await update({ reset: false });
							};
						}}
						class="mt-4"
					>
						<Button type="submit" variant="outline">
							<TestTube class="mr-2 h-4 w-4" />
							Test Connection
						</Button>
					</form>
				{/if}
			{:else if activeSubTab === 'general'}
				<!-- General Download Settings -->
				<form
					method="POST"
					action="?/updateSettings"
					use:enhance={() => {
						return async ({ update }) => {
							await update({ reset: false });
						};
					}}
					class="space-y-4"
				>
					<div>
						<label for="downloadSourcePriority" class="mb-2 block text-sm font-medium">
							Download Source Priority
						</label>
						<select
							id="downloadSourcePriority"
							name="downloadSourcePriority"
							value={settings.downloadSourcePriority || 'prowlarr_first'}
							class="border-input ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
							style="background-color: hsl(var(--input));"
						>
							<option value="prowlarr_first">Prowlarr First (fallback to Anna's Archive)</option>
							<option value="annas_archive_first"
								>Anna's Archive First (fallback to Prowlarr)</option
							>
							<option value="prowlarr_only">Prowlarr Only</option>
							<option value="annas_archive_only">Anna's Archive Only</option>
						</select>
						<p class="text-muted-foreground mt-1 text-xs">
							Control which download source is tried first when a request is approved
						</p>
					</div>

					<div class="flex items-center gap-2">
						<input type="hidden" name="downloadAutoSelect__present" value="1" />
						<input
							type="checkbox"
							id="downloadAutoSelect"
							name="downloadAutoSelect"
							checked={settings.downloadAutoSelect}
							class="h-4 w-4 rounded border-gray-300"
						/>
						<label for="downloadAutoSelect" class="text-sm font-medium">
							Auto-Select Best File
						</label>
					</div>
					<p class="text-muted-foreground text-xs">
						Automatically choose the best file format, or prompt for manual selection
					</p>

					<div>
						<label for="calibreBaseUrl" class="mb-2 block text-sm font-medium">
							Calibre Base URL (Optional)
						</label>
						<Input
							id="calibreBaseUrl"
							name="calibreBaseUrl"
							type="url"
							placeholder="https://calibre.example.com"
							value={settings.calibreBaseUrl || ''}
						/>
						<p class="text-muted-foreground mt-1 text-xs">
							Base URL for Calibre-Web interface to link downloaded books
						</p>
					</div>

					{#if settings.calibreBaseUrl}
						<div class="space-y-4 rounded-md bg-blue-500/10 p-4">
							<h3 class="text-sm font-semibold text-blue-600">Calibre-Web Automated Integration</h3>

							<div class="flex items-center gap-2">
								<input type="hidden" name="calibreCleanupEnabled__present" value="1" />
								<input
									type="checkbox"
									id="calibreCleanupEnabled"
									name="calibreCleanupEnabled"
									checked={settings.calibreCleanupEnabled}
									class="h-4 w-4 rounded border-gray-300"
								/>
								<label for="calibreCleanupEnabled" class="text-sm font-medium">
									Enable automatic cleanup of ingested files
								</label>
							</div>

							{#if settings.calibreCleanupEnabled}
								<div>
									<label for="calibreCleanupHours" class="mb-2 block text-sm font-medium">
										Cleanup files older than (hours)
									</label>
									<Input
										id="calibreCleanupHours"
										name="calibreCleanupHours"
										type="number"
										min="1"
										max="168"
										placeholder="24"
										value={settings.calibreCleanupHours || '24'}
									/>
									<p class="text-muted-foreground mt-1 text-xs">
										Files in the download directory will be automatically removed after this many
										hours, assuming Calibre-Web has imported them
									</p>
								</div>
							{/if}
						</div>
					{/if}

					<div class="flex gap-3">
						<Button type="submit">Save Settings</Button>
					</div>

					{#if form?.success}
						<div class="rounded-md bg-green-500/10 p-4 text-sm text-green-500">
							Settings saved successfully!
						</div>
					{/if}

					{#if form?.error}
						<div class="bg-destructive/10 text-destructive rounded-md p-4 text-sm">
							{form.error}
						</div>
					{/if}
				</form>
			{/if}
		</div>
	</div>
</Card>
