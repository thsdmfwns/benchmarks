FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src
COPY . .
RUN dotnet restore "./TusDotNetServer.csproj"
RUN dotnet publish "./TusDotNetServer.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
ENV ASPNETCORE_URLS=http://+:80
EXPOSE 80
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "TusDotNetServer.dll"]