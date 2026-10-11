import {
  makeNode,
  makeLink,
  makeCurve,
  defaultSettings,
  newId,
  type Project,
  type NetworkNode,
  type NetworkLink,
} from "../types/network";
export const DEMOS = [
  "Simple Fire Network",
  "Parallel Fire Pumps",
  "High-Rise Building",
] as const;
export function createDemo(index = 0): Project {
  const curve = makeCurve();
  const nodes: NetworkNode[] = [],
    links: NetworkLink[] = [];
  const node = (
    id: string,
    name: string,
    type: NetworkNode["type"],
    x: number,
    y: number,
    elevation = 0,
    demand = 0,
  ) => {
    const n = { ...makeNode(type, { x, y }), id, name, elevation, demand };
    nodes.push(n);
    return n;
  };
  const link = (
    id: string,
    name: string,
    type: NetworkLink["type"],
    from: string,
    to: string,
    length = 20,
  ) => {
    const l = { ...makeLink(type, from, to, curve.id), id, name, length };
    links.push(l);
    return l;
  };
  const source = node(
    "SOURCE",
    index === 0 ? "خزان المياه / Water tank" : "مصدر المياه / Water source",
    index === 0 ? "tank" : "reservoir",
    60,
    260,
  );
  source.head = 10;
  node("SUCTION", "سحب / Suction", "junction", 290, 260);
  link(
    "SUCTION_PIPE",
    "خط السحب / Suction",
    "pipe",
    "SOURCE",
    "SUCTION",
    10,
  ).diameter = 200;
  node("DISCHARGE", "طرد / Discharge", "gauge", 550, 260);
  link("PUMP_1", "مضخة الحريق 01 / Fire pump", "pump", "SUCTION", "DISCHARGE");
  if (index === 1) {
    link(
      "PUMP_2",
      "مضخة الحريق 02 / Fire pump",
      "pump",
      "SUCTION",
      "DISCHARGE",
    );
    curve.points = [
      { flow: 0, head: 100 },
      { flow: 20, head: 85 },
      { flow: 40, head: 50 },
    ];
  }
  if (index === 2) {
    curve.points = [
      { flow: 0, head: 145 },
      { flow: 30, head: 125 },
      { flow: 60, head: 80 },
    ];
    links.find((l) => l.id === "PUMP_1")!.ratedHead = 125;
    links.find((l) => l.id === "PUMP_1")!.ratedFlow = 30;
  }
  node("PRV_IN", "قبل PRV / PRV inlet", "gauge", 800, 260);
  link(
    "MAIN",
    "الخط الرئيسي / Main",
    "pipe",
    "DISCHARGE",
    "PRV_IN",
    60,
  ).diameter = 150;
  node("PRV_OUT", "بعد PRV / PRV outlet", "gauge", 1050, 260);
  const prv = link("PRV_1", "مخفض الضغط / PRV", "prv", "PRV_IN", "PRV_OUT");
  prv.setting = index === 2 ? 115 : 65;
  node("ZONE", "المنطقة A / Zone A", "junction", 1300, 260);
  const zcv = link(
    "ZCV_1",
    "مجموعة محابس المنطقة / ZCV",
    "zcv",
    "PRV_OUT",
    "ZONE",
    2,
  );
  zcv.zone = "A";
  zcv.flowMeter = true;
  zcv.minorLoss = 2;
  const floors = index === 2 ? 10 : 3;
  for (let i = 0; i < floors; i++) {
    const elev = index === 2 ? i * 7 : i * 5;
    const x = 1560 + (index === 2 ? Math.floor(i / 5) * 300 : 0),
      y = 80 + (i % (index === 2 ? 5 : 3)) * 175;
    const floor = node(
      `FLOOR_${i}`,
      i === 0
        ? "الدور الأرضي / Ground"
        : i === floors - 1
          ? "أعلى مستوى / Roof"
          : `الدور ${i} / Floor ${i}`,
      "floor",
      x,
      y,
      elev,
      index === 2 ? 2 : 5,
    );
    floor.zone = i < 5 ? "A" : "Tower";
    link(
      `BRANCH_${i}`,
      `فرع الدور ${i} / Branch ${i}`,
      "pipe",
      i === 0 ? "ZONE" : `RISER_${i - 1}`,
      floor.id,
      25,
    ).diameter = 100;
    if (i < floors - 1) {
      node(
        `RISER_${i}`,
        `صاعد ${i} / Riser ${i}`,
        "junction",
        1430 + Math.floor(i / 5) * 300,
        140 + (i % 5) * 175,
        elev,
        0,
      );
      link(
        `RISER_PIPE_${i}`,
        `صاعد ${i} / Riser ${i}`,
        "pipe",
        i === 0 ? "ZONE" : `RISER_${i - 1}`,
        `RISER_${i}`,
        Math.max(7, index === 2 ? 7 : 5),
      ).diameter = 150;
    }
  }
  if (index === 2) {
    nodes.find((n) => n.id === "FLOOR_0")!.fieldPressureBar = 11.5;
    nodes.find((n) => n.id === "FLOOR_9")!.fieldPressureBar = 6.6;
  }
  const placement: Record<string, { x: number; y: number }> = {
    SOURCE: { x: 30, y: 80 },
    SUCTION: { x: 285, y: 80 },
    DISCHARGE: { x: 540, y: 80 },
    PRV_IN: { x: 795, y: 80 },
    PRV_OUT: { x: 795, y: 320 },
    ZONE: { x: 540, y: 320 },
  };
  for (const n of nodes) {
    if (placement[n.id]) n.position = placement[n.id];
    else if (n.id.startsWith("FLOOR_")) {
      const i = Number(n.id.split("_")[1]);
      n.position = {
        x: index === 2 && i >= 5 ? 1120 : 30,
        y: 310 + (i % (index === 2 ? 5 : 3)) * 170,
      };
    } else if (n.id.startsWith("RISER_")) {
      const i = Number(n.id.split("_")[1]);
      n.position = {
        x: index === 2 && i >= 5 ? 1010 : 285,
        y: 410 + (i % (index === 2 ? 5 : 3)) * 170,
      };
    }
  }
  const now = new Date().toISOString();
  return {
    schemaVersion: 1,
    id: newId("P"),
    name: DEMOS[index] ?? DEMOS[0],
    createdAt: now,
    updatedAt: now,
    nodes,
    links,
    pumpCurves: [curve],
    settings: { ...defaultSettings, highPressureBar: 14 },
    scenarios: [],
    lastResult: null,
  };
}
export function emptyProject(): Project {
  const now = new Date().toISOString();
  return {
    schemaVersion: 1,
    id: newId("P"),
    name: "مشروع جديد / New project",
    createdAt: now,
    updatedAt: now,
    nodes: [],
    links: [],
    pumpCurves: [],
    settings: { ...defaultSettings },
    scenarios: [],
    lastResult: null,
  };
}
