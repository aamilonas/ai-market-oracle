import { CATEGORY_LABELS, CATEGORY_COLORS } from '../data/useData'
import styles from './CategoryTabs.module.css'

export default function CategoryTabs({ categories, active, onChange, showAll = true }) {
  return (
    <div className={styles.tabs}>
      {showAll && (
        <button
          className={[styles.tab, active === 'all' ? styles.active : ''].join(' ')}
          onClick={() => onChange('all')}
        >
          All
        </button>
      )}
      {categories.map(cat => (
        <button
          key={cat}
          className={[styles.tab, active === cat ? styles.active : ''].join(' ')}
          style={active === cat ? { borderColor: CATEGORY_COLORS[cat], color: CATEGORY_COLORS[cat] } : {}}
          onClick={() => onChange(cat)}
        >
          {CATEGORY_LABELS[cat] || cat}
        </button>
      ))}
    </div>
  )
}
