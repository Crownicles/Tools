// ==========================================================================
// Entry point. All UI handlers (loadFromGithub, switchTab, filterMaterials,
// renderCompare) are wired via inline `onclick` attributes in index.html
// and resolve to the global functions defined in the other scripts.
//
// This file intentionally only contains lightweight bootstrap logic.
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
    // No-op for now: the user must click "Charger depuis GitHub" explicitly.
    // Hook here if you ever want to auto-load on page open.
});
