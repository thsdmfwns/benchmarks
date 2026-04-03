```

BenchmarkDotNet v0.15.8, Windows 11 (10.0.26200.8037/25H2/2025Update/HudsonValley2)
Intel Core Ultra 9 185H 2.50GHz, 1 CPU, 22 logical and 16 physical cores
.NET SDK 10.0.201
  [Host]    : .NET 10.0.5 (10.0.5, 10.0.526.15411), X64 RyuJIT x86-64-v3
  .NET 10.0 : .NET 10.0.5 (10.0.5, 10.0.526.15411), X64 RyuJIT x86-64-v3

Job=.NET 10.0  Runtime=.NET 10.0  

```
| Method          | Mean    | Error    | StdDev   |
|---------------- |--------:|---------:|---------:|
| SendByDotnet    | 2.974 s | 0.0979 s | 0.2885 s |
| SendByDotnetAOT | 2.886 s | 0.0838 s | 0.2470 s |
| SendByGo        | 2.842 s | 0.0834 s | 0.2420 s |
