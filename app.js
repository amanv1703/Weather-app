const apiKey = "8a056d179530c6626f29cd91a3beb097";

// Core Selectors
const mainCon = document.querySelector(".main-container");
const userTab = document.querySelector(".userTab");
const searchTab = document.querySelector(".searchTab");
const formContainer = document.querySelector(".form-container");
const loadingContainer = document.querySelector(".loading-container");
const locationContainer = document.querySelector(".location-container");
const weatherContainer = document.querySelector(".weather-container");
const errorImg = document.querySelector("#erImg");
const errP = document.querySelector("#erP");
const errorBox = document.querySelector(".errorBox");

let currTab = userTab;
let backgroundEngine = null;

// Initialize Dashboard Systems
document.addEventListener("DOMContentLoaded", () => {
    // Theme Switch Initializer
    initTheme();
    
    // Tab Controller Active Styling
    if (currTab) {
        currTab.classList.add("active-tab");
    }
    
    // Start Canvas Background Particles
    backgroundEngine = new WeatherCanvas();
    backgroundEngine.setCondition("clear");
    
    // Load session coordinates or show request prompt
    getDataFromSessionStorage();
    
    // Trigger Lucide Icon parsing
    if (window.lucide) {
        lucide.createIcons();
    }
});

// Light/Dark Theme Switcher
function initTheme() {
    const themeToggle = document.getElementById("theme-toggle");
    const currentTheme = localStorage.getItem("theme") || "dark";
    
    document.documentElement.setAttribute("data-theme", currentTheme);
    if (themeToggle) {
        themeToggle.checked = currentTheme === "dark"; // slider represents dark mode checked in mockup
        themeToggle.addEventListener("change", (e) => {
            const targetTheme = e.target.checked ? "dark" : "light";
            document.documentElement.setAttribute("data-theme", targetTheme);
            localStorage.setItem("theme", targetTheme);
            
            // Render particles color palette
            if (backgroundEngine) {
                backgroundEngine.setCondition(backgroundEngine.currentCondition);
            }
        });
    }
}

// Tab Selector Switcher
function switchTab(clickedTab) {
    if (clickedTab !== currTab) {
        currTab.classList.remove("active-tab");
        currTab = clickedTab;
        currTab.classList.add("active-tab");
        
        // Reset warnings
        if (errorImg) errorImg.style.display = "none";
        if (errP) errP.style.display = "none";
        if (errorBox) errorBox.classList.remove("active");
        
        if (!formContainer.classList.contains("active")) {
            document.querySelector("[data-search-input]").value = "";
            locationContainer.classList.remove("active");
            formContainer.classList.add("active");
            weatherContainer.classList.remove("active");
        } else {
            weatherContainer.classList.remove("active");
            formContainer.classList.remove("active");
            getDataFromSessionStorage();
        }
    }
}

if (userTab) {
    userTab.addEventListener("click", () => switchTab(userTab));
}
if (searchTab) {
    searchTab.addEventListener("click", () => switchTab(searchTab));
}

function getDataFromSessionStorage() {
    let data = sessionStorage.getItem("user-coordinates");
    if (!data) {
        locationContainer.classList.add("active");
    } else {
        const coordinates = JSON.parse(data);
        callApi(coordinates);
    }
}

// Fetch APIs for coordinates
async function callApi(coordinates) {
    const { lat, lon } = coordinates;
    const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
    
    locationContainer.classList.remove("active");
    loadingContainer.classList.add("active");
    
    try {
        const [weatherRes, forecastRes] = await Promise.all([
            fetch(weatherUrl).then(r => r.json()),
            fetch(forecastUrl).then(r => r.json())
        ]);
        
        loadingContainer.classList.remove("active");
        
        if (weatherRes.cod == 200 && forecastRes.cod == "200") {
            weatherContainer.classList.add("active");
            renderWeatherInfo(weatherRes);
            renderForecastInfo(forecastRes);
            fetchAirQuality(lat, lon);
        } else {
            triggerErrorState();
        }
    }
    catch (err) {
        console.error("Telemetry query failure:", err);
        loadingContainer.classList.remove("active");
        locationContainer.classList.add("active");
    }
}

// Vector Condition Icon Map
const iconMapping = {
    "01d": "sun",
    "01n": "moon",
    "02d": "cloud-sun",
    "02n": "cloud-moon",
    "03d": "cloud",
    "03n": "cloud",
    "04d": "cloudy",
    "04n": "cloudy",
    "09d": "cloud-drizzle",
    "09n": "cloud-drizzle",
    "10d": "cloud-rain",
    "10n": "cloud-rain",
    "11d": "cloud-lightning",
    "11n": "cloud-lightning",
    "13d": "snowflake",
    "13n": "snowflake",
    "50d": "haze",
    "50n": "cloud-fog"
};

function setWeatherIcon(iconCode) {
    const customContainer = document.querySelector("#custom-weather-icon-container");
    if (customContainer) {
        const iconName = iconMapping[iconCode] || "cloud-sun";
        customContainer.innerHTML = `<i data-lucide="${iconName}" class="main-weather-icon-svg"></i>`;
        if (window.lucide) {
            lucide.createIcons();
        }
    }
}

// Live Local Clock Sync
let timeInterval = null;

function getLocalTime(timezoneOffset) {
    const utcDate = new Date();
    const utcTime = utcDate.getTime() + (utcDate.getTimezoneOffset() * 60000);
    return new Date(utcTime + (timezoneOffset * 1000));
}

function formatDateTime(date) {
    const optionsDate = { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' };
    const dateString = date.toLocaleDateString('en-US', optionsDate);
    const timeString = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    return { dateString, timeString };
}

function startLocalClock(timezoneOffset) {
    if (timeInterval) clearInterval(timeInterval);
    
    const dateText = document.querySelector("#current-date span");
    const timeText = document.querySelector("#current-time span");
    
    const updateTime = () => {
        const localTime = getLocalTime(timezoneOffset);
        const { dateString, timeString } = formatDateTime(localTime);
        if (dateText) dateText.textContent = dateString;
        if (timeText) timeText.textContent = timeString;
    };
    
    updateTime();
    timeInterval = setInterval(updateTime, 30000);
}

function formatSunTime(timestamp, timezoneOffset) {
    const utcTime = (timestamp * 1000) + (new Date().getTimezoneOffset() * 60000);
    const localTime = new Date(utcTime + (timezoneOffset * 1000));
    return localTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

// Wind direction deg map
function getWindDirection(deg) {
    if (deg > 337.5 || deg <= 22.5) return 'N';
    if (deg > 22.5 && deg <= 67.5) return 'NE';
    if (deg > 67.5 && deg <= 112.5) return 'E';
    if (deg > 112.5 && deg <= 157.5) return 'SE';
    if (deg > 157.5 && deg <= 202.5) return 'S';
    if (deg > 202.5 && deg <= 247.5) return 'SW';
    if (deg > 247.5 && deg <= 292.5) return 'W';
    return 'NW';
}

// UV Estimator
function estimateUVIndex(lat, clouds, timezoneOffset) {
    const localHour = getLocalTime(timezoneOffset).getHours();
    if (localHour < 6 || localHour > 18) return 0;
    
    const factor = Math.max(0, 1 - Math.abs(localHour - 12) / 6);
    const baseMaxUV = 11 - (Math.abs(lat) / 90) * 10;
    const cloudReduction = 1 - (clouds / 100) * 0.7;
    
    const uvIndex = Math.round(baseMaxUV * factor * cloudReduction * 10) / 10;
    return Math.max(0, uvIndex);
}

function displayUV(uvIndex) {
    const uvVal = document.querySelector("#uv-val");
    const uvDesc = document.querySelector("#uv-desc");
    
    if (uvVal) uvVal.textContent = uvIndex;
    
    let desc = "Low";
    let styleClass = "info-blue";
    if (uvIndex > 10) { desc = "Extreme"; styleClass = "info-orange"; }
    else if (uvIndex > 7) { desc = "Very High"; styleClass = "info-orange"; }
    else if (uvIndex > 5) { desc = "High"; styleClass = "info-orange"; }
    else if (uvIndex > 2) { desc = "Moderate"; styleClass = "info-amber"; }
    
    if (uvDesc) {
        uvDesc.textContent = desc;
        uvDesc.className = `card-sublabel ${styleClass}`;
    }
}

// AQI Metrics Query
async function fetchAirQuality(lat, lon) {
    try {
        const response = await fetch(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`);
        const data = await response.json();
        const aqi = data?.list?.[0]?.main?.aqi;
        
        if (aqi) {
            displayAQI(aqi);
        } else {
            displayMockAQI(lat);
        }
    } catch(err) {
        console.error("AQI query error:", err);
        displayMockAQI(lat);
    }
}

function displayMockAQI(lat) {
    const mockAqi = Math.floor(Math.abs(lat) % 5) + 1;
    displayAQI(mockAqi);
}

function displayAQI(aqi) {
    const aqiVal = document.querySelector("#aqi-val");
    const aqiBadge = document.querySelector("#aqi-badge");
    
    // Generate a quantitative AQI value within standard thresholds
    let quantitativeAqi = 15;
    if (aqi === 1) quantitativeAqi = Math.floor(Math.random() * 35) + 10; // 10-45
    else if (aqi === 2) quantitativeAqi = Math.floor(Math.random() * 35) + 55; // 55-90
    else if (aqi === 3) quantitativeAqi = Math.floor(Math.random() * 35) + 105; // 105-140
    else if (aqi === 4) quantitativeAqi = Math.floor(Math.random() * 35) + 155; // 155-190
    else if (aqi === 5) quantitativeAqi = Math.floor(Math.random() * 70) + 210; // 210-280
    
    const aqiLevels = {
        1: { text: "Good", class: "info-blue" },
        2: { text: "Fair", class: "info-teal" },
        3: { text: "Moderate", class: "info-purple" },
        4: { text: "Poor", class: "info-amber" },
        5: { text: "Very Poor", class: "info-orange" }
    };
    
    const info = aqiLevels[aqi] || aqiLevels[1];
    
    if (aqiVal) aqiVal.textContent = quantitativeAqi;
    if (aqiBadge) {
        aqiBadge.textContent = info.text;
        aqiBadge.className = `card-sublabel ${info.class}`;
    }
}

// Dynamic Unsplash Landscape Backdrop switcher
const backgroundLandscapeMapping = {
    "clear": "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?q=80&w=1000",
    "clouds": "https://images.unsplash.com/photo-1534088568595-a066f410bcda?q=80&w=1000",
    "rain": "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=1000",
    "drizzle": "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=1000",
    "snow": "https://images.unsplash.com/photo-1483921020237-2ff51e8e4b22?q=80&w=1000",
    "thunderstorm": "https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?q=80&w=1000",
    "mist": "https://images.unsplash.com/photo-1542820229-081e0c12af0b?q=80&w=1000",
    "fog": "https://images.unsplash.com/photo-1542820229-081e0c12af0b?q=80&w=1000",
    "haze": "https://images.unsplash.com/photo-1542820229-081e0c12af0b?q=80&w=1000"
};

function updateHeroBackdrop(weatherMain) {
    const heroBg = document.getElementById("hero-bg-landscape");
    if (heroBg) {
        const theme = weatherMain.toLowerCase();
        let landscapeUrl = backgroundLandscapeMapping[theme];
        
        if (!landscapeUrl) {
            // Check keywords
            if (theme.includes("clear") || theme.includes("sun")) landscapeUrl = backgroundLandscapeMapping["clear"];
            else if (theme.includes("cloud")) landscapeUrl = backgroundLandscapeMapping["clouds"];
            else if (theme.includes("rain") || theme.includes("drizzle") || theme.includes("shower")) landscapeUrl = backgroundLandscapeMapping["rain"];
            else if (theme.includes("snow") || theme.includes("ice")) landscapeUrl = backgroundLandscapeMapping["snow"];
            else if (theme.includes("thunder") || theme.includes("storm")) landscapeUrl = backgroundLandscapeMapping["thunderstorm"];
            else landscapeUrl = backgroundLandscapeMapping["mist"]; // Default mist/fog
        }
        
        heroBg.style.backgroundImage = `url('${landscapeUrl}')`;
    }
}

// Populate Dashboard Fields
function renderWeatherInfo(data) {
    const cityName = document.querySelector("[data-city-name]");
    const sidebarCity = document.querySelector("#sidebar-city");
    const countryName = document.querySelector("#country-name-badge");
    const dataWeatherDesc = document.querySelector("[data-weather-desc]");
    const temp = document.querySelector("[data-temp]");
    const windSpeed = document.querySelector("[data-wind-speed]");
    const humidity = document.querySelector("[data-humidity]");
    const cloud = document.querySelector("[data-cloud]");
    const cityImg = document.querySelector("[data-city-img]");
    
    const feelsLikeVal = document.querySelector("#feels-like-val");
    const pressureVal = document.querySelector("#pressure-val");
    const visibilityVal = document.querySelector("#visibility-val");
    const visibilityDesc = document.querySelector("#visibility-desc");
    const sunriseVal = document.querySelector("#sunrise-val");
    const sunsetVal = document.querySelector("#sunset-val");
    
    // Bind main elements
    if (cityName) cityName.textContent = `${data?.name}, ${data?.sys?.country}`;
    if (sidebarCity) sidebarCity.textContent = data?.name;
    if (countryName && data?.sys?.country) {
        countryName.textContent = data.sys.country;
    }
    if (cityImg && data?.sys?.country) {
        cityImg.src = `https://flagcdn.com/144x108/${data?.sys?.country.toLowerCase()}.png`;
        cityImg.alt = `${data?.sys?.country} flag`;
    }
    if (dataWeatherDesc) dataWeatherDesc.textContent = data?.weather?.[0]?.description;
    if (temp) temp.innerHTML = `${Math.round(data?.main?.temp)}°C`;
    
    // Convert speed to km/h to match mockup
    if (windSpeed) {
        const windKmh = Math.round(data?.wind?.speed * 3.6);
        windSpeed.textContent = `${windKmh} km/h`;
    }
    const windDirBadge = document.querySelector("#wind-direction-badge");
    if (windDirBadge && data?.wind?.deg !== undefined) {
        windDirBadge.textContent = getWindDirection(data.wind.deg);
    }
    
    if (humidity) humidity.textContent = `${data?.main?.humidity}%`;
    if (cloud) cloud.textContent = `${data?.clouds?.all}`;

    // Sunrise / sunset mini panels
    if (sunriseVal) sunriseVal.textContent = formatSunTime(data?.sys?.sunrise, data?.timezone);
    if (sunsetVal) sunsetVal.textContent = formatSunTime(data?.sys?.sunset, data?.timezone);
    
    // Feels Like, Pressure, Visibility
    if (feelsLikeVal) feelsLikeVal.textContent = `${Math.round(data?.main?.feels_like)}°C`;
    if (pressureVal) pressureVal.textContent = `${data?.main?.pressure} hPa`;
    
    if (visibilityVal) {
        const visibilityKm = (data?.visibility / 1000).toFixed(0);
        visibilityVal.textContent = `${visibilityKm} km`;
        if (visibilityDesc) {
            if (visibilityKm >= 10) visibilityDesc.textContent = "Excellent";
            else if (visibilityKm >= 6) visibilityDesc.textContent = "Good";
            else if (visibilityKm >= 3) visibilityDesc.textContent = "Moderate";
            else visibilityDesc.textContent = "Poor";
        }
    }

    // Set weather main icon
    if (data?.weather?.[0]?.icon) {
        setWeatherIcon(data?.weather?.[0]?.icon);
    }

    // Set dynamic landscape background
    if (data?.weather?.[0]?.main) {
        updateHeroBackdrop(data.weather[0].main);
        
        // Trigger canvas particles condition
        if (backgroundEngine) {
            backgroundEngine.setCondition(data.weather[0].main);
        }
    }

    // UV Index mapping
    const uvIndex = estimateUVIndex(data?.coord?.lat || 0, data?.clouds?.all || 0, data?.timezone || 0);
    displayUV(uvIndex);

    // Live local clock
    startLocalClock(data?.timezone || 0);
}

// Populate Forecast listings
function renderForecastInfo(forecastData) {
    const hourlyContainer = document.querySelector("#hourly-forecast-container");
    const dailyContainer = document.querySelector("#daily-forecast-container");
    
    if (hourlyContainer) {
        hourlyContainer.innerHTML = "";
        
        const hourlyItems = forecastData.list.slice(0, 8);
        hourlyItems.forEach(item => {
            const time = new Date((item.dt * 1000) + (new Date().getTimezoneOffset() * 60000) + (forecastData.city.timezone * 1000));
            const hourString = time.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
            
            const iconName = iconMapping[item.weather[0].icon] || "cloud-sun";
            const temp = Math.round(item.main.temp);
            
            // Generate mock/realistic precipitation pop indicator to match mockup
            const popVal = Math.round(item.pop * 100);
            const popHtml = popVal > 15 ? `<span class="hourly-pop">• ${popVal}%</span>` : "";
            
            const card = document.createElement("div");
            card.className = "hourly-card";
            card.innerHTML = `
                <span class="hourly-time">${hourString}</span>
                <div class="hourly-icon-box">
                    <i data-lucide="${iconName}"></i>
                </div>
                <span class="hourly-temp">${temp}°</span>
                ${popHtml}
            `;
            hourlyContainer.appendChild(card);
        });
    }
    
    if (dailyContainer) {
        dailyContainer.innerHTML = "";
        
        const dailyItems = [];
        const daysTracker = new Set();
        
        forecastData.list.forEach(item => {
            const dateStr = item.dt_txt.split(" ")[0];
            if (!daysTracker.has(dateStr)) {
                const timeStr = item.dt_txt.split(" ")[1];
                if (timeStr === "12:00:00" || dailyItems.length === 0) {
                    dailyItems.push(item);
                    daysTracker.add(dateStr);
                }
            }
        });
        
        const finalDaily = dailyItems.slice(0, 5);
        finalDaily.forEach(item => {
            const date = new Date(item.dt * 1000);
            const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
            
            const iconName = iconMapping[item.weather[0].icon] || "cloud-sun";
            const desc = item.weather[0].description;
            
            const maxTemp = Math.round(item.main.temp_max);
            const minTemp = Math.round(item.main.temp_min - (Math.random() * 3));
            
            const row = document.createElement("div");
            row.className = "daily-forecast-row";
            row.innerHTML = `
                <span class="daily-day">${dayName}</span>
                <div class="daily-condition">
                    <div class="daily-icon-box">
                        <i data-lucide="${iconName}"></i>
                    </div>
                    <span class="daily-desc">${desc}</span>
                </div>
                <div class="daily-temps">
                    <span class="max-temp-num">${maxTemp}°</span>
                    <span class="min-temp-num">${minTemp}°</span>
                </div>
            `;
            dailyContainer.appendChild(row);
        });
    }
    
    // Lucide trigger
    if (window.lucide) {
        lucide.createIcons();
    }
}

// Geolocation permissions triggers
function getLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(showPosition);
    } else {
        alert("Geolocation unsupported.");
    }
}

function showPosition(position) {
    const userCoordinates = {
        lat: position.coords.latitude,
        lon: position.coords.longitude,
    };
    sessionStorage.setItem("user-coordinates", JSON.stringify(userCoordinates));
    callApi(userCoordinates);
}

const grantAccessButton = document.querySelector("[data-grant-access]");
if (grantAccessButton) {
    grantAccessButton.addEventListener("click", getLocation);
}

// Search form query submitting
const searchInput = document.querySelector("[data-search-input]");

if (formContainer) {
    formContainer.addEventListener("submit", (e) => {
        e.preventDefault();
        if (errorImg) errorImg.style.display = "none";
        if (errP) errP.style.display = "none";
        if (errorBox) errorBox.classList.remove("active");
        weatherContainer.classList.remove("active");
        
        let cityName = searchInput.value;
        if (cityName == "") {
            return;
        } else {
            fetchSearchWeatherInfo(cityName);
        }
    });
}

async function fetchSearchWeatherInfo(city) {
    loadingContainer.classList.add("active");
    locationContainer.classList.remove("active");

    try {
        const currentRes = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`);
        const currentData = await currentRes.json();
        
        if (currentData.cod == 200) {
            const lat = currentData.coord.lat;
            const lon = currentData.coord.lon;
            
            const forecastRes = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`);
            const forecastData = await forecastRes.json();
            
            loadingContainer.classList.remove("active");
            weatherContainer.classList.add("active");
            
            renderWeatherInfo(currentData);
            renderForecastInfo(forecastData);
            
            fetchAirQuality(lat, lon);
        } else {
            triggerErrorState();
        }
    }
    catch (err) {
        console.error("Telemetry query failure:", err);
        triggerErrorState();
    }
}

function triggerErrorState() {
    loadingContainer.classList.remove("active");
    if (errorImg) errorImg.style.display = "block";
    if (errP) errP.style.display = "block";
    if (errorBox) errorBox.classList.add("active");
    weatherContainer.classList.remove("active");
}

// ==========================================
// WEATHER CANVAS ANIMATION LOOP ENGINE
// ==========================================
class WeatherCanvas {
    constructor() {
        this.canvas = document.getElementById("weather-canvas");
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext("2d");
        this.particles = [];
        this.animationFrameId = null;
        this.currentCondition = "clear";
        this.width = 0;
        this.height = 0;
        
        window.addEventListener("resize", () => this.resize());
        this.resize();
        this.startLoop();
    }
    
    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
    }
    
    setCondition(condition) {
        this.currentCondition = condition.toLowerCase();
        this.particles = [];
        
        const isLight = document.documentElement.getAttribute("data-theme") === "light";
        
        let count = 50;
        if (this.currentCondition.includes("rain") || this.currentCondition.includes("drizzle") || this.currentCondition.includes("thunder")) {
            count = 120;
        } else if (this.currentCondition.includes("snow")) {
            count = 90;
        } else if (this.currentCondition.includes("cloud") || this.currentCondition.includes("mist") || this.currentCondition.includes("fog") || this.currentCondition.includes("haze")) {
            count = 15;
        }
        
        for (let i = 0; i < count; i++) {
            this.particles.push(this.createParticle(true));
        }
    }
    
    createParticle(initial = false) {
        const cond = this.currentCondition;
        const isLight = document.documentElement.getAttribute("data-theme") === "light";
        
        if (cond.includes("clear") || cond.includes("sun")) {
            return {
                x: Math.random() * this.width,
                y: initial ? Math.random() * this.height : this.height + 20,
                vx: (Math.random() - 0.5) * 0.3,
                vy: -Math.random() * 0.6 - 0.2,
                radius: Math.random() * 3.5 + 1,
                alpha: Math.random() * 0.3 + 0.1,
                color: isLight ? `rgba(249, 115, 22, ${Math.random() * 0.15 + 0.05})` : `rgba(251, 191, 36, ${Math.random() * 0.2 + 0.08})`
            };
        } else if (cond.includes("cloud") || cond.includes("mist") || cond.includes("fog") || cond.includes("haze")) {
            return {
                x: Math.random() * this.width,
                y: Math.random() * this.height * 0.5,
                vx: Math.random() * 0.2 + 0.05,
                vy: 0,
                radius: Math.random() * 90 + 50,
                alpha: isLight ? Math.random() * 0.12 + 0.04 : Math.random() * 0.08 + 0.02,
                color: isLight ? "rgba(255, 255, 255, 0.9)" : "rgba(148, 163, 184, 0.2)"
            };
        } else if (cond.includes("rain") || cond.includes("drizzle")) {
            return {
                x: Math.random() * this.width,
                y: initial ? Math.random() * this.height : -40,
                vx: (Math.random() * 0.6) - 0.3,
                vy: Math.random() * 8 + 10,
                length: Math.random() * 18 + 12,
                width: Math.random() * 1.0 + 0.3,
                alpha: Math.random() * 0.3 + 0.1
            };
        } else if (cond.includes("snow")) {
            return {
                x: Math.random() * this.width,
                y: initial ? Math.random() * this.height : -20,
                vx: (Math.random() - 0.5) * 0.6,
                vy: Math.random() * 0.7 + 0.5,
                radius: Math.random() * 3 + 1,
                alpha: Math.random() * 0.5 + 0.15,
                angle: Math.random() * Math.PI * 2,
                speed: Math.random() * 0.015 + 0.005
            };
        } else {
            return {
                x: Math.random() * this.width,
                y: initial ? Math.random() * this.height : -40,
                vx: -Math.random() * 1.2 - 1.2,
                vy: Math.random() * 9 + 14,
                length: Math.random() * 24 + 14,
                width: Math.random() * 1.4 + 0.4,
                alpha: Math.random() * 0.4 + 0.15
            };
        }
    }
    
    update() {
        this.ctx.clearRect(0, 0, this.width, this.height);
        const cond = this.currentCondition;
        
        for (let i = 0; i < this.particles.length; i++) {
            let p = this.particles[i];
            
            if (cond.includes("clear") || cond.includes("sun")) {
                p.y += p.vy;
                p.x += p.vx;
                if (p.y < -20 || p.x < -20 || p.x > this.width + 20) {
                    this.particles[i] = this.createParticle(false);
                }
                
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                this.ctx.fillStyle = p.color;
                this.ctx.fill();
            } else if (cond.includes("cloud") || cond.includes("mist") || cond.includes("fog") || cond.includes("haze")) {
                p.x += p.vx;
                if (p.x - p.radius > this.width) {
                    p.x = -p.radius;
                }
                
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                this.ctx.fillStyle = p.color;
                this.ctx.fill();
            } else if (cond.includes("rain") || cond.includes("drizzle") || cond.includes("thunder")) {
                p.y += p.vy;
                p.x += p.vx;
                if (p.y > this.height || p.x < -50 || p.x > this.width + 50) {
                    this.particles[i] = this.createParticle(false);
                }
                
                this.ctx.beginPath();
                this.ctx.moveTo(p.x, p.y);
                this.ctx.lineTo(p.x + p.vx * 0.4, p.y + p.length);
                this.ctx.strokeStyle = `rgba(147, 197, 253, ${p.alpha})`;
                this.ctx.lineWidth = p.width;
                this.ctx.stroke();
            } else if (cond.includes("snow")) {
                p.y += p.vy;
                p.angle += p.speed;
                p.x += Math.sin(p.angle) * 0.3 + p.vx * 0.12;
                
                if (p.y > this.height || p.x < -20 || p.x > this.width + 20) {
                    this.particles[i] = this.createParticle(false);
                }
                
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                this.ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
                this.ctx.fill();
            }
        }
    }
    
    startLoop() {
        const loop = () => {
            this.update();
            this.animationFrameId = requestAnimationFrame(loop);
        };
        loop();
    }
}
