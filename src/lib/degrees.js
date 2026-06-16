/**
 * ============================================================================
 * DEGREE NORMALIZATION MODULE (src/lib/degrees.js)
 * ============================================================================
 *
 * Handles all Indian and international degree variants:
 * "M.C.A", "MCA", "Master of Computer Applications", "Masters in Computers"
 * all normalize to → "Master of Computer Applications"
 *
 * Three concerns:
 * 1. NORMALIZATION: Strip dots/spaces/case → lookup → canonical full name
 * 2. LEVEL GROUPING: "Master of Computer Applications" → "Postgraduate"
 * 3. SEARCH EXPANSION: "engineering" → [B.Tech, B.E., M.Tech, M.E., ...]
 */

// ----------------------------------------------------------------------------
// 1. DEGREE NORMALIZATION MAP
// Key: stripped lowercase (no dots, no spaces) → canonical full name
// This handles variants like "b.tech", "btech", "b tech", "BE", "b.e" etc.
// ----------------------------------------------------------------------------
const DEGREE_MAP = {
  // ── Engineering / Technology ──────────────────────────────────────────────
  'btech':          'Bachelor of Technology',
  'be':             'Bachelor of Engineering',
  'beng':           'Bachelor of Engineering',
  'bse':            'Bachelor of Science in Engineering',
  'mtech':          'Master of Technology',
  'me':             'Master of Engineering',
  'meng':           'Master of Engineering',
  'bearchitecture': 'Bachelor of Architecture',
  'barch':          'Bachelor of Architecture',
  'march':          'Master of Architecture',

  // ── Computer Science / IT ─────────────────────────────────────────────────
  'mca':            'Master of Computer Applications',
  'bca':            'Bachelor of Computer Applications',
  'bsccs':          'Bachelor of Science in Computer Science',
  'bscit':          'Bachelor of Science in Information Technology',
  'msccs':          'Master of Science in Computer Science',
  'mscit':          'Master of Science in Information Technology',
  'bit':            'Bachelor of Information Technology',
  'mit':            'Master of Information Technology',

  // ── Science ───────────────────────────────────────────────────────────────
  'bsc':            'Bachelor of Science',
  'bs':             'Bachelor of Science',
  'msc':            'Master of Science',
  'ms':             'Master of Science',
  'mscmaths':       'Master of Science in Mathematics',
  'mscphysics':     'Master of Science in Physics',
  'mscchemistry':   'Master of Science in Chemistry',

  // ── Business / Management ─────────────────────────────────────────────────
  'mba':            'Master of Business Administration',
  'bba':            'Bachelor of Business Administration',
  'bms':            'Bachelor of Management Studies',
  'pgdm':           'Post Graduate Diploma in Management',
  'pgpm':           'Post Graduate Programme in Management',
  'mms':            'Master of Management Studies',
  'mib':            'Master of International Business',
  'mbafin':         'Master of Business Administration in Finance',
  'mbamarketing':   'Master of Business Administration in Marketing',
  'mbahr':          'Master of Business Administration in Human Resources',
  'mbaops':         'Master of Business Administration in Operations',

  // ── Commerce / Economics ──────────────────────────────────────────────────
  'bcom':           'Bachelor of Commerce',
  'mcom':           'Master of Commerce',
  'baeconomics':    'Bachelor of Arts in Economics',
  'maeconomics':    'Master of Arts in Economics',
  'caintermediate': 'CA Intermediate',
  'cafinal':        'Chartered Accountant',
  'ca':             'Chartered Accountant',
  'cma':            'Cost and Management Accountant',
  'icwa':           'Cost and Management Accountant',
  'cs':             'Company Secretary',

  // ── Arts / Humanities ─────────────────────────────────────────────────────
  'ba':             'Bachelor of Arts',
  'ma':             'Master of Arts',
  'bfa':            'Bachelor of Fine Arts',
  'mfa':            'Master of Fine Arts',
  'bjmc':           'Bachelor of Journalism and Mass Communication',
  'mjmc':           'Master of Journalism and Mass Communication',

  // ── Law ───────────────────────────────────────────────────────────────────
  'llb':            'Bachelor of Laws',
  'llm':            'Master of Laws',
  'ballb':          'Integrated BA LLB',
  'bballlb':        'Integrated BBA LLB',
  'bltechllb':      'Integrated B.Tech LLB',

  // ── Medical / Pharmacy ────────────────────────────────────────────────────
  'mbbs':           'Bachelor of Medicine and Surgery',
  'md':             'Doctor of Medicine',
  'ms':             'Master of Surgery',
  'bds':            'Bachelor of Dental Surgery',
  'mds':            'Master of Dental Surgery',
  'bams':           'Bachelor of Ayurvedic Medicine and Surgery',
  'bhms':           'Bachelor of Homeopathic Medicine and Surgery',
  'bnys':           'Bachelor of Naturopathy and Yogic Sciences',
  'bpt':            'Bachelor of Physiotherapy',
  'mpt':            'Master of Physiotherapy',
  'bot':            'Bachelor of Occupational Therapy',
  'bpharm':         'Bachelor of Pharmacy',
  'mpharm':         'Master of Pharmacy',
  'dpharm':         'Diploma in Pharmacy',
  'pharmd':         'Doctor of Pharmacy',
  'bsc nursing':    'Bachelor of Science in Nursing',
  'bscnursing':     'Bachelor of Science in Nursing',
  'gnm':            'General Nursing and Midwifery',

  // ── Education ─────────────────────────────────────────────────────────────
  'bed':            'Bachelor of Education',
  'med':            'Master of Education',
  'ded':            'Diploma in Education',
  'beled':          'Bachelor of Elementary Education',
  'dpharmed':       'Diploma in Pharmacy Education',

  // ── Hotel / Tourism / Hospitality ─────────────────────────────────────────
  'bhm':            'Bachelor of Hotel Management',
  'bhmct':          'Bachelor of Hotel Management and Catering Technology',
  'mhm':            'Master of Hotel Management',
  'bttm':           'Bachelor of Tourism and Travel Management',

  // ── Design ────────────────────────────────────────────────────────────────
  'bdes':           'Bachelor of Design',
  'mdes':           'Master of Design',
  'bftech':         'Bachelor of Fashion Technology',
  'mftech':         'Master of Fashion Technology',
  'bnid':           'Bachelor of New Media and Interactive Design',

  // ── Research ──────────────────────────────────────────────────────────────
  'phd':            'Doctor of Philosophy',
  'dphil':          'Doctor of Philosophy',
  'mphil':          'Master of Philosophy',

  // ── Diploma / Vocational ──────────────────────────────────────────────────
  'diploma':        'Diploma',
  'polytechnic':    'Diploma (Polytechnic)',
  'iti':            'Industrial Training Institute Certificate',
  'pgdca':          'Post Graduate Diploma in Computer Applications',
  'pgdba':          'Post Graduate Diploma in Business Administration',
  'pgdhrm':         'Post Graduate Diploma in Human Resource Management',
  'pgdsm':          'Post Graduate Diploma in Sales Management',
  'pgdfm':          'Post Graduate Diploma in Financial Management',

  // ── Social Work ───────────────────────────────────────────────────────────
  'bsw':            'Bachelor of Social Work',
  'msw':            'Master of Social Work',

  // ── Agriculture / Veterinary ──────────────────────────────────────────────
  'bsc agriculture': 'Bachelor of Science in Agriculture',
  'bscagriculture':  'Bachelor of Science in Agriculture',
  'msc agriculture': 'Master of Science in Agriculture',
  'bvsc':            'Bachelor of Veterinary Science',
  'mvsc':            'Master of Veterinary Science',
};

// ----------------------------------------------------------------------------
// 2. DEGREE LEVEL MAP
// Maps canonical degree names → education level category
// Used for "postgraduate candidates" or "undergrad only" type searches
// ----------------------------------------------------------------------------
const DEGREE_LEVELS = {
  // Doctorate
  'Doctor of Philosophy':                    'Doctorate',
  'Doctor of Medicine':                      'Doctorate',
  'Master of Surgery':                       'Doctorate',
  'Doctor of Pharmacy':                      'Doctorate',

  // Postgraduate
  'Master of Technology':                    'Postgraduate',
  'Master of Engineering':                   'Postgraduate',
  'Master of Computer Applications':         'Postgraduate',
  'Master of Business Administration':       'Postgraduate',
  'Master of Science':                       'Postgraduate',
  'Master of Arts':                          'Postgraduate',
  'Master of Commerce':                      'Postgraduate',
  'Master of Fine Arts':                     'Postgraduate',
  'Master of Laws':                          'Postgraduate',
  'Master of Philosophy':                    'Postgraduate',
  'Master of Education':                     'Postgraduate',
  'Master of Social Work':                   'Postgraduate',
  'Master of Architecture':                  'Postgraduate',
  'Master of Design':                        'Postgraduate',
  'Master of Hotel Management':              'Postgraduate',
  'Master of International Business':        'Postgraduate',
  'Master of Management Studies':            'Postgraduate',
  'Master of Science in Computer Science':   'Postgraduate',
  'Master of Science in Information Technology': 'Postgraduate',
  'Master of Information Technology':        'Postgraduate',
  'Master of Physiotherapy':                 'Postgraduate',
  'Master of Pharmacy':                      'Postgraduate',
  'Master of Dental Surgery':                'Postgraduate',
  'Post Graduate Diploma in Management':     'Postgraduate',
  'Post Graduate Programme in Management':   'Postgraduate',
  'Post Graduate Diploma in Computer Applications': 'Postgraduate',
  'Post Graduate Diploma in Business Administration': 'Postgraduate',
  'Chartered Accountant':                    'Postgraduate',
  'Cost and Management Accountant':          'Postgraduate',
  'Company Secretary':                       'Postgraduate',

  // Undergraduate
  'Bachelor of Technology':                  'Undergraduate',
  'Bachelor of Engineering':                 'Undergraduate',
  'Bachelor of Computer Applications':       'Undergraduate',
  'Bachelor of Science':                     'Undergraduate',
  'Bachelor of Arts':                        'Undergraduate',
  'Bachelor of Commerce':                    'Undergraduate',
  'Bachelor of Business Administration':     'Undergraduate',
  'Bachelor of Management Studies':          'Undergraduate',
  'Bachelor of Laws':                        'Undergraduate',
  'Bachelor of Medicine and Surgery':        'Undergraduate',
  'Bachelor of Dental Surgery':              'Undergraduate',
  'Bachelor of Pharmacy':                    'Undergraduate',
  'Bachelor of Physiotherapy':               'Undergraduate',
  'Bachelor of Education':                   'Undergraduate',
  'Bachelor of Social Work':                 'Undergraduate',
  'Bachelor of Architecture':                'Undergraduate',
  'Bachelor of Design':                      'Undergraduate',
  'Bachelor of Fine Arts':                   'Undergraduate',
  'Bachelor of Hotel Management':            'Undergraduate',
  'Bachelor of Information Technology':      'Undergraduate',
  'Bachelor of Science in Computer Science': 'Undergraduate',
  'Bachelor of Science in Information Technology': 'Undergraduate',
  'Bachelor of Science in Nursing':          'Undergraduate',
  'Bachelor of Science in Agriculture':      'Undergraduate',
  'Bachelor of Science in Engineering':      'Undergraduate',
  'Bachelor of Ayurvedic Medicine and Surgery': 'Undergraduate',
  'Bachelor of Homeopathic Medicine and Surgery': 'Undergraduate',
  'Bachelor of Journalism and Mass Communication': 'Undergraduate',
  'Integrated BA LLB':                       'Undergraduate',
  'Integrated BBA LLB':                      'Undergraduate',
  'General Nursing and Midwifery':           'Undergraduate',

  // Diploma
  'Diploma':                                 'Diploma',
  'Diploma (Polytechnic)':                   'Diploma',
  'Diploma in Pharmacy':                     'Diploma',
  'Post Graduate Diploma in Human Resource Management': 'Diploma',
  'Post Graduate Diploma in Sales Management': 'Diploma',
  'Post Graduate Diploma in Financial Management': 'Diploma',

  // Vocational
  'Industrial Training Institute Certificate': 'Vocational',
  'CA Intermediate':                         'Vocational',
};

// ----------------------------------------------------------------------------
// 3. SEARCH GROUP MAP
// What degrees does a recruiter mean when they say a category keyword?
// ----------------------------------------------------------------------------
const SEARCH_GROUPS = {
  'engineering': [
    'Bachelor of Technology', 'Bachelor of Engineering',
    'Master of Technology', 'Master of Engineering',
    'Bachelor of Science in Engineering',
  ],
  'computer science': [
    'Bachelor of Technology', 'Bachelor of Engineering',
    'Master of Computer Applications', 'Bachelor of Computer Applications',
    'Bachelor of Science in Computer Science', 'Master of Science in Computer Science',
    'Bachelor of Science in Information Technology', 'Master of Information Technology',
  ],
  'it': [
    'Bachelor of Technology', 'Bachelor of Engineering',
    'Master of Computer Applications', 'Bachelor of Computer Applications',
    'Bachelor of Science in Information Technology',
  ],
  'management': [
    'Master of Business Administration', 'Post Graduate Diploma in Management',
    'Post Graduate Programme in Management', 'Master of Management Studies',
    'Bachelor of Business Administration', 'Bachelor of Management Studies',
  ],
  'postgraduate': Object.entries(DEGREE_LEVELS)
    .filter(([, level]) => level === 'Postgraduate')
    .map(([degree]) => degree),
  'undergraduate': Object.entries(DEGREE_LEVELS)
    .filter(([, level]) => level === 'Undergraduate')
    .map(([degree]) => degree),
  'doctorate': Object.entries(DEGREE_LEVELS)
    .filter(([, level]) => level === 'Doctorate')
    .map(([degree]) => degree),
  'medical': [
    'Bachelor of Medicine and Surgery', 'Doctor of Medicine', 'Master of Surgery',
    'Bachelor of Dental Surgery', 'Bachelor of Pharmacy', 'Doctor of Pharmacy',
  ],
  'law': ['Bachelor of Laws', 'Master of Laws', 'Integrated BA LLB', 'Integrated BBA LLB'],
  'commerce': ['Bachelor of Commerce', 'Master of Commerce', 'Chartered Accountant'],
};

// ----------------------------------------------------------------------------
// 4. EXPORTED FUNCTIONS
// ----------------------------------------------------------------------------

/**
 * Strips a raw degree string to a lookup key.
 * Removes dots, extra spaces, lowercases.
 * "M.C.A." → "mca", "B. Tech" → "btech"
 */
function toKey(raw) {
  return raw
    .toLowerCase()
    .replace(/\./g, '')    // remove dots
    .replace(/\s+/g, '')   // remove spaces
    .replace(/-/g, '')     // remove hyphens
    .trim();
}

/**
 * Normalizes any degree string to its canonical full name.
 * Handles dots, spaces, case variations.
 *
 * @param {string} rawDegree - e.g. "M.C.A.", "B. Tech", "bachelors in computer applications"
 * @returns {string} - e.g. "Master of Computer Applications"
 */
export function normalizeDegree(rawDegree) {
  if (!rawDegree || typeof rawDegree !== 'string') return rawDegree || '';

  const key = toKey(rawDegree);

  // Direct lookup
  if (DEGREE_MAP[key]) return DEGREE_MAP[key];

  // Fuzzy fallback: check if any key is contained in the input
  // e.g. "Bachelor of Technology in Computer Science" still matches "btech"
  for (const [mapKey, canonical] of Object.entries(DEGREE_MAP)) {
    if (key.includes(mapKey) || mapKey.includes(key)) {
      return canonical;
    }
  }

  // If no match, return original (properly cased) — never discard
  return rawDegree.trim();
}

/**
 * Returns the education level for a canonical degree name.
 *
 * @param {string} canonicalDegree - e.g. "Master of Computer Applications"
 * @returns {string} - e.g. "Postgraduate", "Undergraduate", "Doctorate", "Diploma", "Vocational"
 */
export function getDegreeLevel(canonicalDegree) {
  return DEGREE_LEVELS[canonicalDegree] || 'Other';
}

/**
 * Given a search term, returns all canonical degree names that should match.
 * Handles category keywords like "engineering", "postgraduate", specific degrees.
 *
 * @param {string} searchTerm - e.g. "MCA", "engineering", "postgraduate", "B.Tech"
 * @returns {string[]} - Array of canonical degree names to match against DB
 */
export function expandDegreeForSearch(searchTerm) {
  if (!searchTerm || typeof searchTerm !== 'string') return [];

  const key = toKey(searchTerm);
  const lower = searchTerm.toLowerCase().trim();

  // Check group keywords
  if (SEARCH_GROUPS[lower]) return SEARCH_GROUPS[lower];

  // Direct normalization
  const normalized = normalizeDegree(searchTerm);
  return [normalized];
}

/**
 * Normalizes an array of raw degrees extracted by AI.
 * Returns objects with both the canonical name and the level.
 *
 * @param {string[]} rawDegrees
 * @returns {{ canonical: string, level: string }[]}
 */
export function normalizeDegreeArray(rawDegrees) {
  if (!Array.isArray(rawDegrees)) return [];
  return rawDegrees.map(raw => {
    const canonical = normalizeDegree(raw);
    const level = getDegreeLevel(canonical);
    return { canonical, level };
  });
}
