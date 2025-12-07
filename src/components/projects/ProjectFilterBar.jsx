import { useState, useEffect } from "react";
import { Filter, ChevronDown, CheckCircle } from "lucide-react";

export const filterOptions = [
  { key: "all", label: "すべて" }, // 「すべて」フィルターを追加
  { key: "in-progress", label: "進行中" },
  { key: "リード", label: "リード" }, // リードを個別フィルターとして追加
  { key: "打ち合わせ中", label: "打ち合わせ中" },
  { key: "受注済み", label: "受注済み" },
  { key: "国際発注済", label: "国際発注済" },
  { key: "設置手配済", label: "設置手配済" },
  { key: "設置完了", label: "設置完了" },
  { key: "残金請求済", label: "残金請求済" },
  { key: "trouble", label: "トラブル" },
];

export const ProjectFilterBar = ({ selectedFilter, onFilterSelect }) => {
  const [showMobileFilterDropdown, setShowMobileFilterDropdown] =
    useState(false);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        showMobileFilterDropdown &&
        !event.target.closest(".filter-dropdown")
      ) {
        setShowMobileFilterDropdown(false);
      }
    };

    if (showMobileFilterDropdown) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [showMobileFilterDropdown]);

  const handleFilterSelect = (filterKey) => {
    onFilterSelect(filterKey);
    setShowMobileFilterDropdown(false);
  };

  const getCurrentFilterLabel = () => {
    const currentFilter = filterOptions.find((f) => f.key === selectedFilter);
    return currentFilter ? currentFilter.label : "進行中";
  };

  return (
    <div className="px-4 lg:pl-24 mb-4 lg:mb-6">
      {/* Mobile filter dropdown */}
      <div className="lg:hidden relative mb-3 filter-dropdown">
        <button
          onClick={() => setShowMobileFilterDropdown(!showMobileFilterDropdown)}
          className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <span>フィルター: {getCurrentFilterLabel()}</span>
          </div>
          <ChevronDown
            className={`h-4 w-4 text-gray-500 transition-transform ${
              showMobileFilterDropdown ? "rotate-180" : ""
            }`}
          />
        </button>

        {showMobileFilterDropdown && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-30">
            {filterOptions.map((filter) => (
              <button
                key={filter.key}
                onClick={() => handleFilterSelect(filter.key)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-gray-50 ${
                  selectedFilter === filter.key
                    ? "text-blue-700 bg-blue-50"
                    : "text-gray-600"
                }`}
              >
                <Filter className="h-4 w-4 opacity-60" />
                <span>{filter.label}</span>
                {selectedFilter === filter.key && (
                  <CheckCircle className="h-4 w-4 ml-auto text-blue-600" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Desktop filter buttons */}
      <div className="hidden lg:block">
        <div className="flex items-center gap-4 mb-2">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-500">フィルター:</span>
          </div>
        </div>
        <div className="flex gap-4">
          {filterOptions.map((filter) => (
            <button
              key={filter.key}
              onClick={() => handleFilterSelect(filter.key)}
              className={`px-3 py-2 rounded-lg text-sm font-medium border ${
                selectedFilter === filter.key
                  ? "bg-blue-100 text-blue-700 border-blue-200"
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};



