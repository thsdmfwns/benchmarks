using tusdotnet;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers();

var app = builder.Build();

app.UseCors(builder => builder
    .AllowAnyHeader()
    .AllowAnyMethod()
    .AllowAnyOrigin()
    .WithExposedHeaders(tusdotnet.Helpers.CorsHelper.GetExposedHeaders())
);

Directory.CreateDirectory("/etc/tusfiles");

app.MapTus("/files", async httpContext => new()
{
    
    Store = new tusdotnet.Stores.TusDiskStore(@"/etc/tusfiles"),
    Events = new()
    {
        OnFileCompleteAsync = ctx =>
        {
            var fileName = ctx.FileId;
            Console.WriteLine($"{fileName} has been completed");
            return Task.CompletedTask;
        }
    }
});

app.MapControllers();

app.Run();
