import Fuse from "fuse.js";

export const normalizeString = (str: string) =>
  str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replaceAll(/[^a-z0-9]/gi, "");

export const stringsOverlap = (aRaw: string, bRaw: string) => {
  const a = normalizeString(aRaw);
  const b = normalizeString(bRaw);

  return a.includes(b) || b.includes(a);
};

export const fuseCompare = (aRaw: string, bRaw: string) =>
  new Fuse([normalizeString(aRaw)], {
    includeScore: true,
    useExtendedSearch: true,
    ignoreFieldNorm: true,
    threshold: 1,
    findAllMatches: true,
    ignoreLocation: true,
    minMatchCharLength: 1,
    location: 0,
    distance: 100,
    useTokenSearch: true,
    tokenMatch: "all",
  }).search(normalizeString(bRaw))[0].score || 1;

export const fuzzyOverlap = (aRaw: string, bRaw: string) =>
  stringsOverlap(aRaw, bRaw) || fuseCompare(aRaw, bRaw) <= 0.25;
