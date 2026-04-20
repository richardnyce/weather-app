// ===============================
// CONFIG (Kent fallback)
// ===============================

const LAT = 41.1537;
const LON = -81.3579;

// Track unit
let isFahrenheit = true;

// Store last API data
let weatherData = null;


// ===============================
// FETCH DATA
// ===============================

async function getWeather(lat = LAT, lon = LON) {
  try {

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,uv_index&hourly=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,weather_code&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto`;

    const res = await fetch(url);

    if (!res.ok) throw new Error("API failed");

    const data = await res.json();

    weatherData = data;

    renderAll();

  } catch (err) {
    console.error(err);
  }
}


// ===============================
// GEOLOCATION
// ===============================

function initWeather() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        getWeather(lat, lon);
        updateLocationName(lat, lon); // ADD THIS
      },
      () => {
        getWeather(LAT, LON);
        updateLocationName(LAT, LON); // fallback location
      }
    );
  } else {
    getWeather(LAT, LON);
    updateLocationName(LAT, LON);
  }
}

async function updateLocationName(lat, lon) {
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
    );

    const data = await res.json();

    const city = data.city;
    const state = data.principalSubdivision;

    document.getElementById("location").innerHTML =
      `${city}, ${state}`;

  } catch (err) {
    console.error("Location fetch failed: ", err);

    // Fallback to Kent, Ohio
    document.getElementById("location").innerHTML =
      `Kent, Ohio`;
  }
}

// ===============================
// RENDER ALL
// ===============================

function renderAll() {
  if (!weatherData) return;

  updateCurrent(weatherData.current);
  updateHourly(weatherData.hourly);
  updateDaily(weatherData.daily);
}


// ===============================
// TEMP CONVERSION
// ===============================

function convertTemp(tempF) {
  if (isFahrenheit) return Math.round(tempF);
  return Math.round((tempF - 32) * (5 / 9));
}


// ===============================
// CURRENT
// ===============================

function updateCurrent(current) {
  document.getElementById("current-temp").textContent =
    convertTemp(current.temperature_2m);

  document.getElementById("temp-unit").textContent =
    isFahrenheit ? "°F" : "°C";

  document.getElementById("feelslike").textContent =
    `Feels Like ${convertTemp(current.apparent_temperature)}°${isFahrenheit ? "F" : "C"}`;

  document.getElementById("conditions").textContent =
    getWeatherText(current.weather_code);

  document.getElementById("wind-mph").textContent =
    current.wind_speed_10m + " mph";

  document.getElementById("wind-direction").textContent =
    getWindDirection(current.wind_direction_10m);

  document.getElementById("uv-level").textContent =
    current.uv_index;

  document.getElementById("uv-desc").textContent =
    getUVText(current.uv_index);

  setBackground(current.weather_code);
}


// ===============================
// HOURLY
// ===============================

function updateHourly(hourly) {
  const container = document.getElementById("hourly-container");
  container.innerHTML = "";

  const now = new Date();

  // Find correct starting index
  let startIndex = hourly.time.findIndex(t => {
    const hourTime = new Date(t.replace("T", " ") + ":00");
    return hourTime >= now;
  });

  if (startIndex === -1) startIndex = 0;

  for (let i = 0; i < 6; i++) {
    const index = startIndex + i;
    if (!hourly.time[index]) break;

    // FIX: force local time parsing
    const time = new Date(hourly.time[index].replace("T", " ") + ":00");

    const hourLabel = i === 0
      ? "NOW"
      : time.toLocaleTimeString([], {
          hour: "numeric",
          hour12: true
        });

    container.innerHTML += `
      <div class="hour-block">
        <p class="hour">${hourLabel}</p>
        <span class="material-symbols-outlined">
          ${getWeatherIcon(hourly.weather_code[index])}
        </span>
        <p class="hourly-temp">
          ${convertTemp(hourly.temperature_2m[index])}°
        </p>
      </div>
    `;
  }
}


// ===============================
// DAILY
// ===============================

function updateDaily(daily) {
  const container = document.getElementById("daily-container");
  container.innerHTML = "";

  for (let i = 0; i < 7; i++) {

    // FIX: force local parsing
    const date = new Date(daily.time[i] + "T00:00:00");

    const dayLabel = i === 0
      ? "Today"
      : date.toLocaleDateString([], {
          weekday: "long"
        });

    container.innerHTML += `
      <div class="day-block">
        <p class="day">${dayLabel}</p>
        <span class="material-symbols-outlined">
          ${getWeatherIcon(daily.weather_code[i])}
        </span>
        <p class="day-temp">
          L: ${convertTemp(daily.temperature_2m_min[i])}°
          H: ${convertTemp(daily.temperature_2m_max[i])}°
        </p>
      </div>
    `;
  }
}


// ===============================
// CLICK TO TOGGLE TEMP
// ===============================

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("temp-toggle").addEventListener("click", () => {
    isFahrenheit = !isFahrenheit;
    renderAll();
  });
});


// ===============================
// HELPERS
// ===============================

function getWeatherText(code) {
  if (code === 0) return "Clear";
  if (code <= 3) return "Cloudy";
  if (code <= 67) return "Rain";
  if (code <= 77) return "Snow";
  return "Storm";
}

function getWeatherIcon(code) {
  if (code === 0) return "sunny";
  if (code <= 3) return "cloud";
  if (code <= 67) return "rainy";
  if (code <= 77) return "weather_snowy";
  return "thunderstorm";
}

function setBackground(code) {
  let image = "sunny.jpg"

  if (code === 0) image = "sunny.jpg";
  else if (code <= 3) image = "cloudy.jpg"
  else if (code <= 67) image = "rain.jpg"
  else if (code <= 77) image = "snowy.jpg"
  else image = "rain.jpg";

  document.querySelector(".hero").style.backgroundImage = 
    `linear-gradient(rgba(0, 0, 0, .45), rgba(0, 0, 0, .45)), url("assets/${image}")`;
}

function getUVText(uv) {
  if (uv <= 2) return "Low";
  if (uv <= 5) return "Moderate";
  if (uv <= 7) return "High";
  return "Extreme";
}

function getWindDirection(deg) {
  const dirs = ["N","NE","E","SE","S","SW","W","NW"];
  return dirs[Math.round(deg / 45) % 8];
}


// ===============================
// START
// ===============================

initWeather();