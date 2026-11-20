// Weather Buddy - Version 6
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
const recentEl = document.getElementById("recent");
const alternativesEl = document.getElementById("alternatives");

// The app's memory while it is open
let unit = "C";          // "C" or "F"
let lastMatches = [];    // places found for the last city search (for the "other places" buttons)
let lastResult = null;   // the last weather we fetched (so the switch can redraw it)

// ---------- Saving in the browser (F9, F10) ----------
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
function describeWeather(code) {
  if (code === 0) return { text: "Clear sky", emoji: "☀️" };
  if (code === 1) return { text: "Mostly clear", emoji: "🌤️" };
  if (code === 2) return { text: "Partly cloudy", emoji: "⛅" };
  if (code === 3) return { text: "Overcast", emoji: "☁️" };
  if (code === 45 || code === 48) return { text: "Foggy", emoji: "🌫️" };
  if (code >= 51 && code <= 57) return { text: "Drizzle", emoji: "🌦️" };
  if (code >= 61 && code <= 67) return { text: "Rain", emoji: "🌧️" };
  if (code >= 71 && code <= 77) return { text: "Snow", emoji: "❄️" };
  if (code >= 80 && code <= 82) return { text: "Rain showers", emoji: "🌧️" };
  if (code === 85 || code === 86) return { text: "Snow showers", emoji: "🌨️" };
  if (code >= 95) return { text: "Thunderstorm", emoji: "⛈️" };
  return { text: "Unknown weather", emoji: "🌍" };
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
  if (feelsLike < 0) advice = "Freezing! Wear a heavy coat, hat, gloves and a scarf. 🧣";
  else if (feelsLike < 10) advice = "Cold. Wear a warm coat and a sweater. 🧥";
  else if (feelsLike < 18) advice = "Cool. A light jacket or a sweater will do. 🧶";
  else if (feelsLike < 25) advice = "Mild. A T-shirt is fine, maybe bring a light layer. 👕";
  else advice = "Hot! Wear light clothes and drink water. 🩳";

  if (isSnowing(code)) advice += " Wear waterproof boots. 🥾";
  if (isRaining(code)) advice += " It's wet, so take an umbrella or a raincoat. ☔";
  else if (rainChance >= 40) advice += " Rain is possible today, so pack an umbrella. 🌂";
  if (windKmh >= 30) advice += " It's windy, so a windproof layer helps. 💨";
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
function showMessage(text) {
  messageEl.textContent = text;
  messageEl.hidden = text === "";
}

// ---------- Place names ----------
// "London, Ontario, Canada": name, then region, then country (skipping empty or repeated parts)
function formatPlace(place) {
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
  alternativesEl.innerHTML = "";
  if (others.length === 0) {
    alternativesEl.hidden = true;
    return;
  }
  const title = document.createElement("p");
  title.textContent = "Other places called " + typedName + ":";
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
  for (let i = 0; i < daily.time.length; i++) {
    // "T12:00" avoids the date shifting to another day because of time zones
    const date = new Date(daily.time[i] + "T12:00:00");
    const name = i === 0 ? "Today" : date.toLocaleDateString("en-US", { weekday: "short" });
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

// Draw everything from lastResult, using the chosen unit
function showResult() {
  const place = lastResult.place;
  const current = lastResult.current;
  const daily = lastResult.daily;
  const info = describeWeather(current.weather_code);
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
  lastResult = null;
  showMessage("Looking up the weather... ⏳");   // F11: loading message
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
      "?current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code" +
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
      showMessage(error.friendly ||
        "Oops, I can't reach the weather service. Check your internet and try again. 📡");
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
    // City name -> up to 10 matching places (latitude, longitude, region, country)
    const geoUrl =
      "https://geocoding-api.open-meteo.com/v1/search?count=10&name=" +
      encodeURIComponent(cityName);
    const geoResponse = await fetch(geoUrl);
    if (!geoResponse.ok) throw new Error("geocoding failed");
    const geoData = await geoResponse.json();
    if (isOutdated()) return null;

    if (!geoData.results || geoData.results.length === 0) {
      showMessage("Hmm, I can't find that city. Check the spelling? 🤔");
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
      reject({ friendly: "Sorry, this browser can't share your location. Try typing a city instead. 🏙️" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      function (position) { resolve(position); },
      function (error) {
        let text = "Sorry, I couldn't find your location. Try typing a city instead. 🏙️";
        if (error.code === 1) {
          text = "Location is blocked. Allow it in your browser (the 📍 icon near the address bar) or type a city instead. 🔒";
        } else if (error.code === 3) {
          text = "Finding your location took too long. Try again or type a city instead. ⏱️";
        }
        reject({ friendly: text });
      },
      { timeout: 10000 }
    );
  });
}

// F14: turn coordinates into a place name like "Brussels, Belgium".
// Open-Meteo can't do this, so we ask the free BigDataCloud service.
// If anything goes wrong we return "" and the app shows "Your location" instead.
async function findPlaceName(latitude, longitude) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(function () { controller.abort(); }, 5000);   // give up after 5 seconds
    const url =
      "https://api.bigdatacloud.net/data/reverse-geocode-client?localityLanguage=en" +
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
        name: "📍 " + (placeName || "Your location"),
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
    lastResult = null;
    showMessage("Please type a city name first. 🏙️");
    return;
  }
  search(city);
});

locationButton.addEventListener("click", useMyLocation);

unitCButton.addEventListener("click", function () { setUnit("C"); });
unitFButton.addEventListener("click", function () { setUnit("F"); });

// When the page opens: load the saved unit and recent cities
unit = loadSaved("weatherBuddyUnit", "C") === "F" ? "F" : "C";
updateUnitButtons();
showRecent();
