import { Link } from 'react-router-dom'

function HomePage() {
  return (
    <main className="app-shell page">
      <section className="card" aria-labelledby="home-title">
        <h1 id="home-title" className="page-title">AI Learning Tool</h1>
        <p className="page-subtitle">Frontend bootstrap complete.</p>
        <Link className="btn btn-secondary" to="/register">
          Go to Register
        </Link>
      </section>
    </main>
  )
}

export default HomePage
