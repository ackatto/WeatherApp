using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

// Настройка статических файлов (HTML, CSS, JS)
app.UseDefaultFiles();
app.UseStaticFiles();

// Конфигурация API (читаем ключ из appsettings.json или используем значение по умолчанию)
var config = app.Configuration;
var apiKey = config["OpenWeather:ApiKey"] ?? "9566ebaa8287335e57aedef36d6ee1c3";

// ---------------------------------------------------------------
// 1. Текущая погода
// ---------------------------------------------------------------
app.MapGet("/weather", async (string city) =>
{
    // 1.1. Проверка входных данных
    if (string.IsNullOrWhiteSpace(city))
        return Results.BadRequest(new { error = "Укажите название города." });

    // 1.2. Формирование URL и запрос к OpenWeatherMap
    var url = $"https://api.openweathermap.org/data/2.5/weather?q={city}&appid={apiKey}&units=metric&lang=ru";
    using var http = new HttpClient();
    var response = await http.GetAsync(url);
    var json = await response.Content.ReadAsStringAsync();

    // 1.3. Разбор ответа
    using var doc = JsonDocument.Parse(json);
    var root = doc.RootElement;

    // 1.4. Обработка ошибки API
    if (root.TryGetProperty("cod", out var codProp) && codProp.GetInt32() != 200)
        return Results.BadRequest(new { error = "Город не найден." });

    // 1.5. Формирование результата (только нужные поля)
    var weather = new
    {
        city = root.GetProperty("name").GetString(),
        temperature = root.GetProperty("main").GetProperty("temp").GetDouble(),
        feelsLike = root.GetProperty("main").GetProperty("feels_like").GetDouble(),
        windSpeed = root.GetProperty("wind").GetProperty("speed").GetDouble(),
        description = root.GetProperty("weather")[0].GetProperty("description").GetString()
    };

    return Results.Json(weather);
});

// ---------------------------------------------------------------
// 2. Прогноз на 5 дней (с шагом 3 часа)
// ---------------------------------------------------------------
app.MapGet("/forecast", async (string city) =>
{
    if (string.IsNullOrWhiteSpace(city))
        return Results.BadRequest(new { error = "Укажите название города." });

    var url = $"https://api.openweathermap.org/data/2.5/forecast?q={city}&appid={apiKey}&units=metric&lang=ru";
    using var http = new HttpClient();
    var response = await http.GetAsync(url);
    var json = await response.Content.ReadAsStringAsync();

    using var doc = JsonDocument.Parse(json);
    var root = doc.RootElement;

    if (root.TryGetProperty("cod", out var codProp) && codProp.GetString() != "200")
        return Results.BadRequest(new { error = "Не удалось загрузить прогноз." });

    var cityName = root.GetProperty("city").GetProperty("name").GetString();
    var list = root.GetProperty("list");

    var forecasts = new List<object>();
    foreach (var item in list.EnumerateArray())
    {
        forecasts.Add(new
        {
            dt_txt = item.GetProperty("dt_txt").GetString(),
            temperature = item.GetProperty("main").GetProperty("temp").GetDouble(),
            feelsLike = item.GetProperty("main").GetProperty("feels_like").GetDouble(),
            windSpeed = item.GetProperty("wind").GetProperty("speed").GetDouble(),
            description = item.GetProperty("weather")[0].GetProperty("description").GetString()
        });
    }

    var result = new
    {
        city = cityName,
        forecasts
    };

    return Results.Json(result);
});

app.Run();