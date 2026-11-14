import { TableFilters } from "@/components/table/table-filters";
import { MachineStatusSchema } from "@/schema/machines.schema";
import { MACHINE_STATUS_LABELS } from "./machine-status-labels";

export type MachineListFilterValue = { search: string; status: string; connection: string };

export function MachineListFilters({ value, onChange, onSubmit, connection = false }: {
  value: MachineListFilterValue;
  onChange: (value: MachineListFilterValue) => void;
  onSubmit: () => void;
  connection?: boolean;
}) {
  return <TableFilters search={{ ariaLabel: "Tìm máy", placeholder: "Tìm serial hoặc mẫu máy", value: value.search, maxLength: 160, onChange: (search) => onChange({ ...value, search }) }}
    selects={[
      { id: "machine-deployment", ariaLabel: "Trạng thái triển khai", value: value.status, onChange: (status) => onChange({ ...value, status }), options: [{ value: "", label: "Tất cả trạng thái" }, ...MachineStatusSchema.options.map((status) => ({ value: status, label: MACHINE_STATUS_LABELS[status] }))] },
      ...(connection ? [{ id: "machine-connection", ariaLabel: "Trạng thái kết nối", value: value.connection, onChange: (state: string) => onChange({ ...value, connection: state }), options: [{ value: "", label: "Tất cả kết nối" }, { value: "ONLINE", label: "Đang kết nối" }, { value: "OFFLINE", label: "Mất kết nối" }, { value: "UNKNOWN", label: "Chưa rõ" }, { value: "error", label: "Không tải được" }] }] : []),
    ]} submitLabel="Tìm kiếm" onSubmit={(event) => { event.preventDefault(); onSubmit(); }} />;
}
