// ==========================================================================
// GitHub raw content fetcher + status banner helper.
// ==========================================================================

function updateStatus(message, type = 'loading') {
    const status = document.getElementById('githubStatus');
    status.textContent = message;
    status.className = `github-status ${type}`;
}

async function fetchRaw(owner, repo, branch, path) {
    const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch ${path}: ${response.status}`);
    return await response.json();
}

async function fetchText(owner, repo, branch, path) {
    const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch ${path}: ${response.status}`);
    return await response.text();
}

async function fetchDirListing(owner, repo, branch, path) {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to list directory ${path}: ${response.status}`);
    return await response.json();
}
