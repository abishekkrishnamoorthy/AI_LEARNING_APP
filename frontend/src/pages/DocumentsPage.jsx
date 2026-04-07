import HomeLayout from '../components/layout/HomeLayout'

function DocumentsPage() {
  return (
    <HomeLayout title="Documents" subtitle="Organize your notes and references.">
      <div className="dashboard-grid">
        <article className="feature-card">
          <h3>Notes</h3>
          <p>Personal notes and summaries will appear here.</p>
        </article>
        <article className="feature-card">
          <h3>Templates</h3>
          <p>Reusable templates for projects and revision plans.</p>
        </article>
      </div>
    </HomeLayout>
  )
}

export default DocumentsPage

