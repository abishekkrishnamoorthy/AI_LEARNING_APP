import HomeLayout from '../components/layout/HomeLayout'

function ContinuePage() {
  return (
    <HomeLayout title="Continue Learning" subtitle="Pick up where you left off.">
      <div className="dashboard-grid">
        <article className="feature-card">
          <h3>Last Lesson</h3>
          <p>Neural Networks Basics - 65% completed.</p>
        </article>
        <article className="feature-card">
          <h3>Next Step</h3>
          <p>Finish exercises and review key takeaways.</p>
        </article>
      </div>
    </HomeLayout>
  )
}

export default ContinuePage

