FROM mcr.microsoft.com/dotnet/sdk:10.0 AS final
WORKDIR /src
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*
COPY . ./
RUN dotnet restore "./BenchmarkSuite1.csproj"
RUN dotnet build "./BenchmarkSuite1.csproj" -c Release --no-restore
COPY docker-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
