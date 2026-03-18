// Static mapping of state abbreviations → major metro areas.
// Used to seed zip-code discovery when scraping an entire state.

export const STATE_NAMES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri",
  MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
  NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio",
  OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
  SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont",
  VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
  DC: "Washington DC",
};

export const STATE_CITIES: Record<string, string[]> = {
  AL: ["Birmingham", "Montgomery", "Huntsville", "Mobile", "Tuscaloosa"],
  AK: ["Anchorage", "Fairbanks", "Juneau"],
  AZ: ["Phoenix", "Tucson", "Mesa", "Scottsdale", "Chandler", "Gilbert", "Glendale", "Tempe", "Peoria", "Surprise"],
  AR: ["Little Rock", "Fort Smith", "Fayetteville", "Springdale", "Jonesboro"],
  CA: ["Los Angeles", "San Diego", "San Jose", "San Francisco", "Fresno", "Sacramento", "Long Beach", "Oakland", "Bakersfield", "Anaheim", "Santa Ana", "Riverside", "Stockton", "Irvine", "Chula Vista", "Fremont", "San Bernardino", "Modesto", "Santa Clarita", "Glendale"],
  CO: ["Denver", "Colorado Springs", "Aurora", "Fort Collins", "Lakewood", "Boulder", "Pueblo", "Westminster", "Thornton", "Centennial"],
  CT: ["Bridgeport", "New Haven", "Hartford", "Stamford", "Waterbury", "Norwalk", "Danbury"],
  DE: ["Wilmington", "Dover", "Newark", "Middletown"],
  FL: ["Jacksonville", "Miami", "Tampa", "Orlando", "St. Petersburg", "Hialeah", "Tallahassee", "Fort Lauderdale", "Port St. Lucie", "Cape Coral", "Pembroke Pines", "Hollywood", "Gainesville", "Coral Springs", "Clearwater", "Palm Bay", "West Palm Beach", "Lakeland", "Miramar", "Pompano Beach"],
  GA: ["Atlanta", "Augusta", "Columbus", "Macon", "Savannah", "Athens", "Sandy Springs", "Roswell", "Albany", "Johns Creek", "Warner Robins", "Alpharetta", "Marietta"],
  HI: ["Honolulu", "Pearl City", "Hilo", "Kailua", "Waipahu", "Kaneohe"],
  ID: ["Boise", "Meridian", "Nampa", "Idaho Falls", "Pocatello", "Caldwell", "Coeur d'Alene"],
  IL: ["Chicago", "Aurora", "Joliet", "Naperville", "Rockford", "Springfield", "Elgin", "Peoria", "Champaign", "Waukegan", "Cicero", "Bloomington", "Arlington Heights"],
  IN: ["Indianapolis", "Fort Wayne", "Evansville", "South Bend", "Carmel", "Fishers", "Bloomington", "Hammond", "Gary", "Lafayette"],
  IA: ["Des Moines", "Cedar Rapids", "Davenport", "Sioux City", "Iowa City", "Waterloo", "Ames"],
  KS: ["Wichita", "Overland Park", "Kansas City", "Olathe", "Topeka", "Lawrence", "Shawnee"],
  KY: ["Louisville", "Lexington", "Bowling Green", "Owensboro", "Covington", "Richmond", "Florence"],
  LA: ["New Orleans", "Baton Rouge", "Shreveport", "Metairie", "Lafayette", "Lake Charles", "Bossier City", "Kenner"],
  ME: ["Portland", "Lewiston", "Bangor", "South Portland", "Auburn"],
  MD: ["Baltimore", "Frederick", "Rockville", "Gaithersburg", "Bowie", "Hagerstown", "Annapolis", "Columbia", "Silver Spring"],
  MA: ["Boston", "Worcester", "Springfield", "Cambridge", "Lowell", "New Bedford", "Brockton", "Quincy", "Lynn", "Fall River", "Newton"],
  MI: ["Detroit", "Grand Rapids", "Warren", "Sterling Heights", "Ann Arbor", "Lansing", "Flint", "Dearborn", "Livonia", "Westland", "Troy", "Farmington Hills", "Kalamazoo"],
  MN: ["Minneapolis", "St. Paul", "Rochester", "Duluth", "Bloomington", "Brooklyn Park", "Plymouth", "Maple Grove", "Woodbury", "St. Cloud"],
  MS: ["Jackson", "Gulfport", "Southaven", "Hattiesburg", "Biloxi", "Meridian"],
  MO: ["Kansas City", "St. Louis", "Springfield", "Columbia", "Independence", "Lee's Summit", "O'Fallon", "St. Joseph", "St. Charles"],
  MT: ["Billings", "Missoula", "Great Falls", "Bozeman", "Butte", "Helena"],
  NE: ["Omaha", "Lincoln", "Bellevue", "Grand Island", "Kearney", "Fremont"],
  NV: ["Las Vegas", "Henderson", "Reno", "North Las Vegas", "Sparks", "Carson City", "Summerlin", "Enterprise", "Spring Valley"],
  NH: ["Manchester", "Nashua", "Concord", "Derry", "Dover", "Rochester", "Salem"],
  NJ: ["Newark", "Jersey City", "Paterson", "Elizabeth", "Edison", "Woodbridge", "Lakewood", "Toms River", "Hamilton", "Trenton", "Clifton", "Camden"],
  NM: ["Albuquerque", "Las Cruces", "Rio Rancho", "Santa Fe", "Roswell", "Farmington"],
  NY: ["New York City", "Buffalo", "Rochester", "Yonkers", "Syracuse", "Albany", "New Rochelle", "Mount Vernon", "Schenectady", "Utica", "White Plains", "Hempstead"],
  NC: ["Charlotte", "Raleigh", "Greensboro", "Durham", "Winston-Salem", "Fayetteville", "Cary", "Wilmington", "High Point", "Concord", "Asheville", "Gastonia"],
  ND: ["Fargo", "Bismarck", "Grand Forks", "Minot", "West Fargo"],
  OH: ["Columbus", "Cleveland", "Cincinnati", "Toledo", "Akron", "Dayton", "Parma", "Canton", "Youngstown", "Lorain", "Hamilton", "Springfield"],
  OK: ["Oklahoma City", "Tulsa", "Norman", "Broken Arrow", "Edmond", "Moore", "Midwest City", "Lawton"],
  OR: ["Portland", "Salem", "Eugene", "Gresham", "Hillsboro", "Beaverton", "Bend", "Medford", "Springfield", "Corvallis"],
  PA: ["Philadelphia", "Pittsburgh", "Allentown", "Erie", "Reading", "Scranton", "Bethlehem", "Lancaster", "Harrisburg", "Altoona", "York"],
  RI: ["Providence", "Warwick", "Cranston", "Pawtucket", "East Providence", "Woonsocket"],
  SC: ["Columbia", "Charleston", "North Charleston", "Mount Pleasant", "Rock Hill", "Greenville", "Spartanburg", "Myrtle Beach"],
  SD: ["Sioux Falls", "Rapid City", "Aberdeen", "Brookings", "Watertown"],
  TN: ["Memphis", "Nashville", "Knoxville", "Chattanooga", "Clarksville", "Murfreesboro", "Franklin", "Jackson", "Johnson City"],
  TX: ["Houston", "San Antonio", "Dallas", "Austin", "Fort Worth", "El Paso", "Arlington", "Corpus Christi", "Plano", "Laredo", "Lubbock", "Garland", "Irving", "Amarillo", "Grand Prairie", "McKinney", "Frisco", "Mesquite", "Pasadena", "Killeen", "McAllen", "Waco", "Carrollton", "Denton", "Midland"],
  UT: ["Salt Lake City", "West Valley City", "Provo", "West Jordan", "Orem", "Sandy", "Ogden", "St. George", "Layton", "Millcreek"],
  VT: ["Burlington", "South Burlington", "Rutland", "Barre", "Montpelier"],
  VA: ["Virginia Beach", "Norfolk", "Chesapeake", "Richmond", "Newport News", "Alexandria", "Hampton", "Roanoke", "Portsmouth", "Suffolk", "Lynchburg"],
  WA: ["Seattle", "Spokane", "Tacoma", "Vancouver", "Bellevue", "Kent", "Everett", "Renton", "Spokane Valley", "Kirkland", "Bellingham", "Kennewick"],
  WV: ["Charleston", "Huntington", "Parkersburg", "Morgantown", "Wheeling"],
  WI: ["Milwaukee", "Madison", "Green Bay", "Kenosha", "Racine", "Appleton", "Waukesha", "Oshkosh", "Eau Claire", "Janesville"],
  WY: ["Cheyenne", "Casper", "Laramie", "Gillette", "Rock Springs"],
  DC: ["Washington DC"],
};

/** Resolve a user-typed state to its 2-letter code, or null if not a state. */
export function resolveStateCode(input: string): string | null {
  const upper = input.trim().toUpperCase();
  if (STATE_NAMES[upper]) return upper;
  // Try matching full state name (case-insensitive)
  const lower = input.trim().toLowerCase();
  const found = Object.entries(STATE_NAMES).find(
    ([, name]) => name.toLowerCase() === lower
  );
  return found ? found[0] : null;
}
