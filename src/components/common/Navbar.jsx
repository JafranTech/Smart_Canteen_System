// Navbar.jsx — Phase 2 implementation
// Stub: rendered by role-specific layouts in Phase 2+
export default function Navbar({ title, rightElement }) {
  return (
    <nav className="navbar-dark">
      <span className="text-white font-semibold text-base">{title}</span>
      {rightElement && <div>{rightElement}</div>}
    </nav>
  )
}
