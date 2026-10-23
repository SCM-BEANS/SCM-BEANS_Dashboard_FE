using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Web.Script.Serialization;
using SolidWorks.Interop.sldworks;

public static class Cluster03CadInventory
{
    private static readonly JavaScriptSerializer Serializer = new JavaScriptSerializer
    {
        MaxJsonLength = int.MaxValue
    };

    public sealed class Report
    {
        public string schemaVersion { get; set; }
        public string generatedAtUtc { get; set; }
        public SourceRecord source { get; set; }
        public AssemblyRecord assembly { get; set; }
        public List<FileRecord> sourceFiles { get; set; }
        public List<ComponentRecord> components { get; set; }
        public List<PartRecord> parts { get; set; }
        public List<GlbRecord> glbFiles { get; set; }
        public List<string> warnings { get; set; }
    }

    public sealed class SourceRecord
    {
        public string assemblyPath { get; set; }
        public string sourceDirectory { get; set; }
        public string solidWorksRevision { get; set; }
        public string activeTitle { get; set; }
        public string activePath { get; set; }
        public string coordinateSystem { get; set; }
        public string unitPolicy { get; set; }
        public bool readOnlyIntent { get; set; }
    }

    public sealed class AssemblyRecord
    {
        public int componentCount { get; set; }
        public List<FeatureRecord> features { get; set; }
        public List<FeatureRecord> mateFeatures { get; set; }
    }

    public sealed class FileRecord
    {
        public string name { get; set; }
        public string fullPath { get; set; }
        public long length { get; set; }
        public string lastWriteTimeUtc { get; set; }
    }

    public sealed class ComponentRecord
    {
        public string id { get; set; }
        public string sourceFile { get; set; }
        public string referencedConfiguration { get; set; }
        public bool fixedComponent { get; set; }
        public int suppressionState { get; set; }
        public double[] transformArrayData { get; set; }
        public string gltfNodeCandidate { get; set; }
    }

    public sealed class PartRecord
    {
        public string sourceFile { get; set; }
        public bool openedByTool { get; set; }
        public int openErrors { get; set; }
        public int openWarnings { get; set; }
        public int featureCount { get; set; }
        public List<FeatureRecord> features { get; set; }
        public List<SketchRecord> sketches { get; set; }
    }

    public sealed class FeatureRecord
    {
        public string name { get; set; }
        public string type { get; set; }
    }

    public sealed class SketchRecord
    {
        public string featureName { get; set; }
        public int segmentCount { get; set; }
        public double[] modelToSketchTransform { get; set; }
        public double[] sketchToModelTransform { get; set; }
        public List<SketchSegmentRecord> segments { get; set; }
    }

    public sealed class SketchSegmentRecord
    {
        public int index { get; set; }
        public int curveIdentity { get; set; }
        public bool isLine { get; set; }
        public bool isCircle { get; set; }
        public double startParameter { get; set; }
        public double endParameter { get; set; }
        public bool reversed { get; set; }
        public bool periodic { get; set; }
        public double[] evaluateStart { get; set; }
        public double[] evaluateEnd { get; set; }
        public double[] circleParams { get; set; }
        public double[] lineParams { get; set; }
    }

    public sealed class GlbRecord
    {
        public string path { get; set; }
        public string generator { get; set; }
        public int meshCount { get; set; }
        public List<GlbNodeRecord> nodes { get; set; }
    }

    public sealed class GlbNodeRecord
    {
        public int index { get; set; }
        public string name { get; set; }
        public int? meshIndex { get; set; }
        public int childCount { get; set; }
    }

    public static int Main(string[] args)
    {
        if (args == null || args.Length < 2)
        {
            Console.Error.WriteLine("Usage: Cluster03CadInventory.exe <Final.SLDASM> <output.json> [glb...]");
            return 2;
        }

        try
        {
            var assemblyPath = Path.GetFullPath(args[0]);
            var outputPath = Path.GetFullPath(args[1]);
            var sourceDirectory = Path.GetDirectoryName(assemblyPath);
            var report = new Report
            {
                schemaVersion = "cluster-03-cad-inventory.v1",
                generatedAtUtc = DateTime.UtcNow.ToString("o"),
                source = new SourceRecord
                {
                    assemblyPath = assemblyPath,
                    sourceDirectory = sourceDirectory,
                    readOnlyIntent = true,
                    coordinateSystem = "SOLIDWORKS assembly coordinate system",
                    unitPolicy = "SolidWorks API component transforms and Sketch coordinates are meters; runtime uses meters."
                },
                assembly = new AssemblyRecord
                {
                    features = new List<FeatureRecord>(),
                    mateFeatures = new List<FeatureRecord>()
                },
                sourceFiles = new List<FileRecord>(),
                components = new List<ComponentRecord>(),
                parts = new List<PartRecord>(),
                glbFiles = new List<GlbRecord>(),
                warnings = new List<string>()
            };

            AddSourceFiles(sourceDirectory, report.sourceFiles);
            InspectGlbArguments(args, report.glbFiles);

            var sw = (ISldWorks)Marshal.GetActiveObject("SldWorks.Application");
            report.source.solidWorksRevision = SafeString(delegate { return sw.RevisionNumber(); });

            var active = sw.ActiveDoc as IModelDoc2;
            if (active == null)
                throw new InvalidOperationException("SolidWorks has no active document.");
            report.source.activeTitle = active.GetTitle();
            report.source.activePath = active.GetPathName();

            if (!PathEquals(report.source.activePath, assemblyPath))
                throw new InvalidOperationException(
                    "Active SolidWorks document does not match requested assembly: "
                    + report.source.activePath);

            var assembly = active as IAssemblyDoc;
            if (assembly == null)
                throw new InvalidOperationException("Active document is not an assembly.");

            ReadAssemblyFeatures(active, report.assembly);
            ReadComponents(assembly, report.components);
            report.assembly.componentCount = report.components.Count;

            var uniquePartPaths = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach (var component in report.components)
            {
                if (!String.IsNullOrEmpty(component.sourceFile))
                    uniquePartPaths.Add(component.sourceFile);
            }

            foreach (var partPath in uniquePartPaths)
                report.parts.Add(ReadPart(sw, partPath, report.warnings));

            report.source.activeTitle = active.GetTitle();
            report.source.activePath = active.GetPathName();

            Directory.CreateDirectory(Path.GetDirectoryName(outputPath));
            File.WriteAllText(
                outputPath,
                Serializer.Serialize(report),
                new UTF8Encoding(false));

            Console.WriteLine("INVENTORY_WRITTEN=" + outputPath);
            Console.WriteLine("COMPONENTS=" + report.components.Count);
            Console.WriteLine("PARTS=" + report.parts.Count);
            Console.WriteLine("GLB_FILES=" + report.glbFiles.Count);
            Console.WriteLine("WARNINGS=" + report.warnings.Count);
            return report.warnings.Count == 0 ? 0 : 1;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine("INVENTORY_ERROR=" + ex);
            return 1;
        }
    }

    private static void AddSourceFiles(string directory, List<FileRecord> output)
    {
        foreach (var path in Directory.GetFiles(directory))
        {
            var info = new FileInfo(path);
            if (info.Name.StartsWith("~$", StringComparison.Ordinal))
                continue;
            output.Add(new FileRecord
            {
                name = info.Name,
                fullPath = info.FullName,
                length = info.Length,
                lastWriteTimeUtc = info.LastWriteTimeUtc.ToString("o")
            });
        }
        output.Sort(delegate (FileRecord left, FileRecord right)
        {
            return StringComparer.OrdinalIgnoreCase.Compare(left.name, right.name);
        });
    }

    private static void InspectGlbArguments(string[] args, List<GlbRecord> output)
    {
        for (var i = 2; i < args.Length; i++)
        {
            var path = Path.GetFullPath(args[i]);
            if (!File.Exists(path))
            {
                output.Add(new GlbRecord
                {
                    path = path,
                    nodes = new List<GlbNodeRecord>()
                });
                continue;
            }
            output.Add(ReadGlb(path));
        }
    }

    private static GlbRecord ReadGlb(string path)
    {
        var bytes = File.ReadAllBytes(path);
        if (bytes.Length < 20 || BitConverter.ToUInt32(bytes, 0) != 0x46546C67)
            throw new InvalidDataException("Not a GLB file: " + path);

        var jsonLength = BitConverter.ToInt32(bytes, 12);
        var json = Encoding.UTF8.GetString(bytes, 20, jsonLength)
            .Trim('\0', ' ', '\r', '\n', '\t');
        var root = Serializer.DeserializeObject(json) as Dictionary<string, object>;
        var asset = root != null && root.ContainsKey("asset")
            ? root["asset"] as Dictionary<string, object>
            : null;
        var generator = asset != null && asset.ContainsKey("generator")
            ? Convert.ToString(asset["generator"])
            : null;
        var meshes = root != null && root.ContainsKey("meshes")
            ? root["meshes"] as object[]
            : null;
        var nodes = new List<GlbNodeRecord>();
        var rawNodes = root != null && root.ContainsKey("nodes")
            ? root["nodes"] as object[]
            : null;

        if (rawNodes != null)
        {
            for (var index = 0; index < rawNodes.Length; index++)
            {
                var node = rawNodes[index] as Dictionary<string, object>;
                if (node == null) continue;
                int? meshIndex = null;
                if (node.ContainsKey("mesh"))
                    meshIndex = Convert.ToInt32(node["mesh"]);
                var childCount = 0;
                if (node.ContainsKey("children"))
                {
                    var children = node["children"] as object[];
                    childCount = children == null ? 0 : children.Length;
                }
                nodes.Add(new GlbNodeRecord
                {
                    index = index,
                    name = node.ContainsKey("name") ? Convert.ToString(node["name"]) : null,
                    meshIndex = meshIndex,
                    childCount = childCount
                });
            }
        }

        return new GlbRecord
        {
            path = path,
            generator = generator,
            meshCount = meshes == null ? 0 : meshes.Length,
            nodes = nodes
        };
    }

    private static void ReadAssemblyFeatures(IModelDoc2 model, AssemblyRecord output)
    {
        IFeature feature = model.FirstFeature() as IFeature;
        while (feature != null)
        {
            var record = ToFeatureRecord(feature);
            output.features.Add(record);
            if (String.Equals(record.type, "MateGroup", StringComparison.OrdinalIgnoreCase))
            {
                IFeature subFeature = feature.GetFirstSubFeature() as IFeature;
                while (subFeature != null)
                {
                    output.mateFeatures.Add(ToFeatureRecord(subFeature));
                    subFeature = subFeature.GetNextSubFeature() as IFeature;
                }
            }
            feature = feature.GetNextFeature() as IFeature;
        }
    }

    private static void ReadComponents(IAssemblyDoc assembly, List<ComponentRecord> output)
    {
        var rawComponents = assembly.GetComponents(false) as object[];
        if (rawComponents == null) return;

        foreach (var raw in rawComponents)
        {
            var component = raw as IComponent2;
            if (component == null) continue;
            var sourceFile = component.GetPathName();
            output.Add(new ComponentRecord
            {
                id = component.Name2,
                sourceFile = sourceFile,
                referencedConfiguration = component.ReferencedConfiguration,
                fixedComponent = component.IsFixed(),
                suppressionState = component.GetSuppression2(),
                transformArrayData = ReadTransform(component.Transform2),
                gltfNodeCandidate = component.Name2
            });
        }
    }

    private static PartRecord ReadPart(ISldWorks sw, string path, List<string> warnings)
    {
        var record = new PartRecord
        {
            sourceFile = path,
            features = new List<FeatureRecord>(),
            sketches = new List<SketchRecord>()
        };
        var errors = 0;
        var openWarnings = 0;
        var part = sw.GetOpenDocumentByName(path) as IModelDoc2;
        var openedByTool = false;

        if (part == null)
        {
            part = sw.OpenDoc6(path, 1, 3, "", ref errors, ref openWarnings);
            openedByTool = part != null;
        }

        record.openedByTool = openedByTool;
        record.openErrors = errors;
        record.openWarnings = openWarnings;

        if (part == null)
        {
            warnings.Add("Unable to open part: " + path + " errors=" + errors + " warnings=" + openWarnings);
            return record;
        }

        try
        {
            IFeature feature = part.FirstFeature() as IFeature;
            while (feature != null)
            {
                var featureRecord = ToFeatureRecord(feature);
                record.features.Add(featureRecord);
                record.featureCount++;

                if (String.Equals(featureRecord.type, "ProfileFeature", StringComparison.OrdinalIgnoreCase)
                    || featureRecord.name.StartsWith("Sketch", StringComparison.OrdinalIgnoreCase))
                {
                    var sketch = feature.GetSpecificFeature2() as ISketch;
                    if (sketch != null)
                        record.sketches.Add(ReadSketch(featureRecord.name, sketch, warnings));
                }

                feature = feature.GetNextFeature() as IFeature;
            }
        }
        catch (Exception ex)
        {
            warnings.Add("Feature read failed for " + path + ": " + ex.Message);
        }
        finally
        {
            if (openedByTool)
                sw.CloseDoc(part.GetTitle());
        }

        return record;
    }

    private static SketchRecord ReadSketch(
        string featureName,
        ISketch sketch,
        List<string> warnings)
    {
        var segments = new List<SketchSegmentRecord>();
        var rawSegments = sketch.GetSketchSegments() as object[];
        var modelToSketch = ReadTransform(sketch.ModelToSketchTransform);
        var sketchToModel = ReadTransform(sketch.ModelToSketchTransform.Inverse() as MathTransform);

        if (rawSegments != null)
        {
            for (var index = 0; index < rawSegments.Length; index++)
            {
                var segment = rawSegments[index] as ISketchSegment;
                if (segment == null) continue;
                var curve = segment.GetCurve() as ICurve;
                if (curve == null) continue;

                var start = 0.0;
                var end = 0.0;
                var reversed = false;
                var periodic = false;
                curve.GetEndParams(out start, out end, out reversed, out periodic);

                segments.Add(new SketchSegmentRecord
                {
                    index = index,
                    curveIdentity = curve.Identity(),
                    isLine = curve.IsLine(),
                    isCircle = curve.IsCircle(),
                    startParameter = start,
                    endParameter = end,
                    reversed = reversed,
                    periodic = periodic,
                    evaluateStart = ReadArray(curve.Evaluate2(start, 0)),
                    evaluateEnd = ReadArray(curve.Evaluate2(end, 0)),
                    circleParams = ReadArray(curve.CircleParams),
                    lineParams = ReadArray(curve.LineParams)
                });
            }
        }

        return new SketchRecord
        {
            featureName = featureName,
            segmentCount = segments.Count,
            modelToSketchTransform = modelToSketch,
            sketchToModelTransform = sketchToModel,
            segments = segments
        };
    }

    private static FeatureRecord ToFeatureRecord(IFeature feature)
    {
        var type = "";
        try { type = feature.GetTypeName2(); } catch { }
        return new FeatureRecord
        {
            name = feature.Name,
            type = type
        };
    }

    private static double[] ReadTransform(MathTransform transform)
    {
        return transform == null ? null : ReadArray(transform.ArrayData);
    }

    private static double[] ReadArray(object value)
    {
        var values = value as Array;
        if (values == null) return null;
        var result = new double[values.Length];
        for (var i = 0; i < values.Length; i++)
            result[i] = Convert.ToDouble(values.GetValue(i));
        return result;
    }

    private static string SafeString(Func<string> reader)
    {
        try { return reader(); } catch { return null; }
    }

    private static bool PathEquals(string left, string right)
    {
        return String.Equals(
            Path.GetFullPath(left ?? ""),
            Path.GetFullPath(right ?? ""),
            StringComparison.OrdinalIgnoreCase);
    }
}
