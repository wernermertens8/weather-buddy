// Weather Buddy - Version 8
// Steps: city name -> coordinates (geocoding) -> weather -> show it.
// All temperatures are stored in °C. We convert to °F only when showing them.

// Grab the page elements we need
const form = document.getElementById("search-form");
const input = document.getElementById("city-input");
const locationButton = document.getElementById("location-button");
const messageEl = document.getElementById("message");
const resultEl = document.getElementById("result");
const cityNameEl = document.getElementById("city-name");
const emojiEl = document.getElementById("emoji");
const tempEl = document.getElementById("temp");
const descriptionEl = document.getElementById("description");
const feelsEl = document.getElementById("feels");
const humidityEl = document.getElementById("humidity");
const windEl = document.getElementById("wind");
const rainEl = document.getElementById("rain");
const adviceEl = document.getElementById("advice");
const forecastSectionEl = document.getElementById("forecast-section");
const forecastEl = document.getElementById("forecast");
const unitCButton = document.getElementById("unit-c");
const unitFButton = document.getElementById("unit-f");
const langEnButton = document.getElementById("lang-en");
const langNlButton = document.getElementById("lang-nl");
const recentEl = document.getElementById("recent");
const alternativesEl = document.getElementById("alternatives");

// The app's memory while it is open
let unit = "C";            // "C" or "F"
let language = "en";       // "en" (UK button) or "nl" (NL button)
let lastMatches = [];      // places found for the last city search (for the "other places" buttons)
let lastAlternatives = null; // { typedName, others } currently offered as buttons (so they can be redrawn)
let lastResult = null;     // the last weather we fetched (so the switches can redraw it)
let currentMessageKey = ""; // which message is showing (so it can be redrawn in another language)

// ---------- F17: all the words, in English and Dutch ----------
const TEXT = {
  en: {
    pageTitle: "Weather Buddy",
    tagline: "What should I wear today?",
    placeholder: "Type a city, e.g. London",
    search: "Search",
    useLocation: "📍 Use my location",
    unitLabel: "Temperature unit",
    langLabel: "Language",
    feels: "Feels like",
    humidity: "Humidity",
    wind: "Wind",
    rain: "Chance of rain",
    forecastTitle: "7-day forecast",
    today: "Today",
    footer: "Weather Buddy · Version 8",
    otherPlaces: function (name) { return "Other places called " + name + ":"; },
    yourLocation: "Your location",
    // messages
    loading: "Looking up the weather... ⏳",
    emptyCity: "Please type a city name first. 🏙️",
    notFound: "Hmm, I can't find that city. Check the spelling? 🤔",
    noReach: "Oops, I can't reach the weather service. Check your internet and try again. 📡",
    geoUnsupported: "Sorry, this browser can't share your location. Try typing a city instead. 🏙️",
    geoBlocked: "Location is blocked. Allow it in your browser (the 📍 icon near the address bar) or type a city instead. 🔒",
    geoTimeout: "Finding your location took too long. Try again or type a city instead. ⏱️",
    geoFailed: "Sorry, I couldn't find your location. Try typing a city instead. 🏙️",
    // weather descriptions
    wClear: "Clear sky", wClearNight: "Clear night", wMostlyClear: "Mostly clear", wPartlyCloudy: "Partly cloudy", wOvercast: "Overcast",
    wFog: "Foggy", wDrizzle: "Drizzle", wRain: "Rain", wSnow: "Snow",
    wRainShowers: "Rain showers", wSnowShowers: "Snow showers", wThunder: "Thunderstorm", wUnknown: "Unknown weather",
    // outfit advice
    advFreezing: "Freezing! Wear a heavy coat, hat, gloves and a scarf. 🧣",
    advCold: "Cold. Wear a warm coat and a sweater. 🧥",
    advCool: "Cool. A light jacket or a sweater will do. 🧶",
    advMild: "Mild. A T-shirt is fine, maybe bring a light layer. 👕",
    advHot: "Hot! Wear light clothes and drink water. 🩳",
    advSnow: " Wear waterproof boots. 🥾",
    advWet: " It's wet, so take an umbrella or a raincoat. ☔",
    advMaybeRain: " Rain is possible today, so pack an umbrella. 🌂",
    advWindy: " It's windy, so a windproof layer helps. 💨"
  },
  nl: {
    pageTitle: "Weather Buddy",
    tagline: "Wat moet ik vandaag aantrekken?",
    placeholder: "Typ een stad, bv. Londen",
    search: "Zoeken",
    useLocation: "📍 Mijn locatie gebruiken",
    unitLabel: "Temperatuureenheid",
    langLabel: "Taal",
    feels: "Voelt als",
    humidity: "Luchtvochtigheid",
    wind: "Wind",
    rain: "Kans op regen",
    forecastTitle: "Weersverwachting 7 dagen",
    today: "Vandaag",
    footer: "Weather Buddy · Versie 8",
    otherPlaces: function (name) { return "Andere plaatsen met de naam " + name + ":"; },
    yourLocation: "Jouw locatie",
    loading: "Het weer wordt opgezocht... ⏳",
    emptyCity: "Typ eerst de naam van een stad. 🏙️",
    notFound: "Hmm, die stad kan ik niet vinden. Klopt de spelling? 🤔",
    noReach: "Oeps, ik kan de weerdienst niet bereiken. Controleer je internet en probeer het opnieuw. 📡",
    geoUnsupported: "Sorry, deze browser kan je locatie niet delen. Typ in plaats daarvan een stad. 🏙️",
    geoBlocked: "Locatie is geblokkeerd. Sta het toe in je browser (het 📍-icoon bij de adresbalk) of typ een stad. 🔒",
    geoTimeout: "Je locatie vinden duurde te lang. Probeer het opnieuw of typ een stad. ⏱️",
    geoFailed: "Sorry, ik kon je locatie niet vinden. Typ in plaats daarvan een stad. 🏙️",
    wClear: "Heldere lucht", wClearNight: "Heldere nacht", wMostlyClear: "Grotendeels helder", wPartlyCloudy: "Half bewolkt", wOvercast: "Bewolkt",
    wFog: "Mistig", wDrizzle: "Motregen", wRain: "Regen", wSnow: "Sneeuw",
    wRainShowers: "Regenbuien", wSnowShowers: "Sneeuwbuien", wThunder: "Onweer", wUnknown: "Onbekend weer",
    advFreezing: "Vrieskou! Draag een dikke jas, muts, handschoenen en een sjaal. 🧣",
    advCold: "Koud. Draag een warme jas en een trui. 🧥",
    advCool: "Fris. Een licht jasje of een trui is genoeg. 🧶",
    advMild: "Zacht. Een T-shirt is prima, neem eventueel een extra laagje mee. 👕",
    advHot: "Heet! Draag lichte kleding en drink water. 🩳",
    advSnow: " Draag waterdichte laarzen. 🥾",
    advWet: " Het is nat, dus neem een paraplu of regenjas mee. ☔",
    advMaybeRain: " Er is vandaag kans op regen, dus neem een paraplu mee. 🌂",
    advWindy: " Het waait, dus een winddichte laag helpt. 💨"
  }
};

// Look up a word in the chosen language. Extra arguments go to text that is a function.
function t(key, arg) {
  const value = TEXT[language][key];
  return typeof value === "function" ? value(arg) : value;
}

// ---------- Saving in the browser (F9, F10, F18) ----------
// localStorage can fail (e.g. private mode), so we wrap it to keep the app working.
function loadSaved(key, fallback) {
  try {
    const text = localStorage.getItem(key);
    return text === null ? fallback : JSON.parse(text);
  } catch (error) {
    return fallback;
  }
}

function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    // Not saving is fine. The app still works.
  }
}

// ---------- Weather words and emojis ----------
// Open-Meteo gives weather as a number code. This turns each code into words + an emoji.
// F20: isNight = true swaps sunny icons for night ones (a moon instead of a sun).
function describeWeather(code, isNight) {
  if (code === 0) {
    return isNight ? { text: t("wClearNight"), emoji: "🌙" } : { text: t("wClear"), emoji: "☀️" };
  }
  if (code === 1) return { text: t("wMostlyClear"), emoji: isNight ? "🌙" : "🌤️" };
  if (code === 2) return { text: t("wPartlyCloudy"), emoji: isNight ? "☁️" : "⛅" };
  if (code === 3) return { text: t("wOvercast"), emoji: "☁️" };
  if (code === 45 || code === 48) return { text: t("wFog"), emoji: "🌫️" };
  if (code >= 51 && code <= 57) return { text: t("wDrizzle"), emoji: isNight ? "🌧️" : "🌦️" };
  if (code >= 61 && code <= 67) return { text: t("wRain"), emoji: "🌧️" };
  if (code >= 71 && code <= 77) return { text: t("wSnow"), emoji: "❄️" };
  if (code >= 80 && code <= 82) return { text: t("wRainShowers"), emoji: "🌧️" };
  if (code === 85 || code === 86) return { text: t("wSnowShowers"), emoji: "🌨️" };
  if (code >= 95) return { text: t("wThunder"), emoji: "⛈️" };
  return { text: t("wUnknown"), emoji: "🌍" };
}

// Is it wet outside? (drizzle, rain, showers, thunderstorm)
function isRaining(code) {
  return (code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95;
}

// Is it snowing?
function isSnowing(code) {
  return (code >= 71 && code <= 77) || code === 85 || code === 86;
}

// Outfit advice. Uses "feels like" (°C), wind and rain chance.
function outfitAdvice(feelsLike, code, windKmh, rainChance) {
  let advice;
  if (feelsLike < 0) advice = t("advFreezing");
  else if (feelsLike < 10) advice = t("advCold");
  else if (feelsLike < 18) advice = t("advCool");
  else if (feelsLike < 25) advice = t("advMild");
  else advice = t("advHot");

  if (isSnowing(code)) advice += t("advSnow");
  if (isRaining(code)) advice += t("advWet");
  else if (rainChance >= 40) advice += t("advMaybeRain");
  if (windKmh >= 30) advice += t("advWindy");
  return advice;
}

// ---------- F8: temperature units ----------
// Turn a °C number into text in the chosen unit, e.g. 20 -> "68°F"
function formatTemp(celsius) {
  // Round the °C first, so the °F number always matches the °C number you saw
  // (e.g. 4.4°C shows as 4°C, so it must show 39°F, not 40°F).
  const roundedC = Math.round(celsius);
  const value = unit === "F" ? Math.round(roundedC * 9 / 5 + 32) : roundedC;
  return value + "°" + unit;
}

function updateUnitButtons() {
  unitCButton.classList.toggle("active", unit === "C");
  unitFButton.classList.toggle("active", unit === "F");
}

function setUnit(newUnit) {
  unit = newUnit;
  save("weatherBuddyUnit", unit);   // F10: remember the choice
  updateUnitButtons();
  if (lastResult) showResult();     // redraw every temperature
}

// ---------- Messages ----------
// We keep the message's KEY (not its words), so it can be shown again in another language.
function showMessage(key) {
  currentMessageKey = key;
  messageEl.textContent = key === "" ? "" : t(key);
  messageEl.hidden = key === "";
}

// ---------- F17: switching the language ----------
// Put the right words on everything that is written directly in index.html
function applyStaticText() {
  document.documentElement.lang = language;
  document.title = t("pageTitle");
  document.querySelectorAll("[data-i18n]").forEach(function (el) {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach(function (el) {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  document.querySelectorAll("[data-i18n-aria]").forEach(function (el) {
    el.setAttribute("aria-label", t(el.dataset.i18nAria));
  });
  // (the "if" guards protect against a browser mixing an old cached page with this new script)
  if (langEnButton) langEnButton.classList.toggle("active", language === "en");
  if (langNlButton) langNlButton.classList.toggle("active", language === "nl");
}

function setLanguage(newLanguage) {
  language = newLanguage;
  save("weatherBuddyLanguage", language);   // F18: remember the choice
  applyStaticText();
  showMessage(currentMessageKey);           // redraw the message, if any
  if (lastResult) showResult();             // redraw weather words, advice and weekdays
  if (lastResult && lastAlternatives) {
    showAlternatives(lastAlternatives.typedName, lastAlternatives.others);
  }
}

// ---------- Place names ----------
// "London, Ontario, Canada": name, then region, then country (skipping empty or repeated parts)
function formatPlace(place) {
  if (place.isMyLocation && place.name === "") return "📍 " + t("yourLocation");
  const parts = [place.name];
  if (place.admin1 && place.admin1 !== place.name) parts.push(place.admin1);
  if (place.country) parts.push(place.country);
  return parts.join(", ");
}

// ---------- F9 + F16: recent cities ----------
// Each recent city is saved as { label, place } so we remember the EXACT place
// (London in Canada, not London in the UK). Older saves were plain text: we still handle those.
function getRecent() {
  return loadSaved("weatherBuddyRecent", []).map(function (item) {
    return typeof item === "string" ? { label: item, place: null } : item;
  });
}

function addRecent(place) {
  const label = formatPlace(place);
  // Remove the city if it is already in the list, then put it first. Keep 5.
  let list = getRecent().filter(function (c) {
    const sameLabel = c.label.toLowerCase() === label.toLowerCase();
    // an old plain-text save like "Paris" is replaced by the fuller "Paris, Île-de-France..., France"
    const oldSave = c.place === null && c.label.toLowerCase() === place.name.toLowerCase();
    return !sameLabel && !oldSave;
  });
  list.unshift({
    label: label,
    place: {
      name: place.name, admin1: place.admin1, country: place.country,
      latitude: place.latitude, longitude: place.longitude
    }
  });
  list = list.slice(0, 5);
  save("weatherBuddyRecent", list);
  showRecent();
}

function showRecent() {
  const list = getRecent();
  recentEl.innerHTML = "";
  list.forEach(function (item) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = item.label;
    button.addEventListener("click", function () {
      if (item.place) {
        showPlace(item.place, []);   // we know exactly which place it is
      } else {
        search(item.label);          // old save: only the name is known
      }
    });
    recentEl.appendChild(button);
  });
  recentEl.hidden = list.length === 0;
}

// ---------- F15: other places with the same name ----------
function showAlternatives(typedName, others) {
  lastAlternatives = others.length === 0 ? null : { typedName: typedName, others: others };
  alternativesEl.innerHTML = "";
  if (others.length === 0) {
    alternativesEl.hidden = true;
    return;
  }
  const title = document.createElement("p");
  title.textContent = t("otherPlaces", typedName);
  alternativesEl.appendChild(title);

  others.forEach(function (other) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = formatPlace(other);
    button.addEventListener("click", function () {
      // Show the one I picked, and offer the rest (including the one I'm leaving)
      const rest = lastMatches.filter(function (p) { return p !== other; });
      showPlace(other, rest);
    });
    alternativesEl.appendChild(button);
  });
  alternativesEl.hidden = false;
}

// ---------- Showing the weather ----------
// Draw the forecast rows
function showForecast(daily) {
  forecastEl.innerHTML = "";
  const locale = language === "nl" ? "nl-NL" : "en-US";
  for (let i = 0; i < daily.time.length; i++) {
    // "T12:00" avoids the date shifting to another day because of time zones
    const date = new Date(daily.time[i] + "T12:00:00");
    let name = t("today");
    if (i > 0) {
      name = date.toLocaleDateString(locale, { weekday: "short" });
      name = name.charAt(0).toUpperCase() + name.slice(1);   // "ma" -> "Ma"
    }
    const info = describeWeather(daily.weather_code[i]);

    const row = document.createElement("div");
    row.className = "day";
    row.innerHTML =
      '<span class="name">' + name + "</span>" +
      '<span class="day-emoji" title="' + info.text + '">' + info.emoji + "</span>" +
      '<span class="range">' +
      formatTemp(daily.temperature_2m_min[i]) + " / " +
      formatTemp(daily.temperature_2m_max[i]) + "</span>";
    forecastEl.appendChild(row);
  }
}

// Draw everything from lastResult, using the chosen unit and language
function showResult() {
  const place = lastResult.place;
  const current = lastResult.current;
  const daily = lastResult.daily;
  const info = describeWeather(current.weather_code, current.is_day === 0);   // F20: 0 = it is dark there now
  const rainChance = daily.precipitation_probability_max[0]; // today's chance of rain

  cityNameEl.textContent = formatPlace(place);
  emojiEl.textContent = info.emoji;
  tempEl.textContent = formatTemp(current.temperature_2m);
  descriptionEl.textContent = info.text;

  feelsEl.textContent = formatTemp(current.apparent_temperature);
  humidityEl.textContent = current.relative_humidity_2m + "%";
  windEl.textContent = Math.round(current.wind_speed_10m) + " km/h";
  rainEl.textContent = (rainChance === null ? "?" : rainChance + "%");

  adviceEl.textContent = outfitAdvice(
    current.apparent_temperature,
    current.weather_code,
    current.wind_speed_10m,
    rainChance || 0
  );

  showForecast(daily);
  resultEl.hidden = false;
  forecastSectionEl.hidden = false;
}

// ---------- Searching ----------
let latestSearch = 0;   // numbers each search so we can ignore slow, outdated ones

// Shared by city search and "Use my location".
// findPlace is a function that works out WHERE to show the weather. It returns
// { place, remember, others } or null if it already showed a message (e.g. city not found).
// "others" are other places with the same name (F15).
async function runLookup(findPlace) {
  const myNumber = ++latestSearch;
  const isOutdated = function () { return myNumber !== latestSearch; };
  resultEl.hidden = true;
  forecastSectionEl.hidden = true;
  alternativesEl.hidden = true;
  lastAlternatives = null;
  lastResult = null;
  showMessage("loading");   // F11: loading message
  // Note: we do NOT disable the buttons while waiting. If the browser's location prompt
  // stays open, you can still type a city. Slow, outdated searches are ignored instead.

  try {
    const found = await findPlace(isOutdated);
    if (found === null || isOutdated()) return;   // nothing to show, or a newer search took over
    const place = found.place;

    // Safety check: coordinates must be real numbers in range (saved data could have been edited)
    const latitude = Number(place.latitude);
    const longitude = Number(place.longitude);
    if (!isFinite(latitude) || !isFinite(longitude) ||
        Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
      throw new Error("bad coordinates");
    }

    // Coordinates -> current weather + 7-day forecast (always in °C)
    const weatherUrl =
      "https://api.open-meteo.com/v1/forecast" +
      "?current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,is_day" +
      "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max" +
      "&forecast_days=7&timezone=auto" +
      "&latitude=" + latitude +
      "&longitude=" + longitude;
    const weatherResponse = await fetch(weatherUrl);
    if (!weatherResponse.ok) throw new Error("weather failed");
    const weatherData = await weatherResponse.json();
    if (isOutdated()) return;   // a newer search started, so drop this one

    lastResult = { place: place, current: weatherData.current, daily: weatherData.daily };
    showMessage("");
    showResult();
    showAlternatives(found.typedName || "", found.others || []);
    if (found.remember) addRecent(place);   // F9: remember this exact place
  } catch (error) {
    // Show a friendly message (ignore if a newer search took over)
    if (!isOutdated()) {
      showMessage(error.friendlyKey || "noReach");
    }
  }
}

// Show the weather for a place we already know (used by the "other places" and recent buttons)
function showPlace(place, others) {
  input.value = place.name;
  lastMatches = [place].concat(others);
  runLookup(async function () {
    return { place: place, remember: true, others: others, typedName: place.name };
  });
}

// Search by city name
function search(cityName) {
  input.value = cityName;   // keep the box in sync with what is being shown
  runLookup(async function (isOutdated) {
    // City name -> up to 10 matching places (latitude, longitude, region, country).
    // F19: "language" makes the place names come back in English or Dutch.
    const geoUrl =
      "https://geocoding-api.open-meteo.com/v1/search?count=10&language=" + language +
      "&name=" + encodeURIComponent(cityName);
    const geoResponse = await fetch(geoUrl);
    if (!geoResponse.ok) throw new Error("geocoding failed");
    const geoData = await geoResponse.json();
    if (isOutdated()) return null;

    if (!geoData.results || geoData.results.length === 0) {
      showMessage("notFound");
      return null;
    }

    // F15: keep places whose name is exactly what I typed (ignoring capital letters),
    // so "London" doesn't also list "London Bridge". If none match exactly, keep them all.
    const typed = cityName.trim().toLowerCase();
    let matches = geoData.results.filter(function (p) {
      return p.name.toLowerCase() === typed;
    });
    if (matches.length === 0) matches = geoData.results;

    // Remove duplicates (same name, region and country) and keep at most 5
    const seen = {};
    matches = matches.filter(function (p) {
      const key = formatPlace(p).toLowerCase();
      if (seen[key]) return false;
      seen[key] = true;
      return true;
    }).slice(0, 5);

    lastMatches = matches;
    return {
      place: matches[0],
      remember: true,
      others: matches.slice(1),
      typedName: matches[0].name
    };
  });
}

// F12 + F13: ask the browser where I am (it asks me for permission first)
function getMyPosition() {
  return new Promise(function (resolve, reject) {
    if (!navigator.geolocation) {
      reject({ friendlyKey: "geoUnsupported" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      function (position) { resolve(position); },
      function (error) {
        let key = "geoFailed";
        if (error.code === 1) key = "geoBlocked";
        else if (error.code === 3) key = "geoTimeout";
        reject({ friendlyKey: key });
      },
      { timeout: 10000 }
    );
  });
}

// F14: turn coordinates into a place name like "Brussels, Belgium" (or "Brussel, België" in Dutch).
// Open-Meteo can't do this, so we ask the free BigDataCloud service.
// If anything goes wrong we return "" and the app shows "Your location" instead.
async function findPlaceName(latitude, longitude) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(function () { controller.abort(); }, 5000);   // give up after 5 seconds
    const url =
      "https://api.bigdatacloud.net/data/reverse-geocode-client?localityLanguage=" + language +
      "&latitude=" + latitude + "&longitude=" + longitude;
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!response.ok) return "";
    const data = await response.json();
    const town = data.city || data.locality || data.principalSubdivision || "";
    if (town === "") return "";
    return data.countryName ? town + ", " + data.countryName : town;
  } catch (error) {
    return "";
  }
}

function useMyLocation() {
  input.value = "";
  runLookup(async function () {
    const position = await getMyPosition();
    // Round to 2 decimals (about 1 km): plenty for weather, and less exact data leaves this computer
    const latitude = Math.round(position.coords.latitude * 100) / 100;
    const longitude = Math.round(position.coords.longitude * 100) / 100;
    const placeName = await findPlaceName(latitude, longitude);
    return {
      place: {
        // an empty name means "show 'Your location' in whatever language is chosen"
        name: placeName === "" ? "" : "📍 " + placeName,
        isMyLocation: true,
        country: "",
        latitude: latitude,
        longitude: longitude
      },
      remember: false   // my location is never saved
    };
  });
}

// ---------- Wiring things up ----------
// Run a search when the form is submitted (button click or Enter)
form.addEventListener("submit", function (event) {
  event.preventDefault(); // stop the page from reloading
  const city = input.value.trim();

  if (city === "") {
    latestSearch++;   // cancel any search still loading, so it can't replace this message
    resultEl.hidden = true;
    forecastSectionEl.hidden = true;
    alternativesEl.hidden = true;
    lastAlternatives = null;
    lastResult = null;
    showMessage("emptyCity");
    return;
  }
  search(city);
});

locationButton.addEventListener("click", useMyLocation);

unitCButton.addEventListener("click", function () { setUnit("C"); });
unitFButton.addEventListener("click", function () { setUnit("F"); });

if (langEnButton) langEnButton.addEventListener("click", function () { setLanguage("en"); });
if (langNlButton) langNlButton.addEventListener("click", function () { setLanguage("nl"); });

// When the page opens: load the saved language, unit and recent cities
language = loadSaved("weatherBuddyLanguage", "en") === "nl" ? "nl" : "en";
unit = loadSaved("weatherBuddyUnit", "C") === "F" ? "F" : "C";
applyStaticText();
updateUnitButtons();
showRecent();
