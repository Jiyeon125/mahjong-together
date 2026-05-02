import type { FilterType } from "../types";

type FilterTabsProps = {
  value: FilterType;
  onChange: (filter: FilterType) => void;
};

const FILTERS: { key: FilterType; label: string }[] = [
  { key: "ALL", label: "전체" },
  { key: "THREE", label: "3인" },
  { key: "FOUR", label: "4인" },
  { key: "ANY", label: "상관없음" },
  { key: "RECRUITING", label: "모집 중" },
  { key: "READY", label: "시작 가능" },
];

export function FilterTabs({ value, onChange }: FilterTabsProps) {
  return (
    <div className="filter-tabs">
      {FILTERS.map((filter) => (
        <button
          key={filter.key}
          type="button"
          className={`filter-btn ${value === filter.key ? "active" : ""}`}
          onClick={() => onChange(filter.key)}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
}
