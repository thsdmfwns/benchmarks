using System;
using System.Collections.Concurrent;
using System.IO;
using System.Threading.Tasks;
using BenchmarkDotNet;
using BenchmarkDotNet.Attributes;
using BenchmarkDotNet.Jobs;
using TusSharp;

namespace BenchmarkSuite1
{
    public abstract class BenchmarksBase
    {
        private readonly ConcurrentQueue<(Uri EndPoint, Uri UploadUrl)> _uploadsToDelete = new();

        protected abstract string FileName { get; }

        [Benchmark]
        public async Task SendByDotnet() => await SendFile(Path.Combine("/files", FileName), "http://localhost:8082/files");

        [Benchmark]
        public async Task SendByDotnetAOT() => await SendFile(Path.Combine("/files", FileName), "http://localhost:8083/files");

        [Benchmark]
        public async Task SendByGo() => await SendFile(Path.Combine("/files", FileName), "http://localhost:8084/files");

        [IterationCleanup]
        public void CleanupUploadedFiles()
        {
            while (_uploadsToDelete.TryDequeue(out var upload))
            {
                try
                {
                    var client = new TusClient();
                    var opt = new TusUploadOption
                    {
                        EndPoint = upload.EndPoint,
                        UploadUrl = upload.UploadUrl,
                    };

                    using var deleteUpload = client.Upload(opt, Stream.Null);
                    deleteUpload.Delete().GetAwaiter().GetResult();
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Cleanup failed for {upload.UploadUrl}: {ex.Message}");
                }
            }
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

            if (opt.UploadUrl is not null)
            {
                _uploadsToDelete.Enqueue((opt.EndPoint, opt.UploadUrl));
            }
        }
    }

    [SimpleJob(RuntimeMoniker.Net10_0)]
    /*[WarmupCount(3)]
    [IterationCount(10)]*/
    [JsonExporterAttribute.Full]
    [MarkdownExporterAttribute.GitHub]
    public class Benchmarks100Mb : BenchmarksBase
    {
        protected override string FileName => "100mb.bin";
    }

    [SimpleJob(RuntimeMoniker.Net10_0)]
    [WarmupCount(2)]
    [IterationCount(6)]
    [JsonExporterAttribute.Full]
    [MarkdownExporterAttribute.GitHub]
    public class Benchmarks1Gb : BenchmarksBase
    {
        protected override string FileName => "1gb.bin";
    }

    [SimpleJob(RuntimeMoniker.Net10_0)]
    [WarmupCount(1)]
    [IterationCount(3)]
    [JsonExporterAttribute.Full]
    [MarkdownExporterAttribute.GitHub]
    public class Benchmarks10Gb : BenchmarksBase
    {
        protected override string FileName => "10gb.bin";
    }
}
