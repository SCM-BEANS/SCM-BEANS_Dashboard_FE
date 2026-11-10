import { BodyModelViewer } from "./BodyModelViewer";
import {
  CLUSTER_03_MODEL_URLS,
  CLUSTER_03_MOTION_URLS,
  CLUSTER_03_ROOT_FRAME_URL,
} from "./digital-twin-model-config";

export function MachineDigitalTwinView() {
  return (
    <BodyModelViewer
      enableOperationTest
      enableCoffeeEffect
      enableWaterEffect
      includeCompressorMotion
      compressorModelUrls={CLUSTER_03_MODEL_URLS}
      compressorRootFrameUrl={CLUSTER_03_ROOT_FRAME_URL}
      compressorMotionDefinitionUrls={CLUSTER_03_MOTION_URLS}
    />
  );
}
