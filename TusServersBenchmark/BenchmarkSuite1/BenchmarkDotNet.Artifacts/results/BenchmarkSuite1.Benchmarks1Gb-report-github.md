```

BenchmarkDotNet v0.15.8, Windows 11 (10.0.26200.8037/25H2/2025Update/HudsonValley2)
Intel Core Ultra 9 185H 2.50GHz, 1 CPU, 22 logical and 16 physical cores
.NET SDK 10.0.201
  [Host]    : .NET 10.0.5 (10.0.5, 10.0.526.15411), X64 RyuJIT x86-64-v3
  .NET 10.0 : .NET 10.0.5 (10.0.5, 10.0.526.15411), X64 RyuJIT x86-64-v3

Job=.NET 10.0  Runtime=.NET 10.0  IterationCount=6  
WarmupCount=2  

```
| Method          | Mean    | Error   | StdDev  |
|---------------- |--------:|--------:|--------:|
| SendByDotnet    | 28.90 s | 2.277 s | 0.812 s |
| SendByDotnetAOT | 29.22 s | 1.502 s | 0.536 s |
| SendByGo        | 29.53 s | 6.698 s | 2.389 s |
