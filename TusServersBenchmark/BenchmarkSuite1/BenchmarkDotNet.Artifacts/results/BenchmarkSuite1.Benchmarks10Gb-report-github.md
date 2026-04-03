```

BenchmarkDotNet v0.15.8, Windows 11 (10.0.26200.8037/25H2/2025Update/HudsonValley2)
Intel Core Ultra 9 185H 2.50GHz, 1 CPU, 22 logical and 16 physical cores
.NET SDK 10.0.201
  [Host]    : .NET 10.0.5 (10.0.5, 10.0.526.15411), X64 RyuJIT x86-64-v3
  .NET 10.0 : .NET 10.0.5 (10.0.5, 10.0.526.15411), X64 RyuJIT x86-64-v3

Job=.NET 10.0  Runtime=.NET 10.0  IterationCount=3  
WarmupCount=1  

```
| Method          | Mean    | Error    | StdDev   |
|---------------- |--------:|---------:|---------:|
| SendByDotnet    | 5.013 m | 0.9669 m | 0.0530 m |
| SendByDotnetAOT | 4.943 m | 3.4119 m | 0.1870 m |
| SendByGo        | 5.096 m | 6.2897 m | 0.3448 m |
