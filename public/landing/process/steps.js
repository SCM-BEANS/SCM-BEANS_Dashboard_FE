// One cup, told from the control board. The order follows plans/landing-process-scroll.md (defaults P1–P5,
// to be confirmed against the firmware). Compressor phases come from landing/motion/cycle.js.

export const LANES = [
  { id: "nuoc", label: "Nước" }, { id: "nhiet", label: "Nhiệt" }, { id: "xay", label: "Xay" },
  { id: "nen", label: "Nén" }, { id: "chiet", label: "Chiết xuất" }, { id: "sua", label: "Sữa" }, { id: "ba", label: "Bã" }
];

// Signals have a direction: commands go out from the board (red), sensor readings come back (blue).
export const SIGNAL_COLORS = { out: "#b81724", in: "#2a78d6" };

// Blocks of the dolores_v3.28 board, from the board twin (twin.html BLOCKS), grouped by role:
// what the board reads on the left, what it drives on the right.
export const BOARD_BLOCKS = [
  { id: "u2", side: "in", title: "Màn hình", part: "USART2 · CP2102N" },
  { id: "ntc", side: "in", title: "Đo nhiệt", part: "NTC · ADC1" },
  { id: "flow", side: "in", title: "Đo nước", part: "TIM13/14" },
  { id: "zcd", side: "in", title: "Đồng bộ", part: "EXTI0" },
  { id: "heat", side: "out", title: "Gia nhiệt", part: "MOC3041 + BTA24" },
  { id: "pump", side: "out", title: "Bơm nước", part: "TRIAC · TIM12" },
  { id: "relay", side: "out", title: "Van", part: "ULN2803 · 24 V" },
  { id: "m12", side: "out", title: "Truyền động", part: "BTN8960" },
  { id: "m34", side: "out", title: "Truyền động", part: "BTN8960" },
  { id: "u4", side: "out", title: "Rót sữa", part: "UART4" }
];

// Channel pin names/numbers follow twin.html's firmware PINS table, not copper routes from a PCB schematic.
// The grinder uses the mapped rotary unit; the compressor's MCU pins are not confirmed, so they stay labelled unknown.
export function processChannels(brain) {
  const base = new Map(brain.channels.map(channel => [channel.id, channel]));
  const from = (id, extra) => ({ ...base.get(id), ...extra, color: SIGNAL_COLORS[extra.dir], speed: extra.dir === "in" ? -1.3 : 1.3 });
  const channels = [
    from("hmi", { id: "hmi-in", dir: "in", title: "Lệnh từ màn hình", blocks: { u2: { dir: "in", label: "Nhận lệnh", pin: "PD6 (#87) · USART2 RX" } } }),
    from("hmi", { id: "hmi-out", dir: "out", title: "Trạng thái gửi lên màn hình", blocks: { u2: { dir: "out", label: "Gửi trạng thái", pin: "PD5 (#86) · USART2 TX" } } }),
    from("pump", { dir: "out", blocks: { pump: { dir: "out", label: "Bơm nước", pin: "PB15 (#54) · TRIAC4" }, zcd: { dir: "in", label: "Đồng bộ", pin: "PB0 (#35) · AC_DECT" } } }),
    from("flow", { dir: "in", blocks: { flow: { dir: "in", label: "Lưu lượng", pin: "PA7 #32 FLOW_IN · PA6 #31 FLOW_OUT" } } }),
    from("heat", { dir: "out", title: "Gia nhiệt boiler", blocks: { heat: { dir: "out", label: "Gia nhiệt", pin: "PE6 (#5) · TRIAC2" }, zcd: { dir: "in", label: "Đồng bộ", pin: "PB0 (#35) · AC_DECT" } } }),
    { ...base.get("heat"), id: "heat-sense", dir: "in", title: "Nhiệt độ boiler báo về", signals: "NTC0 · PC0 · ADC1_IN10 · NTC 50K β3950",
      target: "boiler", color: SIGNAL_COLORS.in, speed: -1.3, blocks: { ntc: { dir: "in", label: "Nhiệt boiler", pin: "PC0 (#15) · NTC0" } } },
    from("grind", { dir: "out", target: "mayxoay", cluster: "xoay", blocks: { m34: { dir: "out", label: "Xay và định lượng", pin: "PA2 (#25) · PA3 (#26) · PA4 (#29)" } } }),
    { id: "compressor", group: "Chuyển động", title: "Motor máy nén", target: "maynen", cluster: "nen", dir: "out",
      signals: "Hai motor: truyền động chính và truyền động nén. Chân trên bo mạch chưa xác nhận.",
      color: SIGNAL_COLORS.out, speed: 1.3, blocks: {
        m12: { dir: "out", label: "Máy nén", pin: "Chân MCU chưa xác nhận" },
        m34: { dir: "out", label: "Máy nén", pin: "Chân MCU chưa xác nhận" }
      } },
    from("relay", { dir: "out", blocks: { relay: { dir: "out", label: "Van", pin: "PD13 (#60) · PD14 (#61) · PC8 (#65) · PC9 (#66)" } } }),
    from("outlet", { dir: "in", title: "Nhiệt độ cà phê đầu ra", blocks: { ntc: { dir: "in", label: "Nhiệt cà phê", pin: "PC2 (#17) · NTC2" } } }),
    from("milk", { dir: "out", blocks: { u4: { dir: "out", label: "Module sữa", pin: "PC10 (#78) · UART4 TX" } } })
  ];
  return { ...brain, channels };
}

// The control board stays on screen in every step (BOARD); focus lists the clusters at work beside it.
export const BOARD = ["pcb-control"];

// Key terms in the step text: [label|part on screen|board blocks joined by +|out or in]. Hovering or tapping a term
// lights that part and those blocks; out/in colours the term like the signal (command or reading).

// shot: the camera direction (az/el in the machine frame); the distance fits the parts shown in that step.
// The view sweeps once from the board at the back (170 degrees) to 70 degrees, where the board is still unblocked
// (measured: from 40-50 degrees the milk module hid 81% of it), then the last step pulls back to the front.
// compressor: the slice of the cycle that plays (by phase index) or the phase whose pose is held.
export const CHAPTERS = [
  { title: "Chuẩn bị", steps: [0, 1, 2] },
  { title: "Pha và hoàn tất", steps: [3, 4, 5, 6, 7] }
];

export const STEPS = [
  {
    title: "Nhận lệnh",
    flow: { input: "Nhận lệnh pha", process: "Đọc lệnh" },
    text: "Mọi thao tác đều bắt đầu từ [bo điều khiển|pcb-control||]. Khách chọn món trên [màn hình|redmi|u2|in], lệnh đi xuống bo mạch.",
    channels: ["hmi-in"], focus: ["hmi"], parts: ["redmi"], focusParts: ["redmi"], lanes: [],
    shot: { parts: ["redmi"], az: 30, el: 18, distance: 2.6, context: .3 }, compressor: { hold: 0 }
  },
  {
    title: "Bơm nước và giữ nhiệt",
    flow: { input: "Đọc nhiệt và nước", process: "Điều chỉnh" },
    text: "Bo mạch bật [bơm Ulka|ulka|pump|out] và đếm nước qua [lưu lượng kế|flowmeter|flow|in]. [Boiler|boiler|heat|out] được giữ nhiệt theo vòng kín: bo mạch gia nhiệt, [cảm biến nhiệt|boiler|ntc|in] báo nhiệt độ về, bo mạch chỉnh lại.",
    // Only the parts on the water path stay solid: the heater brackets otherwise hide about 40% of the boiler.
    channels: ["pump", "flow", "heat", "heat-sense"], focus: ["nuoc", "nhiet"], parts: ["boiler"], lanes: ["nuoc", "nhiet"], flows: ["water"],
    focusParts: ["binhnuoc", "ulka", "flowmeter", "boiler"],
    shot: { parts: ["boiler"], az: 115, el: 30, distance: 2.8, context: .4 }, compressor: { hold: 0 }
  },
  {
    title: "Xay và định lượng",
    flow: { process: "Định lượng" },
    text: "[Cối xay|mayxoay|m34|out] chạy, bột được định lượng cho một ly. [Boiler||heat|out] vẫn giữ nhiệt cùng lúc, nhờ [cảm biến nhiệt||ntc|in] báo về.",
    // The bean hopper sits over the rotary unit and would hide two thirds of it, so it fades here.
    channels: ["grind", "heat", "heat-sense"], focus: ["xoay"], parts: ["mayxoay"], lanes: ["nhiet", "xay"],
    shot: { parts: ["mayxoay"], az: 98, el: 28, distance: 2.8, context: .4 }, compressor: { hold: 0 }
  },
  {
    title: "Đóng buồng và nén",
    flow: { process: "Phối hợp motor", actions: [{ title: "Đóng buồng", pins: "Chân MCU chưa xác nhận" }, { title: "Nén bột", pins: "Chân MCU chưa xác nhận" }] },
    text: "Bo mạch chạy hai motor của [máy nén|compressor|m12+m34|out]: buồng đóng lại rồi đầu nén ép bột.",
    channels: ["compressor", "heat", "heat-sense"], focus: ["nen"], parts: ["compressor"], lanes: ["nhiet", "nen"],
    shot: { parts: ["maynen"], az: 88, el: 20, distance: 2.6, context: .3 }, compressor: { play: [2, 3] }
  },
  {
    title: "Chiết xuất",
    flow: { input: "Đọc cảm biến", process: "Điều tiết chiết xuất" },
    text: "[Bơm||pump|out] đẩy nước nóng qua bột, [van||relay|out] mở đường ra, [lưu lượng kế||flow|in] và [cảm biến nhiệt đầu ra|heracafe|ntc|in] theo dõi ly cà phê.",
    channels: ["pump", "relay", "flow", "outlet", "heat", "heat-sense"], focus: ["nen", "racafe", "nhiet"], parts: ["heracafe"], lanes: ["nuoc", "nhiet", "chiet"], flows: ["hot", "coffee"],
    shot: { parts: ["heracafe"], az: 80, el: 16, distance: 2.8, context: .4 }, compressor: { hold: 4 }
  },
  {
    title: "Rót sữa",
    flow: { input: "Nhận lệnh rót sữa", process: "Gửi lệnh UART4" },
    text: "Bo mạch gửi lệnh qua UART tới [module sữa|modulesua|u4|out], sữa được rót vào ly.",
    channels: ["milk"], focus: ["sua", "racafe"], parts: ["modulesua"], lanes: ["sua"], flows: ["milk"],
    shot: { parts: ["modulesua"], az: 74, el: 16, distance: 2.8, context: .4 }, compressor: { hold: 4 }
  },
  {
    title: "Mở buồng, đẩy bã và gạt",
    flow: { input: "Kết thúc chiết xuất", process: "Phối hợp motor", actions: [{ title: "Mở buồng", pins: "Chân MCU chưa xác nhận" }, { title: "Đẩy bã", pins: "Chân MCU chưa xác nhận" }, { title: "Gạt bã", pins: "Chân MCU chưa xác nhận" }] },
    text: "[Máy nén|compressor|m12+m34|out] mở ra, đẩy bã xuống [thùng bã|thungba||] rồi gạt sạch, sẵn sàng cho ly sau.",
    channels: ["compressor"], focus: ["nen", "ba"], parts: ["compressor"], lanes: ["nen", "ba"],
    shot: { parts: ["maynen"], az: 70, el: 20, distance: 2.6, context: .3 }, compressor: { play: [5, 7] }
  },
  {
    title: "Báo trạng thái",
    flow: { input: "Trạng thái máy", process: "Tổng hợp trạng thái" },
    text: "Mỗi bước đều được báo về [màn hình|redmi|u2|out] và lên nền tảng Dolores, để bạn nắm tình hình máy.",
    // The story ends on the whole red machine, with the screen outlined.
    channels: ["hmi-out"], focus: ["hmi"], parts: ["redmi"], lanes: [], whole: true,
    shot: { parts: ["redmi"], az: 30, el: 16, distance: 3, context: .4 }, compressor: { hold: 0 }
  }
];
