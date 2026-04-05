using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using BenchmarkDotNet.Attributes;
using BenchmarkDotNet.Jobs;
using TusSharp;

namespace BenchmarkSuite1
{
    public abstract class BenchmarksBase
    {
        private static readonly string FilesDirectory = GetValueOrDefault("BENCHMARK_FILES_DIR", "/files");
        private static readonly string DotnetEndpoint = GetValueOrDefault("DOTNET_TUS_URL", "http://localhost:8082/files");
        private static readonly string DotnetAotEndpoint = GetValueOrDefault("DOTNET_AOT_TUS_URL", "http://localhost:8083/files");
        private static readonly string GoEndpoint = GetValueOrDefault("GO_TUS_URL", "http://localhost:8084/files");
        private static readonly string StoreDirectory = GetValueOrDefault("UPLOAD_STORE_DIR", "/stores/");
        protected static readonly string File100MbName = GetValueOrDefault("BENCHMARK_FILE_100MB", "100MB.bin");
        protected static readonly string File1GbName = GetValueOrDefault("BENCHMARK_FILE_1GB", "1GB.bin");
        protected static readonly string File10GbName = GetValueOrDefault("BENCHMARK_FILE_10GB", "10GB.bin");
        protected abstract string FileName { get; }

        [Benchmark]
        public async Task SendByDotnet() => await SendFile(Path.Combine(FilesDirectory, FileName), DotnetEndpoint);

        [Benchmark]
        public async Task SendByDotnetAOT() => await SendFile(Path.Combine(FilesDirectory, FileName), DotnetAotEndpoint);

        [Benchmark]
        public async Task SendByGo() => await SendFile(Path.Combine(FilesDirectory, FileName), GoEndpoint);

        [IterationCleanup]
        public void CleanupUploadedFiles()
        {
            DeleteUploadedFiles();
        }

        protected async Task SendFile(string filePath, string url)
        {
            var client = new TusClient();
            await using var stream = File.OpenRead(filePath);
            var opt = new TusUploadOption()
            {
                EndPoint = new Uri(url),
                ChunkSize = 1 * 1024 * 1024, // 1MB
            };
            using var upload = client.Upload(opt, stream);
            await upload.Start();
        }

        private static void DeleteUploadedFiles()
        {
            if (string.IsNullOrWhiteSpace(StoreDirectory))
            {
                Console.WriteLine($"store directory is not configured.");
                return;
            }
            
            if (!Directory.Exists(StoreDirectory))
            {
                Console.WriteLine($"store directory not found ({StoreDirectory}).");
                return;
            }
            
            new DirectoryInfo(StoreDirectory).GetFiles().ToList().ForEach(x => x.Delete());
        }
        
        private static string GetValueOrDefault(string key, string defaultValue)
        {
            var value = Environment.GetEnvironmentVariable(key);
            return string.IsNullOrWhiteSpace(value) ? defaultValue : value;
        }
    }

    [SimpleJob(RuntimeMoniker.Net10_0)]
    [JsonExporterAttribute.Full]
    [MarkdownExporterAttribute.GitHub]
    public class Benchmarks100Mb : BenchmarksBase
    {
        protected override string FileName => File100MbName;
    }

    [SimpleJob(RuntimeMoniker.Net10_0)]
    [JsonExporterAttribute.Full]
    [MarkdownExporterAttribute.GitHub]
    public class Benchmarks1Gb : BenchmarksBase
    {
        protected override string FileName => File1GbName;
    }

    [SimpleJob(RuntimeMoniker.Net10_0)]
    [JsonExporterAttribute.Full]
    [MarkdownExporterAttribute.GitHub]
    public class Benchmarks10Gb : BenchmarksBase
    {
        protected override string FileName => File10GbName;
    }
}
