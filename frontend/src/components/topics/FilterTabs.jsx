/* eslint-disable react/prop-types */
const TABS = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'completed', label: 'Completed' },
  { id: 'pending', label: 'Pending' },
]

function FilterTabs({ activeTab, counts, onChange }) {
  return (
    <div className="topics-tabs" role="tablist" aria-label="Topic filters">
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id
        const count = counts?.[tab.id] ?? 0
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`topics-tab ${isActive ? 'active' : ''}`}
            onClick={() => onChange(tab.id)}
          >
            <span>{tab.label}</span>
            <span className={`topics-tab-count ${isActive ? 'active' : ''}`}>{count}</span>
          </button>
        )
      })}
    </div>
  )
}

export default FilterTabs
