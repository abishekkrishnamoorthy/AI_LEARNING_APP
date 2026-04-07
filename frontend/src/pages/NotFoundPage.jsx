import { Link } from 'react-router-dom'

function NotFoundPage() {
  return (
    <main className="app-shell page">
      <section className="card" aria-labelledby="notfound-title">
        <h1 id="notfound-title" className="page-title">404 - Page Not Found</h1>
        <p className="page-subtitle">The page you requested does not exist.</p>
        <Link className="inline-link" to="/">
          Back to Home
        </Link>
      </section>
    </main>
  )
}

export default NotFoundPage
