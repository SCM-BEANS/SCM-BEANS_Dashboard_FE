"use client";

import Image from "next/image";
import { useRef } from "react";
import { DoloresButton, DoloresPanel, DoloresPanelTitle } from "./DoloresUI";
import styles from "./DoloresMachineModel.module.css";

export type MachineView = "Angle" | "Front";

export function DoloresMachineModelPanel({ view, onToggle, onFront, onAngle }: { view: MachineView; onToggle: () => void; onFront: () => void; onAngle: () => void }) {
  return <DoloresPanel className={styles.panel}>
    <DoloresPanelTitle>Góc nhìn máy Smart IoT / minh họa thiết bị</DoloresPanelTitle>
    <div className={styles.layout}>
      <div className={styles.info}>
        <h3>S-018 · Smart IoT</h3>
        <p>Kết nối gần nhất: 01/10/2026 · 09:42</p>
        <p>Bấm hoặc kéo trên mô hình để đổi góc nhìn.</p>
        <div className={styles.buttons}>
          <DoloresButton variant="secondary" className="w-[180.2px]" onClick={onFront}>Góc nhìn phía trước</DoloresButton>
          <DoloresButton variant="secondary" className="w-[156.8px]" onClick={onAngle}>Góc nhìn nghiêng</DoloresButton>
        </div>
      </div>
      <DoloresMachineModel view={view} onToggle={onToggle} />
    </div>
  </DoloresPanel>;
}

export function DoloresMachineModel({ view, onToggle }: { view: MachineView; onToggle: () => void }) {
  const gesture = useRef<{ x: number; dragged: boolean } | null>(null);
  return <div className={styles.viewport}>
    <button type="button" className={styles.graphic} data-view={view} aria-label={view === "Angle" ? "Đổi sang góc nhìn phía trước" : "Đổi sang góc nhìn nghiêng"} onClick={event => { if (event.detail === 0 || !gesture.current?.dragged) onToggle(); }} onPointerDown={event => { gesture.current = { x: event.clientX, dragged: false }; event.currentTarget.setPointerCapture(event.pointerId); }} onPointerMove={event => { if (gesture.current && Math.abs(event.clientX - gesture.current.x) > 8) gesture.current.dragged = true; }} onPointerUp={() => { if (gesture.current?.dragged) onToggle(); }} onPointerCancel={() => { gesture.current = null; }}>
      <Image className={styles.groundShadow} src="/images/dolores-machine/9e19c.svg" width={254} height={25} alt="" />
      <Image className={styles.topBevel} src="/images/dolores-machine/a267d.svg" width={262} height={45} alt="" />
      <Image className={styles.depthFace} src="/images/dolores-machine/7f4ed.svg" width={48} height={292} alt="" />
      <div className={styles.front}>
        <div className="absolute left-[34px] top-[68px] h-[292px] w-[214px] rounded-[18px] border border-[#E0D1BF] bg-[#F2EBE0]" />
        <div className="absolute left-[54px] top-[91px] h-[78px] w-[174px] rounded-[11px] bg-[#E8DED1]" />
        <div className="absolute left-[69px] top-[104px] h-[48px] w-[144px] rounded-[7px] bg-[#262E2E]" />
        <Image className="absolute left-[81px] top-[117px]" src="/images/dolores-machine/ed3a1.svg" width={8} height={8} alt="" />
        <p className="absolute left-[96px] top-[113px] h-[14px] w-[105px] text-left text-[9px] font-semibold leading-[normal] text-white">SMART COFFEE</p>
        <p className="absolute left-[96px] top-[129px] h-[12px] w-[105px] text-left text-[8px] leading-[normal] text-[#C9D6CF]">Đang hoạt động</p>
        <div className="absolute left-[95px] top-[179px] h-[22px] w-[91px] rounded-[11px] bg-[#B81724]" />
        <p className="absolute left-[112px] top-[182px] h-[18px] w-[18px] text-left text-xs font-semibold leading-[normal] text-white">D</p>
        <p className="absolute left-[132px] top-[184px] h-[15px] w-[49px] text-left text-[10px] font-semibold leading-[normal] text-white">Dolores</p>
        <div className="absolute left-[61px] top-[218px] h-[91px] w-[159px] rounded-[12px] bg-[#E0D6C9]" />
        <div className="absolute left-[77px] top-[228px] h-[61px] w-[126px] rounded-[9px] bg-[#403D38]" />
        <div className="absolute left-[132px] top-[230px] h-[28px] w-[18px] rounded-[4px] bg-[#A8A39C]" />
        <div className="absolute left-[137px] top-[252px] h-[20px] w-[8px] rounded-[2px] bg-[#383633]" />
        <div className="absolute left-[121px] top-[268px] h-[32px] w-[42px] rounded-[5px] border border-[#DED6CC] bg-white" />
        <div className="absolute left-[118px] top-[266px] h-[5px] w-[48px] rounded-[2px] border border-[#DED6CC] bg-white" />
        <div className="absolute left-[69px] top-[314px] h-[11px] w-[143px] rounded-[4px] bg-[#A8A39C]" />
        <div className="absolute left-[78px] top-[327px] h-[5px] w-[125px] rounded-[2px] bg-[#CCAD94]" />
        <div className="absolute left-[92px] top-[340px] h-[3px] w-[8px] rounded-[1px] bg-[#91877D]" />
        <div className="absolute left-[109px] top-[340px] h-[3px] w-[8px] rounded-[1px] bg-[#91877D]" />
        <div className="absolute left-[126px] top-[340px] h-[3px] w-[8px] rounded-[1px] bg-[#91877D]" />
        <div className="absolute left-[143px] top-[340px] h-[3px] w-[8px] rounded-[1px] bg-[#91877D]" />
        <div className="absolute left-[160px] top-[340px] h-[3px] w-[8px] rounded-[1px] bg-[#91877D]" />
        <div className="absolute left-[177px] top-[340px] h-[3px] w-[8px] rounded-[1px] bg-[#91877D]" />
        <div className="absolute left-[49px] top-[358px] h-[11px] w-[174px] rounded-[4px] bg-[#383633]" />
      </div>
      <Image className={styles.sideLight} src="/images/dolores-machine/5089f.svg" width={9} height={9} alt="" />
      <div className={styles.sidePanel} />
    </button>
  </div>;
}
