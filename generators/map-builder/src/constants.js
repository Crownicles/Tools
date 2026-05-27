/**
 * Static config: repos, branches, paths, localStorage keys, magic numbers.
 * Never mutated at runtime.
 */

export const DEFAULTS = {
  cwOwnerRepo: "Crownicles/Crownicles",
  wsOwnerRepo: "Crownicles/Website",
  // Default to master so the tool reflects production state.
  // Use the UI selector to preview develop or any WIP branch.
  cwBranch: "master",
  wsBranch: "master",
  toolsOwnerRepo: "Crownicles/Tools",
  // mapCoords live in the Tools repo (source of truth), not in Crownicles.
  mapCoordsOwnerRepo: "Crownicles/Tools",
  mapCoordsBranch: "master"
};

export const PATHS = {
  mapCoords: "generators/map-builder/mapCoords",
  mapLocations: "Core/resources/mapLocations",
  mapLinks: "Core/resources/mapLinks",
  models: "Lang/fr/models.json",
  websiteRessources: "public/ressources/maps",
  websiteMapsCursed: "public/ressources/mapsCursed",
  toolsRessources: "generators/Ressources"
};

export const LS_KEYS = {
  pat: "mapBuilderPat",
  cwBranch: "mapBuilderCwBranch",
  wsBranch: "mapBuilderWsBranch",
  cwRepo: "mapBuilderCwRepo",
  wsRepo: "mapBuilderWsRepo",
  mapCoordsRepo: "mapBuilderMapCoordsRepo",
  mapCoordsBranch: "mapBuilderMapCoordsBranch",
  season: "mapBuilderSeason",
  currentTab: "mapBuilderCurrentTab",
  zoom: "mapBuilderZoom"
};

export const GITHUB_BATCH_SIZE = 12;
export const GITHUB_BATCH_DELAY_MS = 200;
export const SNAP_PX = 1;

/**
 * Location types that have no visual marker on any map page (pseudo-locations
 * representing logical entities, not geographic points). Aligned with the
 * Crownicles MapLocationType enum: `continent` denotes the continent itself,
 * not a place a player can be drawn at.
 */
export const NON_RENDERABLE_LOCATION_TYPES = new Set(["continent"]);
