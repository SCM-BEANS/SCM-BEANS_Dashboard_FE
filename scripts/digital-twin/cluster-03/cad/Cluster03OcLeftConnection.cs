using System;
using System.Collections.Generic;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Web.Script.Serialization;
using SolidWorks.Interop.sldworks;

public static class Cluster03OcLeftConnection
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
        public ComponentRecord targetComponent { get; set; }
        public ComponentRecord parentComponent { get; set; }
        public List<ComponentRecord> components { get; set; }
        public List<MateRecord> mates { get; set; }
        public List<PartRecord> parts { get; set; }
        public List<string> warnings { get; set; }
    }

    public sealed class SourceRecord
    {
        public string assemblyPath { get; set; }
        public string activeTitle { get; set; }
        public string activePath { get; set; }
        public string solidWorksRevision { get; set; }
        public string sessionMode { get; set; }
        public bool readOnlyIntent { get; set; }
        public string coordinateSystem { get; set; }
        public string unitPolicy { get; set; }
    }

    public sealed class ComponentRecord
    {
        public string id { get; set; }
        public string sourceFile { get; set; }
        public string referencedConfiguration { get; set; }
        public bool fixedComponent { get; set; }
        public double[] transformArrayData { get; set; }
        public int suppressionState { get; set; }
    }

    public sealed class MateRecord
    {
        public string name { get; set; }
        public string type { get; set; }
        public int mateType { get; set; }
        public int entityCount { get; set; }
        public List<MateEntityRecord> entities { get; set; }
        public string definitionType { get; set; }
        public Dictionary<string, object> definitionValues { get; set; }
        public string readError { get; set; }
    }

    public sealed class MateEntityRecord
    {
        public int index { get; set; }
        public string referenceComponentId { get; set; }
        public string referenceComponentPath { get; set; }
        public int referenceType { get; set; }
        public int referenceType2 { get; set; }
        public double[] entityParams { get; set; }
        public string referenceRuntimeType { get; set; }
        public string referenceModelName { get; set; }
        public int referenceEntityType { get; set; }
        public string referenceSketchSegmentName { get; set; }
        public string readError { get; set; }
    }

    public sealed class PartRecord
    {
        public string componentId { get; set; }
        public string sourceFile { get; set; }
        public bool openedByTool { get; set; }
        public int openErrors { get; set; }
        public int openWarnings { get; set; }
        public List<SketchRecord> sketches { get; set; }
    }

    public sealed class SketchRecord
    {
        public string featureName { get; set; }
        public int segmentCount { get; set; }
        public double[] modelToSketchTransform { get; set; }
        public double[] sketchToModelTransform { get; set; }
        public List<SketchSegmentRecord> segments { get; set; }
        public List<SketchPathRecord> paths { get; set; }
    }

    public sealed class SketchPathRecord
    {
        public int index { get; set; }
        public int segmentCount { get; set; }
        public List<int> segmentIndexes { get; set; }
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
        public string name { get; set; }
        public double[] sketchStartPoint { get; set; }
        public double[] sketchEndPoint { get; set; }
        public int rotationDirection { get; set; }
        public bool infinite { get; set; }
    }

    public static int Main(string[] args)
    {
        if (args == null || args.Length < 2)
        {
            Console.Error.WriteLine("Usage: Cluster03OcLeftConnection.exe <Final.SLDASM> <output.json> [--new-instance] [--target <component-id>] [--target-file <file-name>] [--slug <connection-slug>]");
            return 2;
        }

        var assemblyPath = Path.GetFullPath(args[0]);
        var outputPath = Path.GetFullPath(args[1]);
        var targetId = ReadOption(args, "--target") ?? "oc_left-1";
        var targetFileName = ReadOption(args, "--target-file") ?? "oc_left.SLDPRT";
        var connectionSlug = ReadOption(args, "--slug") ?? "oc-left";
        var allowNewInstance = Array.IndexOf(args, "--new-instance") >= 0;
        ISldWorks sw = null;
        IModelDoc2 active = null;
        var ownedSession = false;
        var openedAssembly = false;
        var warnings = new List<string>();

        try
        {
            if (allowNewInstance)
            {
                sw = new SldWorksClass();
                ownedSession = true;
            }
            else
            {
                try
                {
                    sw = (ISldWorks)Marshal.GetActiveObject("SldWorks.Application");
                }
                catch (Exception ex)
                {
                    throw new InvalidOperationException("Active SolidWorks session is not available: " + ex.Message);
                }
            }

            active = sw.ActiveDoc as IModelDoc2;
            if (active == null || !PathEquals(active.GetPathName(), assemblyPath))
            {
                if (!ownedSession)
                {
                    throw new InvalidOperationException(
                        "SolidWorks active document does not match requested assembly: "
                        + (active == null ? "<none>" : active.GetPathName()));
                }

                var openErrors = 0;
                var openWarnings = 0;
                active = sw.OpenDoc6(
                    assemblyPath,
                    2,
                    1 | 2,
                    "",
                    ref openErrors,
                    ref openWarnings) as IModelDoc2;
                openedAssembly = active != null;
                if (active == null)
                    throw new InvalidOperationException(
                        "Unable to open assembly read-only. errors=" + openErrors + " warnings=" + openWarnings);
                if (openErrors != 0 || openWarnings != 0)
                    warnings.Add("Assembly opened with errors=" + openErrors + " warnings=" + openWarnings);
            }

            var assembly = active as IAssemblyDoc;
            if (assembly == null)
                throw new InvalidOperationException("Active document is not an assembly.");

            var components = ReadComponents(assembly);
            var target = FindComponent(components, targetId, targetFileName);
            if (target == null)
                throw new InvalidOperationException("Could not find " + targetId + " in the active assembly.");

            var report = new Report
            {
                schemaVersion = "cluster-03-" + connectionSlug + "-cad-connection.v1",
                generatedAtUtc = DateTime.UtcNow.ToString("o"),
                source = new SourceRecord
                {
                    assemblyPath = assemblyPath,
                    activeTitle = active.GetTitle(),
                    activePath = active.GetPathName(),
                    solidWorksRevision = SafeString(delegate { return sw.RevisionNumber(); }),
                    sessionMode = ownedSession ? "new-read-only-session" : "attached-read-only-session",
                    readOnlyIntent = true,
                    coordinateSystem = "SOLIDWORKS assembly coordinate system",
                    unitPolicy = "SolidWorks API transforms and Sketch coordinates are meters; runtime uses meters."
                },
                targetComponent = target,
                components = components,
                mates = ReadMates(active, target.id, warnings),
                parts = new List<PartRecord>(),
                warnings = warnings
            };

            var body = FindComponent(components, "body_may-1", "body_may.SLDPRT");
            if (body != null)
                report.parentComponent = body;
            else
                warnings.Add("Could not find body_may-1; parent must be resolved from mate references.");

            var uniqueParts = new Dictionary<string, ComponentRecord>(StringComparer.OrdinalIgnoreCase);
            uniqueParts[target.sourceFile] = target;
            if (body != null) uniqueParts[body.sourceFile] = body;
            foreach (var part in uniqueParts.Values)
                report.parts.Add(ReadPart(sw, part, warnings));

            Directory.CreateDirectory(Path.GetDirectoryName(outputPath));
            File.WriteAllText(outputPath, Serializer.Serialize(report), new UTF8Encoding(false));
            Console.WriteLine("CONNECTION_WRITTEN=" + outputPath);
            Console.WriteLine("TARGET=" + target.id);
            Console.WriteLine("MATES=" + report.mates.Count);
            Console.WriteLine("PARTS=" + report.parts.Count);
            Console.WriteLine("WARNINGS=" + report.warnings.Count);
            return 0;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine("CONNECTION_ERROR=" + ex);
            return 1;
        }
        finally
        {
            try
            {
                if (openedAssembly && active != null && sw != null)
                    sw.CloseDoc(active.GetTitle());
            }
            catch { }
            try
            {
                if (ownedSession && sw != null)
                    sw.ExitApp();
            }
            catch { }
        }
    }

    private static List<ComponentRecord> ReadComponents(IAssemblyDoc assembly)
    {
        var result = new List<ComponentRecord>();
        var rawComponents = assembly.GetComponents(false) as object[];
        if (rawComponents == null) return result;
        foreach (var raw in rawComponents)
        {
            var component = raw as IComponent2;
            if (component == null) continue;
            result.Add(new ComponentRecord
            {
                id = component.Name2,
                sourceFile = component.GetPathName(),
                referencedConfiguration = component.ReferencedConfiguration,
                fixedComponent = component.IsFixed(),
                suppressionState = component.GetSuppression2(),
                transformArrayData = ReadTransform(component.Transform2)
            });
        }
        return result;
    }

    private static ComponentRecord FindComponent(
        List<ComponentRecord> components,
        string id,
        string fileName)
    {
        foreach (var component in components)
        {
            if (String.Equals(component.id, id, StringComparison.OrdinalIgnoreCase))
                return component;
            if (component.sourceFile != null
                && String.Equals(Path.GetFileName(component.sourceFile), fileName, StringComparison.OrdinalIgnoreCase))
                return component;
        }
        return null;
    }

    private static List<MateRecord> ReadMates(
        IModelDoc2 model,
        string targetId,
        List<string> warnings)
    {
        var result = new List<MateRecord>();
        IFeature feature = model.FirstFeature() as IFeature;
        while (feature != null)
        {
            var type = SafeString(delegate { return feature.GetTypeName2(); });
            if (String.Equals(type, "MateGroup", StringComparison.OrdinalIgnoreCase))
            {
                IFeature sub = feature.GetFirstSubFeature() as IFeature;
                while (sub != null)
                {
                    var subType = SafeString(delegate { return sub.GetTypeName2(); });
                    if (subType != null && subType.StartsWith("Mate", StringComparison.OrdinalIgnoreCase))
                    {
                        var record = ReadMate(sub, targetId, warnings);
                        if (record != null && HasTarget(record, targetId))
                            result.Add(record);
                    }
                    sub = sub.GetNextSubFeature() as IFeature;
                }
            }
            feature = feature.GetNextFeature() as IFeature;
        }
        return result;
    }

    private static MateRecord ReadMate(IFeature feature, string targetId, List<string> warnings)
    {
        var record = new MateRecord
        {
            name = feature.Name,
            type = SafeString(delegate { return feature.GetTypeName2(); }),
            entities = new List<MateEntityRecord>()
        };
        try
        {
            var mate = feature.GetSpecificFeature2() as IMate2;
            if (mate == null)
                mate = feature.GetDefinition() as IMate2;
            if (mate == null)
            {
                record.readError = "Mate feature did not expose IMate2.";
                warnings.Add(record.name + ": " + record.readError);
                return record;
            }
            record.mateType = mate.Type;
            record.entityCount = mate.GetMateEntityCount();
            for (var index = 0; index < record.entityCount; index++)
                record.entities.Add(ReadMateEntity(mate.MateEntity(index), index));
            ReadMateDefinition(feature, record, warnings);
        }
        catch (Exception ex)
        {
            record.readError = ex.Message;
            warnings.Add(record.name + ": " + record.readError);
        }
        return record;
    }

    private static void ReadMateDefinition(
        IFeature feature,
        MateRecord record,
        List<string> warnings)
    {
        try
        {
            var definition = feature.GetDefinition();
            var screw = definition as IScrewMateFeatureData;
            if (screw != null)
            {
                record.definitionType = "IScrewMateFeatureData";
                record.definitionValues = new Dictionary<string, object>
                {
                    { "revolutionType", SafeInt(delegate { return Convert.ToInt32(screw.RevolutionType); }) },
                    { "revolutionValue", SafeDouble(delegate { return screw.RevolutionVal; }) },
                    { "reverse", SafeBool(delegate { return screw.Reverse; }) },
                    { "mateAlignment", SafeInt(delegate { return Convert.ToInt32(screw.MateAlignment); }) }
                };
                return;
            }

            var distanceMate = definition as IDistanceMateFeatureData;
            if (distanceMate != null)
            {
                record.definitionType = "IDistanceMateFeatureData";
                record.definitionValues = new Dictionary<string, object>
                {
                    { "distance", SafeDouble(delegate { return distanceMate.Distance; }) },
                    { "minimumDistance", SafeDouble(delegate { return distanceMate.MinimumDistance; }) },
                    { "maximumDistance", SafeDouble(delegate { return distanceMate.MaximumDistance; }) },
                    { "isAdvancedMate", SafeBool(delegate { return distanceMate.IsAdvancedMate; }) },
                    { "flipDimension", SafeBool(delegate { return distanceMate.FlipDimension; }) },
                    { "mateAlignment", SafeInt(delegate { return Convert.ToInt32(distanceMate.MateAlignment); }) }
                };
                return;
            }

            var angleMate = definition as IAngleMateFeatureData;
            if (angleMate != null)
            {
                record.definitionType = "IAngleMateFeatureData";
                record.definitionValues = new Dictionary<string, object>
                {
                    { "angle", SafeDouble(delegate { return angleMate.Angle; }) },
                    { "minimumAngle", SafeDouble(delegate { return angleMate.MinimumAngle; }) },
                    { "maximumAngle", SafeDouble(delegate { return angleMate.MaximumAngle; }) },
                    { "isAdvancedMate", SafeBool(delegate { return angleMate.IsAdvancedMate; }) },
                    { "flipDimension", SafeBool(delegate { return angleMate.FlipDimension; }) },
                    { "mateAlignment", SafeInt(delegate { return Convert.ToInt32(angleMate.MateAlignment); }) }
                };
                return;
            }

            var linearCoupler = definition as ILinearCouplerMateFeatureData;
            if (linearCoupler != null)
            {
                record.definitionType = "ILinearCouplerMateFeatureData";
                record.definitionValues = new Dictionary<string, object>
                {
                    { "couplerRatioNumerator", SafeDouble(delegate { return linearCoupler.CouplerRatioNumerator; }) },
                    { "couplerRatioDenominator", SafeDouble(delegate { return linearCoupler.CouplerRatioDenominator; }) },
                    { "reverse", SafeBool(delegate { return linearCoupler.Reverse; }) }
                };
                return;
            }

            var gear = definition as IGearMateFeatureData;
            if (gear != null)
            {
                record.definitionType = "IGearMateFeatureData";
                record.definitionValues = new Dictionary<string, object>
                {
                    { "gearRatioNumerator", SafeDouble(delegate { return gear.GearRatioNumerator; }) },
                    { "gearRatioDenominator", SafeDouble(delegate { return gear.GearRatioDenominator; }) },
                    { "reverse", SafeBool(delegate { return gear.Reverse; }) }
                };
                return;
            }

            var lockMate = definition as ILockMateFeatureData;
            if (lockMate != null)
            {
                record.definitionType = "ILockMateFeatureData";
                record.definitionValues = new Dictionary<string, object>();
            }
        }
        catch (Exception ex)
        {
            warnings.Add(record.name + ": mate definition read failed: " + ex.Message);
        }
    }

    private static MateEntityRecord ReadMateEntity(IMateEntity2 entity, int index)
    {
        var record = new MateEntityRecord { index = index };
        try { record.referenceType = entity.ReferenceType; } catch { }
        try { record.referenceType2 = entity.ReferenceType2; } catch { }
        try { record.entityParams = ReadArray(entity.EntityParams); } catch (Exception ex) { record.readError = ex.Message; }
        try
        {
            var component = entity.ReferenceComponent;
            if (component != null)
            {
                record.referenceComponentId = component.Name2;
                record.referenceComponentPath = component.GetPathName();
            }
        }
        catch (Exception ex) { record.readError = ex.Message; }

        try
        {
            var reference = entity.Reference;
            if (reference != null)
            {
                record.referenceRuntimeType = reference.GetType().FullName;
                var sketchSegment = reference as ISketchSegment;
                if (sketchSegment != null)
                    record.referenceSketchSegmentName = SafeString(delegate { return sketchSegment.GetName(); });
                var modelEntity = reference as IEntity;
                if (modelEntity != null)
                {
                    record.referenceModelName = SafeString(delegate { return modelEntity.ModelName; });
                    record.referenceEntityType = SafeInt(delegate { return modelEntity.GetType(); });
                }
            }
        }
        catch (Exception ex) { record.readError = ex.Message; }
        return record;
    }

    private static bool HasTarget(MateRecord mate, string targetId)
    {
        foreach (var entity in mate.entities)
            if (String.Equals(entity.referenceComponentId, targetId, StringComparison.OrdinalIgnoreCase))
                return true;
        return false;
    }

    private static PartRecord ReadPart(ISldWorks sw, ComponentRecord component, List<string> warnings)
    {
        var result = new PartRecord
        {
            componentId = component.id,
            sourceFile = component.sourceFile,
            sketches = new List<SketchRecord>()
        };
        IModelDoc2 part = null;
        var openedByTool = false;
        try
        {
            part = sw.GetOpenDocumentByName(component.sourceFile) as IModelDoc2;
            if (part == null)
            {
                var errors = 0;
                var openWarnings = 0;
                part = sw.OpenDoc6(component.sourceFile, 1, 1 | 2, "", ref errors, ref openWarnings) as IModelDoc2;
                result.openErrors = errors;
                result.openWarnings = openWarnings;
                openedByTool = part != null;
            }
            result.openedByTool = openedByTool;
            if (part == null)
            {
                warnings.Add("Unable to open part: " + component.sourceFile);
                return result;
            }

            IFeature feature = part.FirstFeature() as IFeature;
            while (feature != null)
            {
                var name = feature.Name;
                var type = SafeString(delegate { return feature.GetTypeName2(); });
                if (String.Equals(type, "ProfileFeature", StringComparison.OrdinalIgnoreCase)
                    || (name != null && name.StartsWith("Sketch", StringComparison.OrdinalIgnoreCase)))
                {
                    var sketch = feature.GetSpecificFeature2() as ISketch;
                    if (sketch != null)
                        result.sketches.Add(ReadSketch(name, sketch));
                }
                feature = feature.GetNextFeature() as IFeature;
            }
        }
        catch (Exception ex)
        {
            warnings.Add("Part read failed for " + component.sourceFile + ": " + ex.Message);
        }
        finally
        {
            try
            {
                if (openedByTool && part != null)
                    sw.CloseDoc(part.GetTitle());
            }
            catch { }
        }
        return result;
    }

    private static SketchRecord ReadSketch(string featureName, ISketch sketch)
    {
        var result = new SketchRecord
        {
            featureName = featureName,
            segments = new List<SketchSegmentRecord>(),
            paths = new List<SketchPathRecord>(),
            modelToSketchTransform = ReadTransform(sketch.ModelToSketchTransform),
            sketchToModelTransform = ReadTransform(sketch.ModelToSketchTransform.Inverse() as MathTransform)
        };
        var rawSegments = sketch.GetSketchSegments() as object[];
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
                result.segments.Add(new SketchSegmentRecord
                {
                    index = index,
                    name = SafeString(delegate { return segment.GetName(); }),
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
                    lineParams = ReadArray(curve.LineParams),
                    sketchStartPoint = ReadSketchSegmentPoint(segment, true),
                    sketchEndPoint = ReadSketchSegmentPoint(segment, false),
                    rotationDirection = ReadRotationDirection(segment),
                    infinite = ReadInfinite(segment)
                });
            }
        }
        result.segmentCount = result.segments.Count;

        try
        {
            var rawPaths = sketch.GetSketchPaths() as object[];
            if (rawPaths != null)
            {
                for (var index = 0; index < rawPaths.Length; index++)
                {
                    var path = rawPaths[index] as ISketchPath;
                    if (path == null) continue;
                    var pathRecord = new SketchPathRecord
                    {
                        index = index,
                        segmentIndexes = new List<int>()
                    };
                    var pathSegments = path.GetSketchSegments() as object[];
                    pathRecord.segmentCount = pathSegments == null ? 0 : pathSegments.Length;
                    if (pathSegments != null)
                    {
                        foreach (var raw in pathSegments)
                        {
                            var segment = raw as ISketchSegment;
                            if (segment == null) continue;
                            var name = SafeString(delegate { return segment.GetName(); });
                            var segmentIndex = FindSegmentIndex(result.segments, name);
                            pathRecord.segmentIndexes.Add(segmentIndex);
                        }
                    }
                    result.paths.Add(pathRecord);
                }
            }
        }
        catch { }
        return result;
    }

    private static int FindSegmentIndex(List<SketchSegmentRecord> segments, string name)
    {
        for (var index = 0; index < segments.Count; index++)
            if (String.Equals(segments[index].name, name, StringComparison.OrdinalIgnoreCase))
                return segments[index].index;
        return -1;
    }

    private static double[] ReadSketchSegmentPoint(ISketchSegment segment, bool start)
    {
        try
        {
            var line = segment as ISketchLine;
            if (line != null)
            {
                var point = (start ? line.GetStartPoint2() : line.GetEndPoint2()) as ISketchPoint;
                return ReadSketchPoint(point);
            }
        }
        catch { }

        try
        {
            var arc = segment as ISketchArc;
            if (arc != null)
            {
                var point = (start ? arc.GetStartPoint2() : arc.GetEndPoint2()) as ISketchPoint;
                return ReadSketchPoint(point);
            }
        }
        catch { }
        return null;
    }

    private static double[] ReadSketchPoint(ISketchPoint point)
    {
        if (point == null) return null;
        return new[] { point.X, point.Y, point.Z };
    }

    private static int ReadRotationDirection(ISketchSegment segment)
    {
        try
        {
            var arc = segment as ISketchArc;
            return arc == null ? 0 : arc.GetRotationDir();
        }
        catch { return 0; }
    }

    private static bool ReadInfinite(ISketchSegment segment)
    {
        try
        {
            var line = segment as ISketchLine;
            return line != null && line.Infinite;
        }
        catch { return false; }
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
        for (var index = 0; index < values.Length; index++)
            result[index] = Convert.ToDouble(values.GetValue(index));
        return result;
    }

    private static string SafeString(Func<string> reader)
    {
        try { return reader(); } catch { return null; }
    }

    private static string ReadOption(string[] args, string option)
    {
        for (var index = 0; index < args.Length - 1; index++)
        {
            if (String.Equals(args[index], option, StringComparison.OrdinalIgnoreCase))
                return args[index + 1];
        }
        return null;
    }

    private static int SafeInt(Func<int> reader)
    {
        try { return reader(); } catch { return 0; }
    }

    private static double SafeDouble(Func<double> reader)
    {
        try { return reader(); } catch { return 0.0; }
    }

    private static bool SafeBool(Func<bool> reader)
    {
        try { return reader(); } catch { return false; }
    }

    private static bool PathEquals(string left, string right)
    {
        return String.Equals(
            Path.GetFullPath(left ?? ""),
            Path.GetFullPath(right ?? ""),
            StringComparison.OrdinalIgnoreCase);
    }
}
