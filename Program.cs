using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

app.UseDefaultFiles();
app.UseStaticFiles();

app.MapGet("/weather", async (string city) =>
{
    var apiKey = "9566ebaa8287335e57aedef36d6ee1c3";
    var url = $"https://api.openweathermap.org/data/2.5/weather?q={city}&appid={apiKey}&units=metric";

    using var client = new HttpClient();
    var response = await client.GetAsync(url);

    if (response.IsSuccessStatusCode)
    {
        var json = await response.Content.ReadAsStringAsync();
        return Results.Content(json, "application/json");
    }
    else
    {
        return Results.Problem("Город не найден или ошибка API.");
    }
});

app.Run();