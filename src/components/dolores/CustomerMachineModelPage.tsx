"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DoloresPage } from "./DoloresShell";
import { DoloresButton } from "./DoloresUI";
import { DoloresMachineModelPanel, type MachineView } from "./DoloresMachineModel";

const MODEL_PATH = "/dashboard/machines/S-018/model";

export function CustomerMachineModelPage({ initialView }: { initialView?: string }) {
  const router = useRouter();
  const [view, setView] = useState<MachineView>(initialView === "front" ? "Front" : "Angle");
  useEffect(() => { setView(initialView === "front" ? "Front" : "Angle"); }, [initialView]);
  return <DoloresPage title="Mô hình máy Smart IoT" description="Theo dõi thông tin và thực hiện yêu cầu của cửa hàng." actions={<>
    <DoloresButton href="/dashboard/machines/S-018?view=monitoring" className="w-[188px]">Xem dữ liệu vận hành</DoloresButton>
    <DoloresButton href="/dashboard/machines" variant="secondary" className="w-[141.2px]">Về máy của tôi</DoloresButton>
  </>}>
    <DoloresMachineModelPanel view={view} onToggle={() => setView(current => current === "Angle" ? "Front" : "Angle")} onFront={() => router.push(`${MODEL_PATH}?view=front`)} onAngle={() => router.push(MODEL_PATH)} />
  </DoloresPage>;
}
