import HomeLayout from '../components/layout/HomeLayout'

function DashboardPage() {
  return (
    <HomeLayout title="Dashboard" subtitle="Track your learning progress in one place.">
      <div className="dashboard-grid">
        <article className="feature-card">
          <h3>Learning Hours</h3>
          <p>12h this week</p>
        </article>
        <article className="feature-card">
          <h3>Completed Modules</h3>
          <p>4 modules completed</p>
        </article>
        <article className="feature-card">
          <h3>Upcoming Tasks</h3>
          <p>Review notes and attempt practice challenge.</p>
        </article>
      </div>
    </HomeLayout>
  )
}

export default DashboardPage

