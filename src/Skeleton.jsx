// Grey placeholders shaped like the content that is loading (styles in .skel)

export function RecipeListSkeleton({ count = 5 }) {
  return (
    <ul className="recipe-cards skel-wrap" aria-busy="true" aria-label="Loading recipes">
      {Array.from({ length: count }, (_, n) => (
        <li key={n} className="recipe-card">
          <div className="skel-card">
            <span className="skel thumb" />
            <span className="card-text">
              <span className="skel title" style={{ width: `${55 + ((n * 17) % 35)}%` }} />
              <span className="skel line short" />
              <span className="skel line" style={{ width: `${30 + ((n * 11) % 25)}%` }} />
            </span>
          </div>
        </li>
      ))}
    </ul>
  )
}

/** The whole Recipes screen while the app starts. */
export function StartSkeleton() {
  return (
    <main className="boot skel-wrap" aria-busy="true">
      <header className="main-header">
        <span className="skel h1" style={{ width: '45%' }} />
      </header>
      <RecipeListSkeleton />
    </main>
  )
}

/** A recipe page: picture, title, the numbers row, the buttons and the ingredients. */
export function RecipePageSkeleton() {
  return (
    <main className="skel-wrap" aria-busy="true" aria-label="Loading the recipe">
      <div className="topbar">
        <span className="skel line" style={{ width: 90 }} />
      </div>
      <span className="skel hero" />
      <span className="skel h1" />
      <span className="skel line short" />
      <div className="stats">
        {[0, 1, 2, 3].map((n) => (
          <div key={n} className="stat">
            <span className="skel title" style={{ width: 40, height: 16 }} />
            <span className="skel line" style={{ width: 50, height: 8 }} />
          </div>
        ))}
      </div>
      <div className="recipe-actions">
        <span className="skel button" />
        <span className="skel button" />
      </div>
      <section className="card" style={{ marginTop: 16 }}>
        <span className="skel title" style={{ width: '35%' }} />
        {[0, 1, 2, 3].map((n) => (
          <div key={n} className="skel-row">
            <span className="skel icon" />
            <span className="skel line" />
            <span className="skel line" style={{ flex: '0 0 50px' }} />
          </div>
        ))}
      </section>
    </main>
  )
}

/** Rows of a list (pantry, shopping) while it loads. */
export function RowsSkeleton({ rows = 6 }) {
  return (
    <div className="skel-wrap" aria-busy="true">
      {Array.from({ length: rows }, (_, n) => (
        <div key={n} className="skel-row">
          <span className="skel icon" />
          <span className="skel line" style={{ maxWidth: `${50 + ((n * 13) % 40)}%` }} />
        </div>
      ))}
    </div>
  )
}
