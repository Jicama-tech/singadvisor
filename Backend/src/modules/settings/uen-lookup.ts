/**
 * Checking a Singapore UEN against ACRA's public register.
 *
 * data.gov.sg publishes the whole entity register as a free open dataset —
 * no key, no account, no per-call cost. eventsh-v1 verifies exhibitor UENs
 * against the same resource (see its eventFront.tsx), and this is the same
 * lookup moved server-side.
 *
 * SERVER-side rather than from the browser, which is where eventsh does it,
 * for three reasons: the result is written to the settings document and the
 * thing that writes it should be the thing that fetched it; a browser call
 * depends on data.gov.sg's CORS policy staying as it is; and a timeout and a
 * clear error are easier to guarantee here than in a fetch buried in a form.
 *
 * WHAT A VERIFIED UEN MEANS, because it is narrower than it sounds: this
 * entity is in the register under this number, with this name and status. It
 * does not mean the person entering it is connected to that entity. It is a
 * typo check and a name confirmation, not an identity proof.
 */

/** The ACRA "Entities Registered with ACRA" resource on data.gov.sg. */
const ACRA_RESOURCE = 'd_3f960c10fed6145404ca7b821f263b87';

/** data.gov.sg is a third party in the middle of an admin saving a form, so
 * it gets a short leash. */
const TIMEOUT_MS = 12_000;

export type UenDetails = {
  uen: string;
  entityName: string;
  status: string;
  entityType: string;
  issueDate: string;
  agency: string;
  address: string;
  verifiedAt: string;
};

export type UenLookupResult =
  | { found: true; details: UenDetails }
  | { found: false; reason: string };

/**
 * Singapore UENs are 9 or 10 characters, alphanumeric.
 *
 * Nine for the older business numbers (53464793J), ten for companies and other
 * entities (201812345A, T08LL1234K). Checked before the network call so an
 * obvious typo costs nothing and reads as what it is.
 */
export function looksLikeUen(uen: string): boolean {
  return /^[0-9A-Z]{9,10}$/.test(uen.trim().toUpperCase());
}

export async function lookupUen(raw: string): Promise<UenLookupResult> {
  const uen = (raw || '').trim().toUpperCase();
  if (!uen) return { found: false, reason: 'Enter a UEN first.' };
  if (!looksLikeUen(uen)) {
    return {
      found: false,
      reason: 'A UEN is 9 or 10 letters and digits — for example 53464793J or 201812345A.',
    };
  }

  const filters = encodeURIComponent(JSON.stringify({ uen }));
  const url = `https://data.gov.sg/api/action/datastore_search?resource_id=${ACRA_RESOURCE}&filters=${filters}&limit=1`;

  let body: {
    success?: boolean;
    result?: { records?: Record<string, unknown>[] };
  };
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!response.ok) {
      return { found: false, reason: `The ACRA registry answered ${response.status}. Try again shortly.` };
    }
    body = (await response.json()) as typeof body;
  } catch {
    return { found: false, reason: 'Could not reach the ACRA registry. Try again shortly.' };
  }

  const record = body?.result?.records?.[0];
  if (!record) {
    // Deliberately not an error. A UEN issued in the last few days may not be
    // in the published dataset yet, and telling somebody their real company
    // "does not exist" would be both wrong and alarming.
    return {
      found: false,
      reason:
        'That UEN is not in the ACRA register. A very recently registered entity may not appear yet — check it on bizfile.gov.sg if you believe it is correct.',
    };
  }

  const str = (key: string): string => {
    const value = record[key];
    return typeof value === 'string' ? value : value == null ? '' : String(value);
  };

  return {
    found: true,
    details: {
      uen: str('uen') || uen,
      entityName: str('entity_name'),
      status: str('uen_status_desc'),
      entityType: str('entity_type_desc'),
      issueDate: str('uen_issue_date'),
      agency: str('issuance_agency_desc') || 'ACRA',
      address: [str('reg_street_name'), str('reg_postal_code')].filter(Boolean).join(', '),
      verifiedAt: new Date().toISOString(),
    },
  };
}
