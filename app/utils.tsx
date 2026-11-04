import Fuse from "fuse.js";

export const normalizeString = (str: string) =>
  str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replaceAll(/[^a-z0-9]/gi, " ");

export const stringsOverlap = (aRaw: string, bRaw: string) => {
  const a = normalizeString(aRaw);
  const b = normalizeString(bRaw);

  return a.includes(b) || b.includes(a);
};

export const fuseCompare = (aRaw: string, bRaw: string) =>
  Math.min(
    new Fuse([normalizeString(aRaw)], {
      includeScore: true,
      isCaseSensitive: false,
      ignoreFieldNorm: true,
      ignoreLocation: true,
      useTokenSearch: true,
      findAllMatches: true,
    }).search(normalizeString(bRaw))[0]?.score || 1,
    new Fuse([normalizeString(bRaw)], {
      includeScore: true,
      isCaseSensitive: false,
      ignoreFieldNorm: true,
      ignoreLocation: true,
      useTokenSearch: true,
      findAllMatches: true,
    }).search(normalizeString(aRaw))[0]?.score || 1,
  );

export const fuzzyOverlap = (aRaw: string, bRaw: string, threshold = 0.25) =>
  stringsOverlap(aRaw, bRaw) || fuseCompare(aRaw, bRaw) <= threshold;
