// ---------------------------
// DOM элементы
// ---------------------------
const cityInput = document.getElementById('cityInput');
const showButton = document.getElementById('showBtn');
const resultDiv = document.getElementById('result');
const modeButtons = document.querySelectorAll('.mode-btn');

// Текущий выбранный режим: 'now', 'tomorrow', '5days'
let currentMode = 'now';

// ---------------------------
// Вспомогательные функции
// ---------------------------
function capitalizeFirst(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function simplifyWeatherDescription(desc) {
    const lowerDesc = desc.toLowerCase();
    if (lowerDesc.includes('дождь') || lowerDesc.includes('ливень') || lowerDesc.includes('гроза')) return 'Дождь';
    if (lowerDesc.includes('снег') || lowerDesc.includes('метель')) return 'Снег';
    if (lowerDesc.includes('облач') || lowerDesc.includes('пасмур')) return 'Облачность';
    if (lowerDesc.includes('ясно') || lowerDesc.includes('солнечно')) return 'Ясно';
    return capitalizeFirst(desc);
}

function formatDateShort(dateStr) {
    const date = new Date(dateStr);
    const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    const months = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
    return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]}`;
}

// Находит прогноз на полдень (12:00) или ближайшее время
function getNoonForecast(dayForecasts) {
    if (!dayForecasts.length) return null;
    let noon = dayForecasts.find(f => f.dt_txt.includes('12:00:00'));
    if (noon) return noon;
    let closest = null;
    let minDiff = Infinity;
    for (const f of dayForecasts) {
        const hour = parseInt(f.dt_txt.split(' ')[1].split(':')[0]);
        const diff = Math.abs(hour - 12);
        if (diff < minDiff) {
            minDiff = diff;
            closest = f;
        }
    }
    return closest;
}

// Агрегирует прогноз по дням: мин/макс температура + дневная погода (полдень)
function aggregateForecastByDay(forecasts) {
    // Группировка по дате
    const grouped = {};
    forecasts.forEach(item => {
        const date = item.dt_txt.split(' ')[0];
        if (!grouped[date]) grouped[date] = [];
        grouped[date].push(item);
    });

    const days = [];
    for (const date of Object.keys(grouped).sort()) {
        const items = grouped[date];
        let minTemp = Infinity, maxTemp = -Infinity;
        for (const item of items) {
            if (item.temperature < minTemp) minTemp = item.temperature;
            if (item.temperature > maxTemp) maxTemp = item.temperature;
        }
        const noon = getNoonForecast(items);
        if (noon) {
            days.push({
                date: date,
                minTemp: Math.round(minTemp),
                maxTemp: Math.round(maxTemp),
                description: simplifyWeatherDescription(noon.description),
                windSpeed: noon.windSpeed
            });
        }
    }
    return days;
}

// Цвет строки в зависимости от среднего значения температур
function getRowColor(temperatures) {
    const avg = temperatures.reduce((a, b) => a + b, 0) / temperatures.length;
    const minTemp = -20, maxTemp = 35;
    let t = (avg - minTemp) / (maxTemp - minTemp);
    t = Math.min(1, Math.max(0, t));
    let r, g, b;
    if (t < 0.5) {
        const t2 = t * 2;
        r = Math.round(255 * t2);
        g = Math.round(255 * t2);
        b = Math.round(255 * (1 - t2));
    } else {
        const t2 = (t - 0.5) * 2;
        r = 255;
        g = Math.round(255 * (1 - t2));
        b = Math.round(200 * (1 - t2));
    }
    return `rgb(${r}, ${g}, ${b})`;
}

// ---------------------------
// Функции отображения (рендеринг)
// ---------------------------
function displayCurrentWeather(data) {
    resultDiv.innerHTML = `
        <div class="weather-card">
            <h3>${data.city}</h3>
            <p><strong>🌡️ Температура:</strong> ${data.temperature} °C</p>
            <p><strong>🤔 Ощущается как:</strong> ${data.feelsLike} °C</p>
            <p><strong>💨 Ветер:</strong> ${data.windSpeed} м/с</p>
        </div>
    `;
}

function displayTomorrowForecast(cityName, forecasts) {
    let html = `<h3>Прогноз на завтра для ${cityName}</h3>`;
    html += '<table>';
    html += '<tr><th>Время</th><th>Температура</th><th>Ощущается</th><th>Погода</th><th>Ветер</th></tr>';
    forecasts.forEach(f => {
        const time = f.dt_txt.split(' ')[1].slice(0, 5);
        const desc = simplifyWeatherDescription(f.description);
        html += `
            <tr>
                <td>${time}</td>
                <td>${f.temperature} °C</td>
                <td>${f.feelsLike} °C</td>
                <td>${desc}</td>
                <td>${f.windSpeed} м/с</td>
            </tr>
        `;
    });
    html += '</table>';
    resultDiv.innerHTML = html;
}

function displayFiveDaysForecast(cityName, forecasts) {
    const days = aggregateForecastByDay(forecasts);
    if (!days.length) {
        resultDiv.innerHTML = '<p class="error">Нет данных для отображения</p>';
        return;
    }

    let html = `<h3>Прогноз на 5 дней для ${cityName}</h3>`;
    html += '<table>';

    // Строка заголовков (даты)
    html += '<tr>';
    for (const day of days) html += `<th>${formatDateShort(day.date)}</th>`;
    html += '</tr>';

    // Строка минимальной температуры
    const minTemps = days.map(d => d.minTemp);
    const minColor = getRowColor(minTemps);
    html += `<tr style="background-color: ${minColor}; color: black;">`;
    for (const day of days) html += `<td>${day.minTemp} °C</td>`;
    html += '</tr>';

    // Строка максимальной температуры
    const maxTemps = days.map(d => d.maxTemp);
    const maxColor = getRowColor(maxTemps);
    html += `<tr style="background-color: ${maxColor}; color: black;">`;
    for (const day of days) html += `<td>${day.maxTemp} °C</td>`;
    html += '</tr>';

    // Строка погоды
    html += '<tr>';
    for (const day of days) html += `<td>${day.description}</td>`;
    html += '</tr>';

    // Строка ветра
    html += '<tr>';
    for (const day of days) html += `<td>${day.windSpeed} м/с</td>`;
    html += '</tr>';

    html += '</table>';
    resultDiv.innerHTML = html;
}

// ---------------------------
// Загрузка данных с сервера
// ---------------------------
async function fetchWeatherData(city) {
    resultDiv.innerHTML = '<p>Загрузка...</p>';
    try {
        if (currentMode === 'now') {
            const response = await fetch(`/weather?city=${encodeURIComponent(city)}`);
            if (!response.ok) throw new Error(`Ошибка сервера: ${response.status}`);
            const data = await response.json();
            displayCurrentWeather(data);
        }
        else if (currentMode === 'tomorrow') {
            const response = await fetch(`/forecast?city=${encodeURIComponent(city)}`);
            if (!response.ok) throw new Error(`Ошибка сервера: ${response.status}`);
            const data = await response.json();
            if (!data.forecasts) throw new Error('Нет прогноза');
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tomorrowStr = tomorrow.toISOString().split('T')[0];
            const filtered = data.forecasts.filter(f => f.dt_txt.split(' ')[0] === tomorrowStr);
            if (filtered.length === 0) {
                resultDiv.innerHTML = `<p class="error">Нет данных на завтра для ${data.city}</p>`;
                return;
            }
            displayTomorrowForecast(data.city, filtered);
        }
        else if (currentMode === '5days') {
            const response = await fetch(`/forecast?city=${encodeURIComponent(city)}`);
            if (!response.ok) throw new Error(`Ошибка сервера: ${response.status}`);
            const data = await response.json();
            if (!data.forecasts) throw new Error('Нет прогноза');
            const fiveDays = data.forecasts.slice(0, 40);
            displayFiveDaysForecast(data.city, fiveDays);
        }
    } catch (err) {
        resultDiv.innerHTML = `<p class="error">Ошибка: ${err.message}</p>`;
        console.error(err);
    }
}

// ---------------------------
// Обработчики событий
// ---------------------------
modeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        modeButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentMode = btn.dataset.mode;
        const city = cityInput.value.trim();
        if (city) fetchWeatherData(city);
    });
});

showButton.addEventListener('click', () => {
    const city = cityInput.value.trim();
    if (!city) {
        alert('Введите город');
        return;
    }
    fetchWeatherData(city);
});

// При загрузке страницы – показать погоду для города по умолчанию
window.addEventListener('DOMContentLoaded', () => {
    document.querySelector('.mode-btn[data-mode="now"]').classList.add('active');
    currentMode = 'now';
    if (cityInput.value.trim()) fetchWeatherData(cityInput.value.trim());
});