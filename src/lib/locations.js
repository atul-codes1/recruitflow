/**
 * ============================================================================
 * LOCATION INTELLIGENCE MODULE (src/lib/locations.js)
 * ============================================================================
 *
 * Handles Indian city normalization and metro region grouping.
 * Zero dependencies. Pure JavaScript lookup tables.
 *
 * Three concerns:
 * 1. NORMALIZATION: "Gurgaon" → "Gurugram" (canonical name)
 * 2. METRO GROUPING: "Gurugram" → "Delhi NCR"  
 * 3. SEARCH EXPANSION: "Delhi NCR" → ["Delhi", "Noida", "Gurugram", ...]
 */

// ----------------------------------------------------------------------------
// 1. CITY ALIAS MAP
// All keys are lowercase for case-insensitive matching.
// Maps common/old/misspelled names → official canonical name.
// ----------------------------------------------------------------------------
const CITY_ALIASES = {
  // Delhi NCR aliases
  'gurgaon': 'Gurugram',
  'gurugram': 'Gurugram',
  'noida': 'Noida',
  'greater noida': 'Greater Noida',
  'ghaziabad': 'Ghaziabad',
  'faridabad': 'Faridabad',
  'delhi': 'Delhi',
  'new delhi': 'Delhi',
  'dwarka': 'Delhi',
  'manesar': 'Gurugram',
  'bhiwadi': 'Bhiwadi',
  'bahadurgarh': 'Bahadurgarh',
  'sonipat': 'Sonipat',

  // Mumbai
  'bombay': 'Mumbai',
  'mumbai': 'Mumbai',
  'navi mumbai': 'Navi Mumbai',
  'thane': 'Thane',
  'kalyan': 'Kalyan',
  'dombivli': 'Dombivli',
  'vasai': 'Vasai-Virar',
  'virar': 'Vasai-Virar',
  'vasai-virar': 'Vasai-Virar',
  'panvel': 'Panvel',
  'mira road': 'Mira Road',
  'bhiwandi': 'Bhiwandi',

  // Bengaluru
  'bangalore': 'Bengaluru',
  'bengaluru': 'Bengaluru',
  'blr': 'Bengaluru',
  'banglore': 'Bengaluru',
  'bangaluru': 'Bengaluru',
  'electronic city': 'Bengaluru',
  'whitefield': 'Bengaluru',
  'koramangala': 'Bengaluru',
  'hsr layout': 'Bengaluru',
  'indiranagar': 'Bengaluru',

  // Hyderabad
  'hyderabad': 'Hyderabad',
  'hyd': 'Hyderabad',
  'secunderabad': 'Hyderabad',
  'cyberabad': 'Hyderabad',
  'hitech city': 'Hyderabad',
  'madhapur': 'Hyderabad',
  'gachibowli': 'Hyderabad',

  // Chennai
  'madras': 'Chennai',
  'chennai': 'Chennai',
  'tambaram': 'Chennai',
  'sholinganallur': 'Chennai',
  'omr': 'Chennai',
  'perungudi': 'Chennai',
  'siruseri': 'Chennai',

  // Pune
  'pune': 'Pune',
  'poona': 'Pune',
  'pimpri': 'Pune',
  'chinchwad': 'Pune',
  'pimpri-chinchwad': 'Pune',
  'hinjewadi': 'Pune',
  'wakad': 'Pune',
  'baner': 'Pune',
  'kharadi': 'Pune',

  // Kolkata
  'calcutta': 'Kolkata',
  'kolkata': 'Kolkata',
  'salt lake': 'Kolkata',
  'rajarhat': 'Kolkata',
  'howrah': 'Kolkata',
  'new town': 'Kolkata',

  // Ahmedabad
  'ahmedabad': 'Ahmedabad',
  'amdavad': 'Ahmedabad',
  'gandhinagar': 'Gandhinagar',

  // Other major cities
  'jaipur': 'Jaipur',
  'lucknow': 'Lucknow',
  'kanpur': 'Kanpur',
  'nagpur': 'Nagpur',
  'patna': 'Patna',
  'bhopal': 'Bhopal',
  'indore': 'Indore',
  'kochi': 'Kochi',
  'cochin': 'Kochi',
  'ernakulam': 'Kochi',
  'thiruvananthapuram': 'Thiruvananthapuram',
  'trivandrum': 'Thiruvananthapuram',
  'coimbatore': 'Coimbatore',
  'madurai': 'Madurai',
  'visakhapatnam': 'Visakhapatnam',
  'vizag': 'Visakhapatnam',
  'surat': 'Surat',
  'vadodara': 'Vadodara',
  'baroda': 'Vadodara',
  'rajkot': 'Rajkot',
  'chandigarh': 'Chandigarh',
  'mohali': 'Mohali',
  'panchkula': 'Panchkula',
  'amritsar': 'Amritsar',
  'ludhiana': 'Ludhiana',
  'dehradun': 'Dehradun',
  'bhubaneswar': 'Bhubaneswar',
  'mysore': 'Mysuru',
  'mysuru': 'Mysuru',
  'mangalore': 'Mangaluru',
  'mangaluru': 'Mangaluru',
  'hubli': 'Hubballi',
  'hubballi': 'Hubballi',
  'belgaum': 'Belagavi',
  'belagavi': 'Belagavi',
  'ranchi': 'Ranchi',
  'raipur': 'Raipur',
  'agra': 'Agra',
  'varanasi': 'Varanasi',
  'benares': 'Varanasi',
  'allahabad': 'Prayagraj',
  'prayagraj': 'Prayagraj',
  'nashik': 'Nashik',
  'aurangabad': 'Aurangabad',
  'goa': 'Goa',
  'panaji': 'Goa',
  'remote': 'Remote',
  'work from home': 'Remote',
  'wfh': 'Remote',
};

// ----------------------------------------------------------------------------
// 2. METRO REGION MAP
// Key = metro region canonical name
// Value = array of canonical city names that belong to it
// ----------------------------------------------------------------------------
const METRO_REGIONS = {
  'Delhi NCR': [
    'Delhi', 'Noida', 'Greater Noida', 'Gurugram', 'Ghaziabad',
    'Faridabad', 'Bahadurgarh', 'Sonipat', 'Bhiwadi', 'Manesar',
  ],
  'Mumbai Metropolitan Region': [
    'Mumbai', 'Navi Mumbai', 'Thane', 'Kalyan', 'Dombivli',
    'Vasai-Virar', 'Panvel', 'Mira Road', 'Bhiwandi',
  ],
  'Bengaluru Metropolitan': [
    'Bengaluru',
  ],
  'Hyderabad Metropolitan': [
    'Hyderabad',
  ],
  'Chennai Metropolitan': [
    'Chennai',
  ],
  'Pune Metropolitan': [
    'Pune',
  ],
  'Kolkata Metropolitan': [
    'Kolkata', 'Howrah',
  ],
  'Ahmedabad-Gandhinagar': [
    'Ahmedabad', 'Gandhinagar',
  ],
  'Chandigarh Tricity': [
    'Chandigarh', 'Mohali', 'Panchkula',
  ],
};

// Reverse map: city → metro region (built once at startup)
const CITY_TO_METRO = {};
for (const [metro, cities] of Object.entries(METRO_REGIONS)) {
  for (const city of cities) {
    CITY_TO_METRO[city] = metro;
  }
}

// Metro name aliases (what a recruiter might type)
const METRO_ALIASES = {
  'ncr': 'Delhi NCR',
  'delhi ncr': 'Delhi NCR',
  'delhincr': 'Delhi NCR',
  'mmr': 'Mumbai Metropolitan Region',
  'mumbai metropolitan': 'Mumbai Metropolitan Region',
  'mumbai region': 'Mumbai Metropolitan Region',
  'bangalore metropolitan': 'Bengaluru Metropolitan',
  'hyderabad metropolitan': 'Hyderabad Metropolitan',
  'tricity': 'Chandigarh Tricity',
  'tri-city': 'Chandigarh Tricity',
  'ahmedabad gandhinagar': 'Ahmedabad-Gandhinagar',
};

// ----------------------------------------------------------------------------
// 3. EXPORTED FUNCTIONS
// ----------------------------------------------------------------------------

/**
 * Normalizes a raw city string to its canonical form.
 * Handles case insensitivity, extra spaces, dots.
 * 
 * @param {string} rawCity - e.g. "GURGAON", "Bangalore.", "blr"
 * @returns {string} - e.g. "Gurugram", "Bengaluru"
 */
export function normalizeCity(rawCity) {
  if (!rawCity || typeof rawCity !== 'string') return '';
  const key = rawCity.toLowerCase().trim().replace(/\.$/, '');
  return CITY_ALIASES[key] || rawCity.trim();
}

/**
 * Returns the metro region for a canonical city name.
 * 
 * @param {string} canonicalCity - e.g. "Gurugram"
 * @returns {string|null} - e.g. "Delhi NCR", or null if not in a metro
 */
export function getMetroRegion(canonicalCity) {
  if (!canonicalCity) return null;
  return CITY_TO_METRO[canonicalCity] || null;
}

/**
 * Given a search location term, returns ALL cities that should match.
 * Handles metro region names, city names, aliases.
 *
 * @param {string} searchTerm - e.g. "Delhi NCR", "Bangalore", "Gurgaon"
 * @returns {string[]} - Array of canonical city names to match against DB
 */
export function expandLocationForSearch(searchTerm) {
  if (!searchTerm || typeof searchTerm !== 'string') return [];

  const key = searchTerm.toLowerCase().trim();

  // Check if it's a metro alias
  const metroName = METRO_ALIASES[key];
  if (metroName && METRO_REGIONS[metroName]) {
    return METRO_REGIONS[metroName];
  }

  // Check if it's a direct metro region name
  for (const [metro, cities] of Object.entries(METRO_REGIONS)) {
    if (metro.toLowerCase() === key) {
      return cities;
    }
  }

  // Otherwise normalize as a city and return just that city
  const normalized = normalizeCity(searchTerm);
  return [normalized];
}

/**
 * Returns a list of all metro region canonical names.
 * Used by the UI to populate location filter dropdowns.
 */
export function getAllMetroRegions() {
  return Object.keys(METRO_REGIONS);
}
