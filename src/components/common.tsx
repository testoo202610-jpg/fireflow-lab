import {
  Component,
  useId,
  cloneElement,
  isValidElement,
  type ReactNode,
} from "react";
import {
  Gauge,
  Droplets,
  Building2,
  CircleDot,
  Waves,
  GitBranch,
  Wind,
  SlidersHorizontal,
  ShieldCheck,
  Activity,
  ArrowRightLeft,
  Disc3,
  Power,
  Flame,
  type LucideIcon,
} from "lucide-react";
import type { NetworkNode, NetworkLink } from "../types/network";
export const icons: Record<
  NetworkNode["type"] | NetworkLink["type"] | "flowMeter",
  LucideIcon
> = {
  tank: Waves,
  reservoir: Droplets,
  junction: CircleDot,
  demand: Flame,
  gauge: Gauge,
  floor: Building2,
  pipe: GitBranch,
  pump: Wind,
  prv: SlidersHorizontal,
  zcv: ShieldCheck,
  gate: Power,
  butterfly: Disc3,
  check: ArrowRightLeft,
  isolation: Power,
  flowMeter: Activity,
};
export function Icon({
  type,
  size = 18,
}: {
  type: keyof typeof icons;
  size?: number;
}) {
  const I = icons[type];
  return <I size={size} />;
}
export function Field({
  label,
  unit,
  children,
}: {
  label: string;
  unit?: string;
  children: ReactNode;
}) {
  const uid = useId();
  const control = isValidElement<{ id?: string; "aria-label"?: string }>(
    children,
  )
    ? cloneElement(children, { id: uid, "aria-label": label })
    : children;
  return (
    <label className="field" htmlFor={uid}>
      <span>
        {label}
        {unit && <em dir="ltr">{unit}</em>}
      </span>
      {control}
    </label>
  );
}
export function NumberField({
  label,
  value,
  unit,
  onChange,
  min,
}: {
  label: string;
  value: number;
  unit?: string;
  onChange: (n: number) => void;
  min?: number;
}) {
  return (
    <Field label={label} unit={unit}>
      <input
        type="number"
        step="any"
        min={min}
        value={Number.isFinite(value) ? Number(value.toFixed(6)) : 0}
        onChange={(e) => {
          const n = e.currentTarget.valueAsNumber;
          if (Number.isFinite(n)) onChange(n);
        }}
        dir="ltr"
      />
    </Field>
  );
}
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: string }
> {
  state = { error: "" };
  static getDerivedStateFromError(e: Error) {
    return { error: e.message };
  }
  render() {
    return this.state.error ? (
      <main className="fatal">
        <h1>FireFlow Lab</h1>
        <p>{this.state.error}</p>
        <button onClick={() => window.location.reload()}>
          Reload / إعادة التحميل
        </button>
      </main>
    ) : (
      this.props.children
    );
  }
}
